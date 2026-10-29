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
  let token='',expires=0;
  const listeners=new Set();
  const emit=(event,session)=>{for(const cb of listeners)cb(event,session)};
  async function authRequest(path,{method='GET',payload=null}={}){
    const response=await fetchImpl(base+path,{
      method,credentials:'include',
      headers:{accept:'application/json',...(payload?{'content-type':'application/json'}:{})},
      ...(payload?{body:JSON.stringify(payload)}:{})
    });
    if(!response.ok)throw new Error('Neon Auth '+path+' HTTP '+response.status);
    return response.json();
  }
  async function accessToken(){
    if(token&&Date.now()<expires)return token;
    const result=await authRequest('/token');
    const value=result?.token||result?.data?.token;
    if(typeof value!=='string'||value.split('.').length!==3)
      throw new Error('Neon Auth did not return an authenticated JWT');
    token=value;expires=Date.now()+3*60*1000;
    return value;
  }
  async function session(){
    const response=await authRequest('/get-session');
    const result=response?.data||response;
    if(!result?.user?.id||!result?.session)return null;
    const jwt=await accessToken();
    return {...result.session,user:result.user,access_token:jwt};
  }
  const auth={
    async getSession(){
      try{return {data:{session:await session()},error:null}}
      catch(error){return {data:{session:null},error}}
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
        const response=await authRequest('/sign-in/social',{method:'POST',payload:{provider:'google',callbackURL}});
        const destination=response?.url||response?.data?.url;
        if(!destination||new URL(destination).protocol!=='https:')
          throw new Error('Neon OAuth returned no valid redirect');
        navigate(destination);
        return {data:{url:destination},error:null};
      }catch(error){return {data:null,error}}
    },
    async signOut(){
      try{await authRequest('/sign-out',{method:'POST'});token='';expires=0;emit('SIGNED_OUT',null);return {error:null}}
      catch(error){return {error}}
    },
    onAuthStateChange(callback){
      listeners.add(callback);
      return {data:{subscription:{unsubscribe:()=>listeners.delete(callback)}}};
    }
  };
  const authenticated=new PostgrestClient(api,{
    schema:'silver',
    fetch:async(input,init={})=>{
      const jwt=await accessToken();
      const headers=new Headers(init.headers);
      headers.set('authorization','Bearer '+jwt);
      return fetchImpl(input,{...init,headers});
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
