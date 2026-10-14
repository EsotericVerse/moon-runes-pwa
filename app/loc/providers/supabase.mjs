import {createClient} from '@supabase/supabase-js';
import {createKyselyEdgeClient} from './kysely-edge.mjs';

const DEFAULT_SUPABASE_URL='https://qlouywsdiiyiyzpoxyqy.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY='sb_publishable_qPn0vAzozVyXKllRuEKf2Q_fvG-pLVV';

export function createSupabaseAdapter({
  url=process.env.NEXT_PUBLIC_SUPABASE_URL||DEFAULT_SUPABASE_URL,
  publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  createClientImpl=createClient,
  fetchImpl=globalThis.fetch,
  target='configured'
}={}){
  if(!url||!publishableKey)throw new Error('Supabase requires a project URL and publishable key');
  const authClient=createClientImpl(url,publishableKey,{
    db:{schema:'silver'},
    auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
  });
  // Supabase Auth retains its supported SDK/session behavior. All LOC database
  // requests go through the trusted Kysely Edge handler under caller claims.
  const dataPublicClient=createKyselyEdgeClient({url,publishableKey,role:'anon',target,fetch:fetchImpl});
  const dataAuthClient=createKyselyEdgeClient({url,publishableKey,auth:authClient.auth,target,fetch:fetchImpl});
  return {publicClient:dataPublicClient,authClient:dataAuthClient,auth:authClient.auth};
}
