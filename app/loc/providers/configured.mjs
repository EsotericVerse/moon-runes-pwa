import {createSupabaseAdapter} from './supabase.mjs';
import {createPostgrestAdapter} from './postgrest.mjs';
import {createNeonPublicAdapter} from './neon-public.mjs';

export function createConfiguredAdapter(){
  const provider=process.env.NEXT_PUBLIC_LOC_DB_PROVIDER||'supabase';
  if(provider==='supabase'){
    const primary=createSupabaseAdapter();
    const backup=createNeonPublicAdapter();
    return {
      ...primary,
      backupPublicClient:backup.publicClient,
      primarySourceLabel:'Supabase',
      backupSourceLabel:'Neon'
    };
  }
  if(provider==='postgrest')return createPostgrestAdapter({
    url:process.env.NEXT_PUBLIC_LOC_DATA_API_URL,
    auth:null
  });
  throw new Error('Unsupported database adapter: '+provider);
}
