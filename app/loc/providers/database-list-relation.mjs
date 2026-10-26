// Resolve each Scope Group's database connection list without a fixed table name.
const GROUP_ID=/^[a-z][a-z0-9]{0,14}$/;

export function scopedDatabaseListRelation(scopeGroup){
  const id=String(scopeGroup||'').trim().toLowerCase();
  if(!GROUP_ID.test(id))throw new Error('Invalid database Scope Group');
  return `silver.${id}_dblists`;
}
