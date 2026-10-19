import {createSupabaseAdapter} from './supabase.mjs';
import {createBackupPublicAdapter} from './neon-public.mjs';

export function createConfiguredAdapter(){
  const primary=createSupabaseAdapter();
  // Backup is cold unless a read really falls back to the backup transport.
  // Keep the same synchronous PostgREST-like schema interface.
  let backupPublicClient=null;
  const backup={
    schema(name){
      backupPublicClient??=createBackupPublicAdapter().publicClient;
      return backupPublicClient.schema(name);
    }
  };
  return {
    ...primary,
    backupPublicClient:backup,
    primarySourceLabel:'Admin-selected',
    backupSourceLabel:'Backup'
  };
}
