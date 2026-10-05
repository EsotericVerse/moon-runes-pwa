'use client';

import {DB_QUERY_BATCH_SIZE} from './query-contract.mjs';
import {selectRows} from './db-query.mjs';

export const MANAGE_TABLE='silver.manage';

const SCOPE_ID_PATTERN=/^[a-z][a-z0-9]*$/;
const TABLE_TOKEN_PATTERN=/^[a-z][a-z0-9_]*$/;

function requiredToken(value,label){
  const token=String(value||'').trim()||label;
  if(!TABLE_TOKEN_PATTERN.test(token))throw new Error('silver.manage '+label+' 設定無效');
  return token;
}

function buildScopeData(row,id){
  const galaxySuffix=requiredToken(row?.galaxy,'galaxy');
  const timeSuffix=requiredToken(row?.time,'time');
  const galaxy=`silver.${id}_${galaxySuffix}`;
  return {
    id,
    config:`silver.${id}`,
    role:String(row?.role||'').trim(),
    birthday:String(row?.birthday||'').slice(0,10)||null,
    galaxy,
    galaxyMedia:galaxy+'_media',
    time:`silver.${id}_${timeSuffix}`
  };
}

export function defaultScopeData(scopeId){
  const id=String(scopeId||'').trim();
  return SCOPE_ID_PATTERN.test(id)?buildScopeData({},id):null;
}

export function scopeDataFromManageRows(rows=[]){
  const scopes=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const id=String(row?.id||'').trim();
    if(!SCOPE_ID_PATTERN.test(id))continue;
    const next=buildScopeData(row,id);
    const current=scopes.get(id);
    if(current&&(current.galaxy!==next.galaxy||current.time!==next.time)){
      throw new Error('silver.manage Scope '+id+' 的 galaxy/time 設定不一致');
    }
    scopes.set(id,current
      ?{...current,role:current.role==='admin'||next.role==='admin'?'admin':next.role,birthday:current.birthday||next.birthday}
      :next);
  }
  return [...scopes.values()].sort((a,b)=>a.id.localeCompare(b.id));
}

export async function selectManagedScopes(){
  const {rows}=await selectRows(MANAGE_TABLE,{
    columns:'id,role,galaxy,time,birthday',
    filters:[{column:'role',operator:'in',value:['admin','scope']}],
    orders:[{column:'id',ascending:true}],
    limit:DB_QUERY_BATCH_SIZE,
    offset:0
  });
  return scopeDataFromManageRows(rows);
}

export async function selectManagedScope(scopeId){
  const id=String(scopeId||'').trim();
  if(!SCOPE_ID_PATTERN.test(id))throw new Error('Scope ID 無效');
  const {rows}=await selectRows(MANAGE_TABLE,{
    columns:'id,role,galaxy,time,birthday',
    filters:[{column:'id',operator:'eq',value:id},{column:'role',operator:'in',value:['admin','scope']}],
    orders:[{column:'id',ascending:true}],
    limit:DB_QUERY_BATCH_SIZE,
    offset:0
  });
  return scopeDataFromManageRows(rows)[0]||null;
}


export async function selectScopeConfig(scopeId){
  const scope=defaultScopeData(scopeId);
  if(!scope)return null;
  const {rows}=await selectRows(scope.config,{
    columns:'id,theme,search_able,statistics_able,culture_able',
    filters:[{column:'id',operator:'eq',value:scope.id}],
    limit:1,
    offset:0
  });
  return rows[0]||null;
}
