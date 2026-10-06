'use client';

import {DB_QUERY_BATCH_SIZE} from './query-contract.mjs';


import {dbBackupPublicClient,dbPublicClient} from './db-client.mjs';
import {markPrimaryReadFailed,markPrimaryReadSucceeded} from './db-source-status.mjs';

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
export async function executePublicRead(table,buildQuery){
  let primaryError=null;
  try{
    const result=await buildQuery(publicRelation(dbPublicClient,table));
    const failure=resultError(result,table,'primary');
    if(failure)throw failure;
    markPrimaryReadSucceeded(table);
    return {...result,__dataSource:'primary'};
  }catch(error){
    primaryError=error instanceof Error?error:new Error(String(error||'Primary public read failed'));
    markPrimaryReadFailed(table,primaryError);
  }
  if(!dbBackupPublicClient)throw primaryError;
  try{
    const result=await buildQuery(publicRelation(dbBackupPublicClient,table));
    const failure=resultError(result,table,'backup');
    if(failure)throw failure;
    return {...result,__dataSource:'backup'};
  }catch(backupError){
    const secondary=backupError instanceof Error?backupError:new Error(String(backupError||'Backup public read failed'));
    const aggregate=new AggregateError([primaryError,secondary],'Public read failed on primary and backup for '+table);
    aggregate.primaryError=primaryError;
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

export async function selectCount(table,{idColumn,filters=[],orFilter=''}={}){
  if(!/^[a-z][a-z0-9_]*$/i.test(String(idColumn||'')))throw new Error('DB COUNT requires an explicit ID column');
  // HEAD returns a SQL count without loading rows, including tables without uid.
  const {count}=await executePublicRead(table,relation=>{
    let query=relation.select(idColumn,{count:'exact',head:true});
    query=applyFilters(query,filters);
    if(orFilter)query=query.or(orFilter);
    return query;
  });
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
  maxLimit=DB_QUERY_BATCH_SIZE
}={}){
  if(!String(columns||'').trim()||String(columns).trim()==='*')throw new Error('DB SELECT requires explicit columns');
  const safeMaximum=Math.max(1,Math.floor(Number(maxLimit)||DB_QUERY_BATCH_SIZE));
  const safeLimit=Math.max(1,Math.min(safeMaximum,Math.floor(Number(limit)||20)));
  const safeOffset=Math.max(0,Math.floor(Number(offset)||0));
  const {data,count:total,__dataSource}=await executePublicRead(table,relation=>{
    let query=relation.select(columns,count?{count}:undefined);
    query=applyFilters(query,filters);
    if(orFilter)query=query.or(orFilter);
    query=applyOrders(query,orders);
    return query.range(safeOffset,safeOffset+safeLimit-1);
  });
  return {rows:data||[],count:total,dataSource:__dataSource};
}

export async function selectAllRows(table,{
  columns,
  filters=[],
  orFilter='',
  orders=[],
  pageSize=DB_QUERY_BATCH_SIZE
}={}){
  const size=Math.max(1,Math.min(DB_QUERY_BATCH_SIZE,Math.floor(Number(pageSize)||DB_QUERY_BATCH_SIZE)));
  const first=await selectRows(table,{columns,filters,orFilter,orders,limit:size,offset:0,count:'exact'});
  const rows=[...first.rows];
  const total=Number(first.count) || rows.length;
  let offset=rows.length;
  while(offset<total){
    const page=await selectRows(table,{columns,filters,orFilter,orders,limit:size,offset});
    if(!page.rows.length)break;
    rows.push(...page.rows);
    offset+=page.rows.length;
  }
  return {rows,count:total};
}
