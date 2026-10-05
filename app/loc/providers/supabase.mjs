import {createClient} from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL='https://qlouywsdiiyiyzpoxyqy.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY='sb_publishable_qPn0vAzozVyXKllRuEKf2Q_fvG-pLVV';

export function createSupabaseAdapter({
  url=process.env.NEXT_PUBLIC_SUPABASE_URL||DEFAULT_SUPABASE_URL,
  publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  createClientImpl=createClient
}={}){
  if(!url||!publishableKey)throw new Error('Supabase requires a project URL and publishable key');
  const publicClient=createClientImpl(url,publishableKey,{
    db:{schema:'silver'},
    auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}
  });
  const authClient=createClientImpl(url,publishableKey,{
    db:{schema:'silver'},
    auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
  });
  return {publicClient,authClient,auth:authClient.auth};
}
