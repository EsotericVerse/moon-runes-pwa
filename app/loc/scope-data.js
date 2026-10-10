'use client';

import {DB_QUERY_BATCH_SIZE} from './query-contract.mjs';
import {selectRows} from './db-query.mjs';
import {dbPublicClient} from './db-client.mjs';

// Public page copy reads only Title_TW and Desc_TW through a least-privilege RPC.
// The silver.manage table itself (emails/roles/mappings) remains private.
export async function selectScopePageCopy(scopeId){
  const id=String(scopeId||'').trim().toLowerCase();
  if(!/^[a-z][a-z0-9]{0,14}$/.test(id))return null;
  const {data,error}=await dbPublicClient.schema('silver').rpc('read_scope_page_copy',{p_scope_id:id});
  if(error)throw new Error(error.message||'Scope page copy is unavailable');
  const row=Array.isArray(data)?data[0]:data;
  return row?{
    scope_id:id,
    Title_TW:String(row.Title_TW||'').trim(),
    Desc_TW:String(row.Desc_TW||'').trim()
  }:null;
}

export const MANAGE_TABLE='silver.manage';

const SCOPE_ID_PATTERN=/^[a-z][a-z0-9]{0,14}$/;
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
    time:`silver.${id}_${timeSuffix}`,
    keywords:`silver.${id}_keywords`,
    blocks:`silver.${id}_blocks`
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

export async function selectScopeRegistry({parentScopeId=null,scopeKind=null}={}){
  const filters=[{column:'active',operator:'eq',value:true}];
  if(parentScopeId)filters.push({column:'parent_scope_id',operator:'eq',value:String(parentScopeId).trim()});
  if(scopeKind)filters.push({column:'scope_kind',operator:'eq',value:String(scopeKind).trim()});
  const {rows}=await selectRows('silver.scope_registry',{
    columns:'scope_id,display_name,scope_kind,extra_sign,domain,directory,parent_scope_id,active,sort_order',
    filters,
    orders:[{column:'sort_order',ascending:true},{column:'scope_id',ascending:true}],
    limit:DB_QUERY_BATCH_SIZE,
    offset:0
  });
  return (rows||[]).map(row=>({
    scope_id:String(row.scope_id||'').trim(),
    display_name:String(row.display_name||'').trim(),
    scope_kind:String(row.scope_kind||'').trim(),
    extra_sign:String(row.extra_sign||'').trim()||null,
    domain:String(row.domain||'').trim()||null,
    directory:String(row.directory||'').trim()||null,
    parent_scope_id:String(row.parent_scope_id||'').trim()||null,
    active:row.active!==false,
    sort_order:Number(row.sort_order)||0
  }));
}

export async function selectScopeRegistryEntry(scopeId){
  const id=String(scopeId||'').trim().toLowerCase();
  if(!SCOPE_ID_PATTERN.test(id))return null;
  const {rows}=await selectRows('silver.scope_registry',{
    columns:'scope_id,display_name,scope_kind,extra_sign,domain,directory,parent_scope_id,active,sort_order',
    filters:[{column:'scope_id',operator:'eq',value:id},{column:'active',operator:'eq',value:true}],
    limit:1,
    offset:0
  });
  const row=rows?.[0];
  if(!row)return null;
  return {
    scope_id:String(row.scope_id||'').trim(),
    display_name:String(row.display_name||'').trim(),
    scope_kind:String(row.scope_kind||'').trim(),
    extra_sign:String(row.extra_sign||'').trim()||null,
    domain:String(row.domain||'').trim()||null,
    directory:String(row.directory||'').trim()||null,
    parent_scope_id:String(row.parent_scope_id||'').trim()||null,
    active:row.active!==false,
    sort_order:Number(row.sort_order)||0
  };
}

export async function selectScopeGroupChildren(scopeId='loc'){
  const rows=await selectScopeRegistry({parentScopeId:scopeId});
  return Promise.all(rows.map(async row=>{
    if(row.scope_kind!=='scope')return row;
    try{
      const config=await selectScopeConfig(row.scope_id);
      return {
        ...row,
        display_name:String(config?.display_name||row.display_name||row.scope_id).trim(),
        search_intro:String(config?.search_intro||'').trim(),
        search_aliases:Array.isArray(config?.search_aliases)?config.search_aliases:[]
      };
    }catch{
      return row;
    }
  }));
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


// Deduplicate simultaneous readers (AppShell, Scope runtime, feature gate).
// Keep no long-lived result cache: DB changes can be picked up on next read.
const scopeConfigInFlight=new Map();
export function selectScopeConfig(scopeId){
  const scope=defaultScopeData(scopeId);
  if(!scope)return Promise.resolve(null);
  const existing=scopeConfigInFlight.get(scope.id);
  if(existing)return existing;
  const request=selectRows(scope.config,{
    columns:'id,display_name,search_intro,search_aliases,theme,locale,search_able,statistics_able,culture_able',
    filters:[{column:'id',operator:'eq',value:scope.id}],
    limit:1,
    offset:0
  }).then(({rows})=>rows[0]||null).finally(()=>scopeConfigInFlight.delete(scope.id));
  scopeConfigInFlight.set(scope.id,request);
  return request;
}


export async function selectScopeBlocks(scopeId,page='index'){
  const id=String(scopeId||'').trim().toLowerCase();
  if(!SCOPE_ID_PATTERN.test(id))return [];
  const requested=String(page||'index').trim().toLowerCase();
  const pageName=requested==='home'?'index':requested;
  if(!/^[a-z0-9_-]+$/.test(pageName))throw new Error('Page name 無效');
  const table=`silver.${id}_blocks`;
  const {rows}=await selectRows(table,{
    columns:'uid,page_name,block_eyebrow,block_title,block_subtitle,block_text,block_order,block_entity',
    filters:[{column:'page_name',operator:'eq',value:pageName}],
    orders:[{column:'block_order',ascending:true}],
    limit:DB_QUERY_BATCH_SIZE,
    offset:0
  });
  return rows||[];
}
