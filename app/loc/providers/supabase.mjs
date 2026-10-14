import {createClient} from '@supabase/supabase-js';
import {createKyselyEdgeClient} from './kysely-edge.mjs';

const DEFAULT_SUPABASE_URL='https://qlouywsdiiyiyzpoxyqy.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY='sb_publishable_qPn0vAzozVyXKllRuEKf2Q_fvG-pLVV';

// The primary Supabase must NEVER consume one direct PostgreSQL connection
// per browser read. Supabase's managed Data API gives us the same PostgREST
// query shape and RLS without exhausting the database's direct connection slots.
// Custom database target management still uses trusted Kysely Edge RPC.
const EDGE_ONLY_ADMIN_RPCS=new Set(['save_database_target','set_database_target']);

export function createSupabaseAdapter({
  url=process.env.NEXT_PUBLIC_SUPABASE_URL||DEFAULT_SUPABASE_URL,
  publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  createClientImpl=createClient,
  fetchImpl=globalThis.fetch,
  target='configured'
}={}){
  if(!url||!publishableKey)throw new Error('Supabase requires a project URL and publishable key');
  const authenticatedSdk=createClientImpl(url,publishableKey,{
    db:{schema:'silver'},
    global:{fetch:fetchImpl},
    auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
  });
  const publicSdk=createClientImpl(url,publishableKey,{
    db:{schema:'silver'},
    global:{fetch:fetchImpl},
    auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false,storageKey:'loc-primary-public'}
  });
  const edgeAdmin=createKyselyEdgeClient({url,publishableKey,auth:authenticatedSdk.auth,target,fetch:fetchImpl});
  const edgePublic=createKyselyEdgeClient({url,publishableKey,role:'anon',target,fetch:fetchImpl});
  // Explicit non-primary targets retain the portable Kysely transport.
  if(target!=='configured'&&target!=='supabase'){
    return {publicClient:edgePublic,authClient:edgeAdmin,auth:authenticatedSdk.auth};
  }
  function authenticatedDatabase(schema){
    const db=authenticatedSdk.schema(schema);
    return {
      from(table){return db.from(table)},
      rpc(name,args={},options={}){
        if(schema==='silver'&&EDGE_ONLY_ADMIN_RPCS.has(name))
          return edgeAdmin.schema(schema).rpc(name,args);
        return db.rpc(name,args,options);
      }
    };
  }
  const authClient={
    schema:authenticatedDatabase,
    rpc(name,args={},options={}){
      const schema=options.schema||'silver';
      return authenticatedDatabase(schema).rpc(name,args,options);
    },
    auth:authenticatedSdk.auth
  };
  return {publicClient:publicSdk,configuredPublicClient:edgePublic,authClient,auth:authenticatedSdk.auth};
}
