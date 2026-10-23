'use client';

import {useCallback,useEffect,useSyncExternalStore} from 'react';
import {z} from 'zod';
import {getAccountSession,dbAuthEvents,dbAuthRelation,isCurrentEmailBlocklisted,signInWithGoogle,signOutAccount} from './db-client.mjs';
import {defaultScopeData,scopeDataFromManageRows} from './scope-data';

const EmailSchema=z.string().trim().toLowerCase().email();
const ManageRoleSchema=z.enum(['admin','scope']);

function normalizeAuthEmail(value){
  const parsed=EmailSchema.safeParse(String(value||'').trim().toLowerCase());
  return parsed.success?parsed.data:'';
}
function normalizeScopeId(value){
  return String(value||'').trim();
}
function normalizeManageRole(value){
  const parsed=ManageRoleSchema.safeParse(String(value||'').trim());
  return parsed.success?parsed.data:'';
}
function createScopeAuthorizer(user,permissionRows=[]){
  const email=normalizeAuthEmail(user?.email);
  const permissions=(Array.isArray(permissionRows)?permissionRows:[]).flatMap(row=>{
    const rowEmail=normalizeAuthEmail(row?.email);
    const role=normalizeManageRole(row?.role);
    const id=normalizeScopeId(row?.id);
    if(!email||rowEmail!==email||!role||!id)return [];
    return [{id,email:rowEmail,role}];
  });
  const admin=permissions.some(row=>row.role==='admin');
  const scopes=new Set(permissions.filter(row=>row.role==='scope').map(row=>row.id));
  return Object.freeze({
    email,
    role:admin?'admin':(scopes.size?'scope':''),
    scopeIds:Object.freeze([...scopes].sort()),
    canManageGlobalSync:()=>admin,
    canManageScopeSync:scopeId=>admin||scopes.has(normalizeScopeId(scopeId))
  });
}

// One shared query per identity level for the entire AppShell QueryClient.
// Public navigation observes Auth state without initiating a session or
// management query. Only protected views opt into management authorization. A permission result is UI state, never a substitute for
// Supabase RLS / RPC write authorization.
const SESSION_KEY=['loc-account','session'];
const MANAGEMENT_KEY=['loc-account','management'];
// A management workspace verifies once on entry. Never re-query on focus or
// stale-time expiry; explicit refresh and database write authorization remain.

const emptyState=Object.freeze({
  loading:true,user:null,email:'',role:'',authorizer:null,
  permissionLoading:true,error:'',scopes:[]
});
const signedOutState=Object.freeze({...emptyState,loading:false,permissionLoading:false});
const BLOCKLIST_MESSAGE='此帳號已列入系統黑名單，無法登入 LOC 管理功能。';

function failedState(error){
  return {...signedOutState,error:String(error?.message||error)};
}

async function loadSessionAccount(){
  try{
    const session=await getAccountSession();
    const user=session?.user||null;
    if(!user)return signedOutState;
    return {...signedOutState,user,email:normalizeAuthEmail(user.email)};
  }catch(error){
    return failedState(error);
  }
}

async function loadManagementAccount(){
  try{
    const session=await getAccountSession();
    const user=session?.user||null;
    if(!user){
      publishAccount('session',signedOutState);
      return signedOutState;
    }
    const email=normalizeAuthEmail(user.email);

    // A blocked account must not keep a cached session-only identity.
    if(await isCurrentEmailBlocklisted()){
      await signOutAccount();
      publishAccount('session',signedOutState);
      return failedState(BLOCKLIST_MESSAGE);
    }

    // The authorization source is silver.loc, not a cached or client-editable
    // claim. Its row-level policy remains the authority for database writes.
    let permissions=[];
    if(email){
      const {data,error}=await dbAuthRelation('silver.loc')
        .select('id,email:manage_email,role:manage_role,galaxy:galaxy_table,time:time_table,birthday')
        .eq('manage_email',email);
      if(error)throw new Error(error.message||'Management permission read failed');
      permissions=data||[];
    }
    const authorizer=createScopeAuthorizer(user,permissions);
    return {
      ...signedOutState,user,email:authorizer.email,
      role:authorizer.role,authorizer,scopes:scopeDataFromManageRows(permissions)
    };
  }catch(error){
    // Fail closed on authorization failures; never retain stale edit rights.
    return failedState(error);
  }
}


