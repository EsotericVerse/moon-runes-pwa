'use client';

import {DB_PAGE_SIZE,DB_QUERY_BATCH_SIZE,queryBatchSize} from './db-contract.mjs';
export {DB_PAGE_SIZE,DB_QUERY_BATCH_SIZE,queryBatchSize} from './db-contract.mjs';

import {dbAuthClient,dbBackupPublicClient,dbConfiguredPublicClient,dbPublicClient} from './db-client.mjs';
import {markPrimaryReadFailed,markPrimaryReadSucceeded} from './db-source-status.mjs';

import {selectedDatabaseRouting} from './providers/routing-state.mjs';
const recoverableReadError=error=>{
  const code=String(error?.code||'');
  const status=Number(error?.status||error?.cause?.status||0);
  if(status===429||status>=500)return true;
  if(code.startsWith('08')||code==='53300')return true;
  return status===0&&(error instanceof TypeError||/network|fetch failed|timeout|connection|unavailable/i.test(String(error?.message||'')));
};

// A cancelled search must stop the actual HTTP request, not just ignore its result.
// Cancellation is never a database failure: it must not mark the primary source
// as degraded and must never trigger the backup-database fallback.
const abortError=()=>{const error=new Error('Request cancelled');error.name='AbortError';return error;};
export const isAbortError=error=>error?.name==='AbortError'||error?.cause?.name==='AbortError';
const withSignal=(query,signal)=>signal&&typeof query?.abortSignal==='function'?query.abortSignal(signal):query;

// Request-size budget: IN-lists are expanded into one SQL/URL parameter per value,
// so request size grows linearly with the list. Surface the offending table once
// instead of silently sending a multi-thousand-character statement.
export const IN_FILTER_BUDGET=200;
const oversizedWarned=new Set();
function warnOversizedFilters(table,filters){
  for(const filter of filters||[]){
    if(filter?.operator==='in'&&Array.isArray(filter.value)&&filter.value.length>IN_FILTER_BUDGET){
      const key=table+'.'+filter.column;
      if(oversizedWarned.has(key))continue;
      oversizedWarned.add(key);
      console.warn('[db-query] IN filter on '+key+' has '+filter.value.length+' values (budget '+IN_FILTER_BUDGET+'); request size grows linearly. Page the ids or use a DB-side join/RPC.');
    }
  }
}

function publicRelation(client,table){
  const [schema,name]=String(table).split('.');
  return client.schema(schema).from(name);
}
export function dbPublicRelation(table){
  return publicRelation(dbPublicClient,table);
}
function resultError(result,table,source){
  if(!result?.error&&!(Number(result?.status)>=400))return null;
  const cause=result?.error||null;
  const error=new Error(cause?.message||('DB SELECT '+table+' failed on '+source+(result?.status?' HTTP '+result.status:'')));
  if(cause?.code)error.code=cause.code;
  if(cause?.details)error.details=cause.details;
  if(cause?.hint)error.hint=cause.hint;
  if(result?.status)error.status=result.status;
  error.cause=cause||undefined;
  return error;
}
export async function executePublicRead(table,buildQuery,{source='auto',authenticated=false,signal=null}={}){
  if(signal?.aborted)throw abortError();
  const routing=await selectedDatabaseRouting(dbConfiguredPublicClient);
  if(signal?.aborted)throw abortError();
  // Hidden Galaxy rows require the signed-in SDK and server-enforced Scope RLS.
  // Never fall back to an anonymous or backup transport for authenticated reads.
  if(authenticated){
    if(!routing.primaryControl)throw new Error('Authenticated hidden search requires Supabase as the primary database');
    const result=await withSignal(buildQuery(publicRelation(dbAuthClient,table)),signal);
    if(signal?.aborted)throw abortError();
    const failure=resultError(result,table,'authenticated');
    if(failure)throw failure;
    return {...result,__dataSource:'authenticated'};
  }
  const primaryClient=routing.primaryControl?dbPublicClient:dbConfiguredPublicClient;
  if(!primaryClient)throw new Error('Selected primary database is unavailable');
  const run=async(client,label)=>{
    const result=await withSignal(buildQuery(publicRelation(client,table)),signal);
    if(signal?.aborted)throw abortError();
    const failure=resultError(result,table,label);
    if(failure)throw failure;
    return {...result,__dataSource:label};
  };
  const primary=async()=>{
    try{
      const value=await run(primaryClient,'primary');
      markPrimaryReadSucceeded(table);
      return value;
    }catch(error){
      if(signal?.aborted||isAbortError(error))throw abortError();
      markPrimaryReadFailed(table,error);
      throw error;
    }
  };
  const backup=async()=>{
    if(!routing.backupId||!dbBackupPublicClient)throw new Error('Backup database is not selected');
    return run(dbBackupPublicClient,'backup');
  };
  if(source==='primary')return primary();
  if(source==='backup')return backup();
  let original;
  try{return await primary()}catch(error){original=error}
  if(isAbortError(original))throw original;
  if(!routing.backupId||!recoverableReadError(original))throw original;
  try{return await backup()}catch(secondary){
    const aggregate=new AggregateError([original,secondary],'Primary and backup read failed for '+table);
    aggregate.primaryError=original;
    aggregate.backupError=secondary;
    throw aggregate;
  }
}

