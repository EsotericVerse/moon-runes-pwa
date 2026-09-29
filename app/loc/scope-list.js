'use client';

import {selectNeonRows} from './neon-query';

const SCOPE_ID_PATTERN=/^[a-z][a-z0-9]*$/;

export async function selectManagedScopes(){
  const filters=[{column:'role',operator:'in',value:['admin','scope']}];
  const {rows}=await selectNeonRows('silver.manage',{
    columns:'id,role,galaxy,time,birthday',
    filters,
    orders:[{column:'id',ascending:true}],
    limit:5000,
    offset:0
  });
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

