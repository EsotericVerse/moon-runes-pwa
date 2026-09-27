'use client';

import {selectNeonCatalog} from './neon-repository';

const SCOPE_ID_PATTERN=/^[a-z][a-z0-9]*$/;

export async function selectManagedScopes(){
  const {rows}=await selectNeonCatalog('silver.manage',{
    columns:'id,role',
    orders:[{column:'id',ascending:true}]
  });
  return rows
    .map(row=>({id:String(row.id||'').trim(),role:String(row.role||'').trim()}))
    .filter(row=>SCOPE_ID_PATTERN.test(row.id));
}

export async function selectManagedScopeIds(){
  return (await selectManagedScopes()).map(row=>row.id);
}

export function scopeDataTable(scopeId,suffix){
  const id=String(scopeId||'').trim();
  const tail=String(suffix||'').trim();
  if(!SCOPE_ID_PATTERN.test(id))throw new Error('Scope ID 無效');
  if(!/^[a-z][a-z0-9_]*$/.test(tail))throw new Error('Scope table suffix 無效');
  return `silver.${id}_${tail}`;
}
