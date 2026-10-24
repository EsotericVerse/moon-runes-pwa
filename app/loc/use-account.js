'use client';

import {useCallback,useEffect} from 'react';
import {useSWRConfig} from 'swr';
import {z} from 'zod';
import {getAccountSession,dbAuthEvents,dbAuthClient,isCurrentEmailBlocklisted,signInWithGoogle,signOutAccount} from './db-client.mjs';
import {defaultScopeData,scopeDataFromManageRows} from './scope-data';
import {useAsyncResource} from './use-async-resource';

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

// One shared resource per identity level for the current browser runtime.
// Public navigation observes Auth state without initiating a session or
// management query. Only protected views opt into management authorization. A permission result is UI state, never a substitute for
// Supabase RLS / RPC write authorization.
const SESSION_KEY=['loc-account','session'];
const VERIFIED_SESSION_KEY=['loc-account','verified-google-oauth'];
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
    return {...signedOutState,user,email:session.oauth.email,oauth:session.oauth};
  }catch(error){
    return failedState(error);
  }
}

let authRevision=0;
let authUserId='';

async function loadManagementAccount(mutate){
  const startedAt=authRevision;
  const obsolete=()=>startedAt!==authRevision;
  try{
    const session=await getAccountSession();
    const user=session?.user||null;
    if(obsolete())return signedOutState;
    if(!user){
      void mutate(SESSION_KEY,signedOutState,{revalidate:false});
      return signedOutState;
    }
    const email=normalizeAuthEmail(user.email);

    // A blocked account must not keep a cached session-only identity.
    const blocked=await isCurrentEmailBlocklisted();
    if(obsolete())return signedOutState;
    if(blocked){
      await signOutAccount();
      authRevision+=1;
      authUserId='';
      void mutate(SESSION_KEY,signedOutState,{revalidate:false});
      return failedState(BLOCKLIST_MESSAGE);
    }

    // The authorization source is silver.loc, not a cached or client-editable
    // claim. Its row-level policy remains the authority for database writes.
    let permissions=[];
    if(email){
      // Resolve only this caller's management rows through a protected RPC.
      // The registry email column is never a public browser SELECT.
      const {data,error}=await dbAuthClient.schema('silver').rpc('get_my_scope_management');
      if(error)throw new Error(error.message||'Management permission read failed');
      permissions=data||[];
    }
    if(obsolete())return signedOutState;
    const authorizer=createScopeAuthorizer(user,permissions);
    return {
      ...signedOutState,user,email:authorizer.email,
      role:authorizer.role,authorizer,scopes:scopeDataFromManageRows(permissions)
    };
  }catch(error){
    // Fail closed on authorization failures; never retain stale edit rights.
    return obsolete()?signedOutState:failedState(error);
  }
}

export function useAccount({enabled=true,sessionOnly=false}={}){
  const {mutate}=useSWRConfig();
  const queryKey=sessionOnly?(enabled?VERIFIED_SESSION_KEY:SESSION_KEY):MANAGEMENT_KEY;
  const queryFn=useCallback(
    ()=>sessionOnly?loadSessionAccount():loadManagementAccount(mutate),
    [sessionOnly,mutate]
  );
  // Passive identity must subscribe to auth-event cache updates without making
  // a session/network request. A null SWR key unsubscribes and leaves Settings
  // permanently stuck in emptyState.loading=true.
  const passive=sessionOnly&&!enabled;
  const query=useAsyncResource(queryKey,passive?null:queryFn,{
    enabled:enabled||passive,
    revalidateOnMount:enabled&&!sessionOnly,
    ...(passive?{fallbackData:signedOutState}:{}),
  });
  const state=query.data||emptyState;

  // Explicit entry into edit mode always performs a fresh authorization
  // check, even when another view has populated the shared query cache.
  const refresh=useCallback(async()=>{
    const result=await mutate(queryKey,()=>queryFn(),{revalidate:false});
    if(sessionOnly)return result.user||null;
    return result.user&&result.authorizer?{user:result.user,authorizer:result.authorizer}:null;
  },[mutate,queryKey,queryFn,sessionOnly]);

  const signIn=useCallback(callbackURL=>signInWithGoogle(String(callbackURL||'').trim()),[]);
  const signOut=useCallback(async()=>{
    await signOutAccount();
    authRevision+=1;
    authUserId='';
    await Promise.all([
      mutate(SESSION_KEY,signedOutState,{revalidate:false}),
      mutate(VERIFIED_SESSION_KEY,signedOutState,{revalidate:false}),
      mutate(MANAGEMENT_KEY,signedOutState,{revalidate:false})
    ]);
  },[mutate]);

  // The hidden local Scope is device-only and has no cloud management row.
  const canManageScopeSync=useCallback(
    scopeId=>normalizeScopeId(scopeId)==='local'||Boolean(state.authorizer?.canManageScopeSync(scopeId)),
    [state.authorizer]
  );
  const canManageGlobalSync=useCallback(
    ()=>Boolean(state.authorizer?.canManageGlobalSync()),
    [state.authorizer]
  );
  const scopeDataFor=useCallback(scopeId=>{
    const id=normalizeScopeId(scopeId);
    if(id==='local')return defaultScopeData('local');
    return state.scopes.find(scope=>scope.id===id)
      ||(state.authorizer?.canManageGlobalSync()?defaultScopeData(id):null);
  },[state.authorizer,state.scopes]);

  return {
    ...state,refresh,signIn,signOut,
    canManageScopeSync,canManageGlobalSync,scopeDataFor
  };
}

// Listen to the SDK's existing Auth event stream. Public pages never call
// getSession() or query silver.loc just to resolve navigation/UI state.
// OAuth and management entries still use the explicit authorization path.
export function usePassiveSessionAccount(){
  const account=useAccount({enabled:false,sessionOnly:true});
  const {mutate}=useSWRConfig();
  useEffect(()=>{
    const listener=dbAuthEvents.onAuthStateChange((event,session)=>{
      const user=session?.user||null;
      const nextUserId=String(user?.id||'');
      const identityChanged=authUserId!==nextUserId;
      if(identityChanged||event==='SIGNED_OUT')authRevision+=1;
      authUserId=nextUserId;
      void mutate(SESSION_KEY,user
        ?{...signedOutState,user,email:normalizeAuthEmail(user.email)}
        :signedOutState,{revalidate:false});
      if(identityChanged||event==='SIGNED_OUT'||event==='SIGNED_IN'){
        // Never put the unverified SDK event user into the verified OAuth cache.
        void mutate(VERIFIED_SESSION_KEY,undefined,{revalidate:Boolean(user)});
      }
      if(identityChanged||event==='SIGNED_OUT'){
        void mutate(MANAGEMENT_KEY,signedOutState,{revalidate:Boolean(user)});
      }
    });
    return ()=>listener.data.subscription.unsubscribe();
  },[mutate]);
  return account;
}
