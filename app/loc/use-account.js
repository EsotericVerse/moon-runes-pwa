'use client';

import {useCallback,useEffect} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {z} from 'zod';
import {getAccountSession,dbAuthClient,dbAuthRelation,isCurrentEmailBlocklisted,signInWithGoogle,signOutAccount} from './db-client.mjs';
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
const ACCOUNT_CACHE_MS=Infinity;
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

async function loadManagementAccount(queryClient){
  try{
    const session=await getAccountSession();
    const user=session?.user||null;
    if(!user){
      queryClient.setQueryData(SESSION_KEY,signedOutState);
      return signedOutState;
    }
    const email=normalizeAuthEmail(user.email);

    // A blocked account must not keep a cached session-only identity.
    if(await isCurrentEmailBlocklisted()){
      await signOutAccount();
      queryClient.setQueryData(SESSION_KEY,signedOutState);
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

export function useAccount({enabled=true,sessionOnly=false}={}){
  const queryClient=useQueryClient();
  const queryKey=sessionOnly?SESSION_KEY:MANAGEMENT_KEY;
  const queryFn=useCallback(
    ()=>sessionOnly?loadSessionAccount():loadManagementAccount(queryClient),
    [sessionOnly,queryClient]
  );
  const query=useQuery({
    queryKey,queryFn,enabled,
    staleTime:ACCOUNT_CACHE_MS,
    refetchOnWindowFocus:false,
    refetchOnReconnect:false,
    retry:false
  });
  const state=query.data||emptyState;

  // Explicit entry into edit mode always performs a fresh authorization
  // check, even when another view has populated the shared query cache.
  const refresh=useCallback(async()=>{
    const result=await queryClient.fetchQuery({
      queryKey,queryFn,staleTime:0,retry:false
    });
    if(sessionOnly)return result.user||null;
    return result.user&&result.authorizer?{user:result.user,authorizer:result.authorizer}:null;
  },[queryClient,queryKey,queryFn,sessionOnly]);

  const signIn=useCallback(callbackURL=>signInWithGoogle(String(callbackURL||'').trim()),[]);
  const signOut=useCallback(async()=>{
    await signOutAccount();
    await queryClient.cancelQueries({queryKey:['loc-account']});
    queryClient.setQueryData(SESSION_KEY,signedOutState);
    queryClient.setQueryData(MANAGEMENT_KEY,signedOutState);
  },[queryClient]);

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
  const queryClient=useQueryClient();
  useEffect(()=>{
    const listener=dbAuthClient.auth.onAuthStateChange((event,session)=>{
      const previous=queryClient.getQueryData(SESSION_KEY);
      const user=session?.user||null;
      queryClient.setQueryData(SESSION_KEY,user
        ?{...signedOutState,user,email:normalizeAuthEmail(user.email)}
        :signedOutState);
      if(event==='SIGNED_OUT'||(previous?.user?.id&&previous.user.id!==user?.id)){
        queryClient.removeQueries({queryKey:MANAGEMENT_KEY,exact:true});
      }
    });
    return ()=>listener.data.subscription.unsubscribe();
  },[queryClient]);
  return account;
}
