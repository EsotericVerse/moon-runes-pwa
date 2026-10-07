import {PostgrestClient} from '@supabase/postgrest-js';

// Generic PostgREST adapter for PostgreSQL-compatible gateways.
export function createPostgrestAdapter({url,auth,getPublicToken=async()=>'',getAuthToken,headers={},fetch:fetchImpl=globalThis.fetch}={}){
  if(!url)throw new Error('PostgREST adapter requires a data API URL');
  const unavailable=async()=>{throw new Error('Authenticated database adapter is not configured');};
  const authBoundary=auth||{getSession:unavailable,signInWithOtp:unavailable,signOut:unavailable};
  function client(getToken){
    return new PostgrestClient(String(url).replace(/\/+$/,''),{
      schema:'api',headers,
      fetch:async(input,init={})=>{
        const token=await getToken();
        const requestHeaders=new Headers(init.headers);
        if(token)requestHeaders.set('Authorization','Bearer '+token);
        return fetchImpl(input,{...init,headers:requestHeaders});
      }
    });
  }
  return {publicClient:client(getPublicToken),authClient:client(getAuthToken||unavailable),auth:authBoundary};
}
