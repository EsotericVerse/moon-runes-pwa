import {preferredDatabasePrimary} from './emergency-primary.mjs';
import {DATABASE_ROUTING_CONFIG,resolveDatabaseRouting} from './routing-config.mjs';
// Both adapter construction and read/write routing use the same local decision.
// Never query Supabase to discover which database to use after a failure.
export function runtimeDatabaseRouting(){
  const selected=preferredDatabasePrimary();
  if(selected==='neon-current'&&!(process.env.NEXT_PUBLIC_LOC_NEON_AUTH_URL&&process.env.NEXT_PUBLIC_LOC_NEON_DATA_API_URL))
    throw new Error('Neon emergency route selected but endpoints are missing');
  return resolveDatabaseRouting({
    ...DATABASE_ROUTING_CONFIG,
    primaryId:selected,
    backupId:selected==='neon-current'?null:DATABASE_ROUTING_CONFIG.backupId
  });
}
const route=runtimeDatabaseRouting();
export async function selectedDatabaseRouting(){return route;}
