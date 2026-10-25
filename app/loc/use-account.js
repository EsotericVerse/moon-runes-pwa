'use client';

import {useCallback,useEffect} from 'react';
import {useSWRConfig} from 'swr';
import {getAccountSession,dbAuthEvents,dbAuthClient,signInWithGoogle,signOutAccount} from './db-client.mjs';
import {readAuthorization,setAuthorization,clearAuthorization,createScopeAuthorizer} from './authorization-runtime.mjs';
import {defaultScopeData,scopeDataFromManageRows} from './scope-data';
import {useAsyncResource} from './use-async-resource';

const normalizeAuthEmail=value=>String(value||'').trim().toLowerCase();
const normalizeScopeId=value=>String(value||'').trim().toLowerCase();

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
let authEmail='';

let scopeMetadata=[];

// Permission authority lives in ordinary JS memory, not in a React hook.
// No TTL, JSON parsing, file I/O or permission SQL on subsequent actions.
function cachedManagementAccount(){
  const saved=readAuthorization();
  if(!saved||!saved.userId||
    (authUserId&&saved.userId!==authUserId)||
    (authEmail&&saved.email!==authEmail))return null;
  const user={id:saved.userId,email:saved.email};
  const authorizer=createScopeAuthorizer(user);
  if(!authorizer)return null;
  return {...signedOutState,user,email:saved.email,
    role:authorizer.role,authorizer,scopes:scopeMetadata};
}

async function loadManagementAccount(mutate){
  const cached=cachedManagementAccount();
  if(cached)return cached;
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
    // Exactly one authenticated RPC on first access. The database RPC already
    // includes the blacklist predicate; a second blacklist query is redundant.
    const {data,error}=await dbAuthClient.schema('silver').rpc('get_my_scope_management');
    if(error)throw new Error(error.message||'Management permission read failed');
    if(obsolete())return signedOutState;
    const permissions=Array.isArray(data)?data:[];
    const metadata=scopeDataFromManageRows(permissions);
    setAuthorization(user,permissions);
    scopeMetadata=metadata;
    authUserId=String(user.id);
    authEmail=normalizeAuthEmail(user.email);
    return cachedManagementAccount()||signedOutState;
  }catch(error){
    // An older request must not erase a newer account's verified grants.
    if(obsolete())return signedOutState;
    clearAuthorization();
    scopeMetadata=[];
    return failedState(error);
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
    revalidateOnFocus:false,
    revalidateOnReconnect:false,
    revalidateIfStale:false,
    ...(passive?{fallbackData:signedOutState}:{}),
  });
  const state=query.data||emptyState;

  // An explicit action checks current JS variables on every click. Only a
  // missing/invalidated snapshot loads one server-verified permission set.
  const refresh=useCallback(async()=>{
    if(!sessionOnly){
      const cached=cachedManagementAccount();
      if(cached)return {user:cached.user,authorizer:cached.authorizer};
    }
    const result=await mutate(queryKey,()=>queryFn(),{revalidate:false});
    if(sessionOnly)return result?.user||null;
    return result?.user&&result.authorizer?{user:result.user,authorizer:result.authorizer}:null;
  },[mutate,queryKey,queryFn,sessionOnly]);

  const signIn=useCallback(callbackURL=>signInWithGoogle(String(callbackURL||'').trim()),[]);
  const signOut=useCallback(async()=>{
    await signOutAccount();
    authRevision+=1;
    authUserId='';
    authEmail='';
    clearAuthorization();
    scopeMetadata=[];
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
  const canManageGroupSync=useCallback(
    groupId=>Boolean(state.authorizer?.canManageGroupSync(groupId)),
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
    canManageScopeSync,canManageGroupSync,canManageGlobalSync,scopeDataFor
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
      const nextEmail=normalizeAuthEmail(user?.email);
      const identityChanged=authUserId!==nextUserId||authEmail!==nextEmail;
      if(identityChanged||event==='SIGNED_OUT'){
        authRevision+=1;
        clearAuthorization();
        scopeMetadata=[];
      }
      authUserId=nextUserId;
      authEmail=nextEmail;
      // Passive navigation needs only a session ID hint, never an OAuth email.
      // Google provider email is displayed only after Auth.getUser() verifies it.
      void mutate(SESSION_KEY,nextUserId
        ?{...signedOutState,user:{id:nextUserId}}
        :signedOutState,{revalidate:false});
      if(identityChanged||event==='SIGNED_OUT'){
        // Never put the unverified SDK event user into the verified OAuth cache.
        void mutate(VERIFIED_SESSION_KEY,undefined,{revalidate:Boolean(user)});
      }
      if(identityChanged||event==='SIGNED_OUT'){
        // Clear the old role without launching a permission query from React.
        void mutate(MANAGEMENT_KEY,undefined,{revalidate:false});
      }
    });
    return ()=>listener.data.subscription.unsubscribe();
  },[mutate]);
  return account;
}
