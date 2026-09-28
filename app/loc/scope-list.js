'use client';

import {neonPublicClient} from './neon-client';

const SCOPE_ID_PATTERN=/^[a-z][a-z0-9]*$/;

export async function selectManagedScopes(){
  const {data:rows,error}=await neonPublicClient.schema('silver').from('manage')
    .select('id,role')
    .order('id',{ascending:true});
  if(error)throw new Error(error.message||'Neon manage read failed');
  const scopes=new Map();
  for(const row of rows){
    const id=String(row.id||'').trim();
    const role=String(row.role||'').trim();
    if(!SCOPE_ID_PATTERN.test(id))continue;
    const current=scopes.get(id);
    scopes.set(id,{id,role:current?.role==='admin'||role==='admin'?'admin':role});
  }
  return [...scopes.values()].sort((a,b)=>a.id.localeCompare(b.id));
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
