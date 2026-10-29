// One deployment-time config for database SOURCE routing only.
// No secrets, login grants, or database calls are stored here.
// The existing LOC deployment keeps its optional Neon mirror by default;
// NEXT_PUBLIC_LOC_BACKUP_ID='' explicitly runs with ONE database. No backup
// connection, health check or synchronization is required for normal operation.
export const DATABASE_ROUTING_CONFIG=Object.freeze({
  targets:Object.freeze({
    'supabase-current':Object.freeze({provider:'supabase',primaryControl:true}),
    'neon-current':Object.freeze({provider:'neon',primaryControl:false})
  }),
  // Optional fallback. An empty build setting disables it without code edits.
  blacklist:Object.freeze([]),
  primaryId:'supabase-current',
  backupId:(typeof process!=='undefined'&&process.env.NEXT_PUBLIC_LOC_BACKUP_ID!==undefined)
    ?(process.env.NEXT_PUBLIC_LOC_BACKUP_ID.trim()||null)
    :'neon-current',
  mode:'single'
});

export function resolveDatabaseRouting(config=DATABASE_ROUTING_CONFIG){
  const blocked=new Set(config.blacklist||[]);
  const primary=config.targets?.[config.primaryId];
  if(!primary||blocked.has(config.primaryId))throw new Error('Primary database route is missing or blacklisted');
  // The current browser transports use Supabase primary; Neon is optional read-only backup.
  // Reject unsupported routes rather than silently reading the wrong database.
  if(primary.provider!=='supabase'||primary.primaryControl!==true)
    throw new Error('Browser database routing requires Supabase as primary');
  const backupId=config.backupId&&!blocked.has(config.backupId)?config.backupId:null;
  const backup=backupId?config.targets?.[backupId]:null;
  if(backupId&&(!backup||backupId===config.primaryId||backup.provider!=='neon'))
    throw new Error('Database backup route is not supported');
  return Object.freeze({
    provider:primary.provider,
    primaryId:config.primaryId,
    backupId:backupId||null,
    backupProvider:backup?.provider||null,
    mode:config.mode==='db-managed'?'db-managed':'single',
    primaryControl:true,
    verified:true
  });
}
