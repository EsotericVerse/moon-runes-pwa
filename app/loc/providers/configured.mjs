import {createSupabaseAdapter} from './supabase.mjs';
import {createNeonPublicAdapter} from './neon-public.mjs';

export function createConfiguredAdapter(){
  const primary=createSupabaseAdapter();
  const backup=createNeonPublicAdapter();
  return {
    ...primary,
    backupPublicClient:backup.publicClient,
    primarySourceLabel:'Admin-selected',
    backupSourceLabel:'Neon'
  };
}
