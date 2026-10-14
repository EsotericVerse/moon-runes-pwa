import {createSupabaseAdapter} from './supabase.mjs';
import {createNeonPublicAdapter} from './neon-public.mjs';

export function createConfiguredAdapter(){
  const provider=process.env.NEXT_PUBLIC_LOC_DB_PROVIDER||'supabase';
  if(provider!=='supabase')throw new Error('Unsupported database adapter: '+provider);
  const primary=createSupabaseAdapter();
  const backup=createNeonPublicAdapter();
  return {
    ...primary,
    backupPublicClient:backup.publicClient,
    primarySourceLabel:'Supabase',
    backupSourceLabel:'Neon'
  };
}
