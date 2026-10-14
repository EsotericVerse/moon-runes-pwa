import {createSupabaseAdapter} from './supabase.mjs';
import {createBackupPublicAdapter} from './neon-public.mjs';

export function createConfiguredAdapter(){
  const primary=createSupabaseAdapter();
  const backup=createBackupPublicAdapter();
  return {
    ...primary,
    backupPublicClient:backup.publicClient,
    primarySourceLabel:'Admin-selected',
    backupSourceLabel:'Backup'
  };
}
