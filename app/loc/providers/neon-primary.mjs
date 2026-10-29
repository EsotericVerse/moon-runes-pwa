import {PostgrestClient} from '@supabase/postgrest-js';
import {createBackupPublicAdapter} from './neon-public.mjs';

// A separate, user-selected PostgreSQL main provider. Do not route authentication,
// SQL, or RPC calls through Supabase. Database RLS remains the authoritative gate.
export function createNeonPrimaryAdapter({
  url=process.env.NEXT_PUBLIC_LOC_NEON_DATA_API_URL||'',
  authUrl=process.env.NEXT_PUBLIC_LOC_NEON_AUTH_URL||'',
  fetchImpl=globalThis.fetch,
  navigate=target=>window.location.assign(target)
}={}){
  // Reuse independent anonymous path: public reads must not need a user session.
  const publicClient=createBackupPublicAdapter({url,authUrl,fetchImpl}).publicClient;
  const api=String(url).replace(/\/+$/,'');
  const base=String(authUrl).replace(/\/+$/,'');
  if(!base.endsWith('/auth')||!api.endsWith('/rest/v1'))throw new Error('Neon Auth/Data API URL invalid');
  let token='',expires=0,tokenSessionId='';
  let tokenPending=null,pendingSessionId='';
  const listeners=new Set();
  let reportedUserId='';
  const emit=(event,session)=>{for(const cb of listeners)cb(event,session)};
  async function authRequest(path,{method='GET',payload=null}={}){
    const response=await fetchImpl(base+path,{
      method,credentials:'include',signal:AbortSignal.timeout(8000),
      headers:{accept:'application/json',...(payload?{'content-type':'application/json'}:{})},
      ...(payload?{body:JSON.stringify(payload)}:{})
    });
    if(!response.ok)throw new Error('Neon Auth '+path+' HTTP '+response.status);
    if(response.status===204)return null;
    const body=await response.text();
    if(!body)return null;
    try{return JSON.parse(body)}
    catch{throw new Error('Neon Auth returned an invalid JSON response')}
  }
  async function accessToken(sessionId=''){
    // A cached token is valid ONLY for the current cookie-backed Neon session.
    // Never let an old account's token survive an OAuth account switch.
    if(!sessionId){
      const response=await authRequest('/get-session');
      const current=response?.data||response;
      if(!current?.user?.id||!current?.session?.id)throw new Error('Neon login is required');
      sessionId=String(current.session.id);
    }
    if(tokenSessionId!==sessionId){token='';expires=0;tokenSessionId=sessionId;}
    if(token&&Date.now()<expires)return token;
    if(tokenPending&&pendingSessionId===sessionId)return tokenPending;
    pendingSessionId=sessionId;
    const request=authRequest('/token').then(result=>{
      const value=result?.token||result?.data?.token;
      if(typeof value!=='string'||value.split('.').length!==3)
        throw new Error('Neon Auth did not return an authenticated JWT');
      // A delayed response for a previous OAuth identity must never replace
      // the active session's token.
      if(tokenSessionId!==sessionId)throw new Error('Neon Auth session changed during token refresh');
      token=value;expires=Date.now()+3*60*1000;
      return value;
    });
    tokenPending=request;
    try{return await request}
    finally{
      if(tokenPending===request){tokenPending=null;pendingSessionId=''}
    }
  }
  async function session(){
    const response=await authRequest('/get-session');
    const result=response?.data||response;
    if(!result?.user?.id||!result?.session?.id){
      token='';expires=0;tokenSessionId='';
      return null;
    }
    const jwt=await accessToken(String(result.session.id));
    return {...result.session,user:result.user,access_token:jwt};
  }
  const auth={
    async getSession(){
      try{
        const current=await session();
        const userId=String(current?.user?.id||'');
        if(userId!==reportedUserId){
          reportedUserId=userId;
          emit(current?'SIGNED_IN':'SIGNED_OUT',current);
        }
        return {data:{session:current},error:null};
      }catch(error){
        // A transient network failure must not be misreported as logout.
        return {data:{session:null},error};
      }
    },
    async getUser(jwt){
      try{
        // Do not promote client-supplied email or unverified session state.
        const active=await session();
        if(!active||!jwt||jwt!==active.access_token)throw new Error('Neon identity token mismatch');
        const accountsResponse=await authRequest('/list-accounts');
        const accounts=Array.isArray(accountsResponse)?accountsResponse:
          Array.isArray(accountsResponse?.data)?accountsResponse.data:[];
        const google=accounts.find(account=>account?.providerId==='google'||account?.provider==='google');
        if(!google||active.user.emailVerified!==true)throw new Error('Google OAuth identity is not verified');
        const user={...active.user,identities:[{
          provider:'google',user_id:active.user.id,provider_id:String(google.accountId||google.id||''),
          identity_data:{email:active.user.email,email_verified:true}
        }]};
        return {data:{user},error:null};
      }catch(error){return {data:{user:null},error}}
    },
    async signInWithOAuth({provider,options={}}={}){
      try{
        if(provider!=='google')throw new Error('Only verified Google OAuth is supported');
        const callbackURL=String(options.redirectTo||'');
        if(!callbackURL||new URL(callbackURL).origin!==window.location.origin)
          throw new Error('OAuth callback must be on the current site');
        const response=await authRequest('/sign-in/social',{method:'POST',payload:{provider:'google',callbackURL,disableRedirect:true}});
        const destination=response?.url||response?.data?.url;
        if(!destination||new URL(destination).protocol!=='https:')
          throw new Error('Neon OAuth returned no valid redirect');
        navigate(destination);
        return {data:{url:destination},error:null};
      }catch(error){return {data:null,error}}
    },
    async signOut(){
      try{await authRequest('/sign-out',{method:'POST'});token='';expires=0;tokenSessionId='';reportedUserId='';emit('SIGNED_OUT',null);return {error:null}}
      catch(error){return {error}}
    },
    onAuthStateChange(callback){
      listeners.add(callback);
      // Supabase-compatible initial event: restore the navigation identity
      // after a refresh, including a refresh after the Neon OAuth callback.
      Promise.resolve().then(async()=>{
        const result=await auth.getSession();
        if(listeners.has(callback)&&!result.error)
          callback('INITIAL_SESSION',result.data.session);
      });
      return {data:{subscription:{unsubscribe:()=>listeners.delete(callback)}}};
    }
  };
  const authenticated=new PostgrestClient(api,{
    schema:'silver',
    fetch:async(input,init={})=>{
      const jwt=await accessToken();
      const headers=new Headers(init.headers);
      headers.set('authorization','Bearer '+jwt);
      const timeout=AbortSignal.timeout(8000);
      const signal=init.signal?AbortSignal.any([init.signal,timeout]):timeout;
      return fetchImpl(input,{...init,headers,signal});
    }
  });
  const authClient={
    schema:name=>authenticated.schema(name),
    rpc:(name,args={},options={})=>authenticated.schema(options.schema||'silver').rpc(name,args)
  };
  return {
    publicClient,authClient,auth,configuredPublicClient:publicClient,
    realtimeClient:null,backupPublicClient:null,
    primarySourceLabel:'Neon',backupSourceLabel:''
  };
}
