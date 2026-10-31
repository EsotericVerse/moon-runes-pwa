// A database provider independent runtime for LOC's static site.
// Only the LOC Gateway URL enters browser code. Supabase/Neon endpoints,
// credentials and active primary belong exclusively to the trusted Gateway.
import {PostgrestClient} from '@supabase/postgrest-js';
import {createClerkAccountAdapter} from '../auth/clerk-browser.mjs';

export function createClerkGatewayAdapter({gatewayUrl=
  process.env.NEXT_PUBLIC_LOC_SQL_GATEWAY_URL||'',
  authorityUrl=process.env.NEXT_PUBLIC_LOC_CONTROL_URL||'',
  fetchImpl=globalThis.fetch}={}){
  if(!gatewayUrl||!authorityUrl)
    throw new Error('Independent LOC Gateway and Authority origins must be configured');
  const gateway=new URL(gatewayUrl);
  if(gateway.protocol!=='https:'||gateway.username||gateway.password||gateway.search||
    gateway.hash||!['','/'].includes(gateway.pathname))
    throw new Error('Invalid independent Gateway origin');
  const {auth,getAccessToken}=createClerkAccountAdapter({authorityOrigin:authorityUrl,fetchImpl});
  const api=gateway.origin+'/rest/v1';
  // The independent Gateway authenticates and routes; never instantiate the
  // Supabase/Neon Auth clients, even if it selects either database as primary.
  const publicClient=new PostgrestClient(api,{schema:'silver',fetch:fetchImpl});
  const privateClient=new PostgrestClient(api,{schema:'silver',fetch:async(input,init={})=>{
    const token=await getAccessToken();
    const headers=new Headers(init.headers);
    headers.set('authorization','Bearer '+token);
    return fetchImpl(input,{...init,headers,credentials:'omit'});
  }});
  return {
    publicClient,
    authClient:{
      schema:name=>privateClient.schema(name),
      rpc:(name,args={},options={})=>privateClient.schema(options.schema||'silver').rpc(name,args),
      auth
    },
    auth,
    configuredPublicClient:publicClient,
    backupPublicClient:null,
    realtimeClient:null,
    primarySourceLabel:'LOC Gateway',
    backupSourceLabel:''
  };
}