export function applyFilters(query,filters=[]){
  for(const filter of filters){
    query=filter.operator==='in'
      ?query.in(filter.column,filter.value)
      :query[filter.operator](filter.column,filter.value);
  }
  return query;
}
export function applyOrders(query,orders=[]){
  for(const order of orders){
    query=query.order(order.column,{
      ascending:order.ascending??true,
      nullsFirst:order.nullsFirst
    });
  }
  return query;
}

export async function selectCount(table,{idColumn,filters=[],orFilter='',source='auto'}={}){
  if(!/^[a-z][a-z0-9_]*$/i.test(String(idColumn||'')))throw new Error('DB COUNT requires an explicit ID column');
  // HEAD returns a SQL count without loading rows, including tables without uid.
  const {count}=await executePublicRead(table,relation=>{
    let query=relation.select(idColumn,{count:'exact',head:true});
    query=applyFilters(query,filters);
    if(orFilter)query=query.or(orFilter);
    return query;
  },{source});
  return Number(count)||0;
}

export async function selectRows(table,{
  columns,
  filters=[],
  orFilter='',
  orders=[],
  limit=20,
  offset=0,
  count=null,
  maxLimit=DB_QUERY_BATCH_SIZE,
  source='auto',
  authenticated=false,
  signal=null
}={}){
  if(!String(columns||'').trim()||String(columns).trim()==='*')throw new Error('DB SELECT requires explicit columns');
  const safeMaximum=Math.max(1,Math.min(queryBatchSize(columns),Math.floor(Number(maxLimit)||DB_QUERY_BATCH_SIZE)));
  const safeLimit=Math.max(1,Math.min(safeMaximum,Math.floor(Number(limit)||20)));
  const safeOffset=Math.max(0,Math.floor(Number(offset)||0));
  warnOversizedFilters(table,filters);
  const {data,count:total,__dataSource}=await executePublicRead(table,relation=>{
    let query=relation.select(columns,count?{count}:undefined);
    query=applyFilters(query,filters);
    if(orFilter)query=query.or(orFilter);
    query=applyOrders(query,orders);
    return query.range(safeOffset,safeOffset+safeLimit-1);
  },{source,authenticated,signal});
  return {rows:data||[],count:total,dataSource:__dataSource};
}

export async function selectAllRows(table,{
  columns,
  filters=[],
  orFilter='',
  orders=[],
  pageSize=DB_PAGE_SIZE,
  onProgress=null
}={}){
  const size=Math.max(1,Math.min(queryBatchSize(columns),Math.floor(Number(pageSize)||DB_PAGE_SIZE)));
  const first=await selectRows(table,{columns,filters,orFilter,orders,limit:size,offset:0,count:'exact'});
  const rows=[...first.rows];
  const total=Number(first.count) || rows.length;
  const source=first.dataSource||'auto';
  let offset=rows.length;
  onProgress?.({completed:offset,total});
  while(offset<total){
    const page=await selectRows(table,{columns,filters,orFilter,orders,limit:size,offset,source});
    if(!page.rows.length)break;
    rows.push(...page.rows);
    offset+=page.rows.length;
    onProgress?.({completed:offset,total});
  }
  return {rows,count:total,dataSource:source};
}
