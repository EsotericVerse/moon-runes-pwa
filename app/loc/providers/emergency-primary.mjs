// Device-controlled emergency route is intentionally independent of both databases.
// A human-initiated switch reloads the app so every adapter uses the same provider.
export const EMERGENCY_PRIMARY_KEY='loc.emergency-primary.v1';
export function preferredDatabasePrimary(storage=typeof window!=='undefined'?window.localStorage:null){
  try{return storage?.getItem(EMERGENCY_PRIMARY_KEY)==='neon-current'?'neon-current':'supabase-current'}
  catch{return 'supabase-current'}
}
export function setEmergencyDatabasePrimary(id,storage=typeof window!=='undefined'?window.localStorage:null){
  if(!storage)throw new Error('Local database route storage unavailable');
  if(id!=='supabase-current'&&id!=='neon-current')throw new Error('Unsupported database route');
  if(id==='neon-current'&&!(process.env.NEXT_PUBLIC_LOC_NEON_DATA_API_URL&&process.env.NEXT_PUBLIC_LOC_NEON_AUTH_URL))
    throw new Error('Neon is not configured on this installation');
  if(id==='supabase-current')storage.removeItem(EMERGENCY_PRIMARY_KEY);
  else storage.setItem(EMERGENCY_PRIMARY_KEY,id);
}