const listeners=new Set();
const requests=new Map();
const loaded={session:false,management:false};
const generation={session:0,management:0};
let sessionState=emptyState;
let managementState=emptyState;
function subscribeAccount(listener){
  listeners.add(listener);
  return ()=>listeners.delete(listener);
}
function publishAccount(kind,state){
  if(kind==='session')sessionState=state;
  else managementState=state;
  loaded[kind]=true;
  for(const listener of listeners)listener();
}
function invalidateAccount(kind){
  generation[kind]+=1;
  loaded[kind]=false;
  requests.delete(kind);
  publishAccount(kind,kind==='session'?signedOutState:emptyState);
  loaded[kind]=false;
}
function readAccount(kind,{fresh=false}={}){
  if(requests.has(kind))return requests.get(kind);
  if(!fresh&&loaded[kind])return Promise.resolve(kind==='session'?sessionState:managementState);
  const token=generation[kind];
  const request=Promise.resolve().then(kind==='session'?loadSessionAccount:loadManagementAccount)
    .then(result=>{
      if(generation[kind]===token)publishAccount(kind,result);
      return generation[kind]===token?result:signedOutState;
    }).finally(()=>{
      if(requests.get(kind)===request)requests.delete(kind);
    });
  requests.set(kind,request);
  return request;
}

export function useAccount({enabled=true,sessionOnly=false}={}){
  const kind=sessionOnly?'session':'management';
  const state=useSyncExternalStore(subscribeAccount,
    ()=>sessionOnly?sessionState:managementState,()=>emptyState);
  useEffect(()=>{
    if(enabled)void readAccount(kind);
  },[enabled,kind]);
  // Admin edit entry must always verify against live Supabase permissions.
  const refresh=useCallback(async()=>{
    const result=await readAccount(kind,{fresh:true});
    if(sessionOnly)return result.user||null;
    return result.user&&result.authorizer?{user:result.user,authorizer:result.authorizer}:null;
  },[kind,sessionOnly]);
  const signIn=useCallback(callbackURL=>signInWithGoogle(String(callbackURL||'').trim()),[]);
  const signOut=useCallback(async()=>{
    // Prevent a preceding in-flight permission read from restoring a signed-out identity.
    generation.session+=1;
    generation.management+=1;
    requests.clear();
    await signOutAccount();
    publishAccount('session',signedOutState);
    publishAccount('management',signedOutState);
  },[]);
  const canManageScopeSync=useCallback(
    scopeId=>normalizeScopeId(scopeId)==='local'||Boolean(state.authorizer?.canManageScopeSync(scopeId)),
    [state.authorizer]
  );
  const canManageGlobalSync=useCallback(
    ()=>Boolean(state.authorizer?.canManageGlobalSync()),[state.authorizer]
  );
  const scopeDataFor=useCallback(scopeId=>{
    const id=normalizeScopeId(scopeId);
    if(id==='local')return defaultScopeData('local');
    return state.scopes.find(scope=>scope.id===id)
      ||(state.authorizer?.canManageGlobalSync()?defaultScopeData(id):null);
  },[state.authorizer,state.scopes]);
  return {...state,refresh,signIn,signOut,canManageScopeSync,canManageGlobalSync,scopeDataFor};
}

export function usePassiveSessionAccount(){
  const account=useAccount({enabled:false,sessionOnly:true});
  useEffect(()=>{
    const listener=dbAuthEvents.onAuthStateChange((event,session)=>{
      const user=session?.user||null;
      const previous=sessionState.user;
      publishAccount('session',user
        ?{...signedOutState,user,email:normalizeAuthEmail(user.email)}
        :signedOutState);
      // Management permission is tied to identity. Never reuse across users.
      if(event==='SIGNED_OUT'||(previous?.id&&previous.id!==user?.id)){
        invalidateAccount('management');
      }
    });
    return ()=>listener.data.subscription.unsubscribe();
  },[]);
  return account;
}
