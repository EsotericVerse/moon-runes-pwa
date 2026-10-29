import {PostgrestClient} from '@supabase/postgrest-js';

// Neon backup must never route through Supabase (including its Edge Functions).
// Anonymous JWTs are issued by Neon Auth and checked by Neon Data API / PostgreSQL RLS.
export function createBackupPublicAdapter({
  url=process.env.NEXT_PUBLIC_LOC_NEON_DATA_API_URL||'',
  authUrl=process.env.NEXT_PUBLIC_LOC_NEON_AUTH_URL||'',
  fetchImpl=globalThis.fetch
}={}){
  const api=String(url).trim().replace(/\/+$/,'');
  const auth=String(authUrl).trim().replace(/\/+$/,'');
  if(!api||!auth)throw new Error('Neon backup requires its independent Data API and Auth URLs');
  for(const endpoint of [api,auth]){
    const parsed=new URL(endpoint);
    if(parsed.protocol!=='https:'||parsed.username||parsed.password)
      throw new Error('Neon backup endpoints must be HTTPS URLs without credentials');
  }
  if(!api.endsWith('/rest/v1')||!auth.endsWith('/auth'))
    throw new Error('Invalid Neon Data API or Auth endpoint');
  let cached=null,expires=0,pending=null;
  async function anonymousToken(){
    if(cached&&Date.now()<expires)return cached;
    if(!pending)pending=(async()=>{
      const response=await fetchImpl(auth+'/token/anonymous',{headers:{accept:'application/json'}});
      if(!response.ok)throw new Error('Neon anonymous authentication unavailable (HTTP '+response.status+')');
      const result=await response.json();
      const token=result?.token||result?.data?.token||result?.access_token;
      if(typeof token!=='string'||token.split('.').length!==3)
        throw new Error('Neon anonymous authentication returned no JWT');
      cached=token;
      expires=Date.now()+4*60*1000;
      return token;
    })().finally(()=>{pending=null});
    return pending;
  }
  const publicClient=new PostgrestClient(api,{
    schema:'silver',
    fetch:async(input,init={})=>{
      const jwt=await anonymousToken();
      const headers=new Headers(init.headers);
      headers.set('authorization','Bearer '+jwt);
      const response=await fetchImpl(input,{...init,headers});
      if(response.status===401){cached=null;expires=0;}
      return response;
    }
  });
  return {publicClient};
}
