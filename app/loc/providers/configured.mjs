import {createSupabaseAdapter} from './supabase.mjs';
import {createBackupPublicAdapter} from './neon-public.mjs';
import {resolveDatabaseRouting} from './routing-config.mjs';

export function createConfiguredAdapter(){
  const primary=createSupabaseAdapter();
  const routing=resolveDatabaseRouting();
  // A missing backup must not instantiate a client or affect primary reads.
  // Keep the same synchronous PostgREST-like schema interface.
  let backupPublicClient=null;
  const backup=routing.backupId?{
    schema(name){
      backupPublicClient??=createBackupPublicAdapter().publicClient;
      return backupPublicClient.schema(name);
    }
  }:null;
  return {
    ...primary,
    backupPublicClient:backup,
    primarySourceLabel:'Supabase',
    backupSourceLabel:backup?'Neon':''
  };
}
