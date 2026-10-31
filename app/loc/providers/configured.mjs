import {createSupabaseAdapter} from './supabase.mjs';
import {createBackupPublicAdapter} from './neon-public.mjs';
import {runtimeDatabaseRouting} from './routing-state.mjs';
import {createNeonPrimaryAdapter} from './neon-primary.mjs';
import {createClerkGatewayAdapter} from './clerk-gateway.mjs';

export function createConfiguredAdapter(){
  // Opt-in only: legacy production login remains unchanged until Authority,
  // Neon JWT/RLS and the full Gateway have passed live write validation.
  if(process.env.NEXT_PUBLIC_LOC_IDENTITY_PROVIDER==='clerk')
    return createClerkGatewayAdapter();
  const routing=runtimeDatabaseRouting();
  if(routing.provider==='neon')return createNeonPrimaryAdapter();
  const primary=createSupabaseAdapter();
  // A missing backup must not instantiate a client or affect primary reads.
  // Keep the same synchronous PostgREST-like schema interface.
  let backupPublicClient=null;
  const neonConfigured=Boolean(process.env.NEXT_PUBLIC_LOC_NEON_DATA_API_URL&&process.env.NEXT_PUBLIC_LOC_NEON_AUTH_URL);
  const backup=routing.backupId&&neonConfigured?{
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
