'use client';

import {selectNeonCount,selectNeonRows} from './neon-query';
import {mappedScopeTable,normalizeDataScopeId,selectScopeTableMapping} from './scope-table-mapping';

const SCOPE_ID_PATTERN=/^[a-z][a-z0-9]*$/;

export async function selectManagedScopes(){
  const filters=[{column:'role',operator:'in',value:['admin','scope']}];
  const total=await selectNeonCount('silver.manage',{filters});
  if(!total)return [];
  const rows=[];
  let offset=0;
  while(offset<total){
    const page=await selectNeonRows('silver.manage',{
      columns:'id,email,role,galaxy,time,birthday',
      filters,
      orders:[{column:'id',ascending:true}],
      limit:Math.min(1000,total-offset),
      offset
    });
    if(!page.rows.length)break;
    rows.push(...page.rows);
    offset+=page.rows.length;
  }
  const scopes=new Map();
  for(const row of rows){
    const id=String(row.id||'').trim();
    const role=String(row.role||'').trim();
    const birthday=String(row.birthday||'').slice(0,10);
    if(!SCOPE_ID_PATTERN.test(id))continue;
    const current=scopes.get(id);
    scopes.set(id,{
      id,
      role:current?.role==='admin'||role==='admin'?'admin':role,
      birthday:birthday||current?.birthday||null,
      galaxy:String(row.galaxy||current?.galaxy||'galaxy'),
      time:String(row.time||current?.time||'time')
    });
  }
  return [...scopes.values()].sort((a,b)=>a.id.localeCompare(b.id));
}

export async function selectManagedScopeIds(){
  return (await selectManagedScopes()).map(row=>row.id);
}

export async function scopeDataTable(scopeId,kind,{email=''}={}){
  const id=normalizeDataScopeId(scopeId);
  const mapping=await selectScopeTableMapping(id,{email});
  if(kind==='galaxy')return mappedScopeTable(id,'galaxy',mapping.galaxy);
  if(kind==='galaxy_media')return mappedScopeTable(id,'galaxy',mapping.galaxy)+'_media';
  if(kind==='time')return mappedScopeTable(id,'time',mapping.time);
  throw new Error('Scope table kind 無效');
}
