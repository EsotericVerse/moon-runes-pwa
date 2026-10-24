import {createClient} from '@supabase/supabase-js';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://qlouywsdiiyiyzpoxyqy.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_qPn0vAzozVyXKllRuEKf2Q_fvG-pLVV';

// Only anonymous/public SQL-backed numeric summaries use this server client.
// Public Blocks, registry/config and site metadata are build-produced assets.
export function createPublicSupabaseClient(){
  return createClient(SUPABASE_URL,SUPABASE_KEY,{
    db:{schema:'silver'},
    auth:{persistSession:false,autoRefreshToken:false}
  });
}

export function validScopeId(value){
  return /^[a-z][a-z0-9]{0,14}$/.test(String(value||''));
}
