'use client';

import {DB_QUERY_BATCH_SIZE} from './query-contract.mjs';


import {dbBackupPublicClient,dbConfiguredPublicClient,dbPublicClient} from './db-client.mjs';
import {markPrimaryReadFailed,markPrimaryReadSucceeded,setManualReadSource} from './db-source-status.mjs';

// Resolve the selected provider once when a page becomes active, not on every
// database query and not on a short-lived polling timer. Only non-secret status
// travels to the client. Supabase's normal reads remain on Data API/PostgREST.
let selectedProvider='supabase';
let providerResolved=false;
let providerLookup=null;
let providerRevision=0;
function invalidateProvider(){
  providerRevision++;
  providerResolved=false;
}
async function activePublicProvider(){
  if(providerResolved)return selectedProvider;
  if(!dbConfiguredPublicClient?.activeTarget){
    providerResolved=true;
    return selectedProvider;
  }
  if(!providerLookup){
    const revision=providerRevision;
    providerLookup=(async()=>{
      try{
        const result=await dbConfiguredPublicClient.activeTarget();
        const next=String(result?.data?.provider||'supabase');
        if(!['supabase','neon','custom'].includes(next))throw new Error('Invalid active database provider');
        if(revision===providerRevision){
          selectedProvider=next;
          setManualReadSource(next==='neon'?'Neon':next==='custom'?'Standard SQL':'');
        }
      }catch{
        // Keep the last known route. If primary reads fail, the existing public
        // fallback can still use Neon without repeated control-plane queries.
      }finally{
        if(revision===providerRevision)providerResolved=true;
        providerLookup=null;
      }
      return selectedProvider;
    })();
  }
  return providerLookup;
}
if(typeof window!=='undefined'){
  window.addEventListener('loc-database-target-changed',()=>{
    invalidateProvider();
    void activePublicProvider();
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')invalidateProvider();
  });
  window.addEventListener('pageshow',event=>{
    if(event.persisted)invalidateProvider();
  });
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
export async function executePublicRead(table,buildQuery,{source='auto'}={}){
  const run=async(client,label)=>{
    const result=await buildQuery(publicRelation(client,table));
    const failure=resultError(result,table,label);
    if(failure)throw failure;
    return {...result,__dataSource:label};
  };
  if(source==='backup'){
    if(!dbBackupPublicClient)throw new Error('Backup public-read provider is not configured');
    return run(dbBackupPublicClient,'backup');
  }
  if(source==='primary'){
    try{
      const result=await run(dbPublicClient,'primary');
      markPrimaryReadSucceeded(table);
      return result;
    }catch(error){
      const failure=error instanceof Error?error:new Error(String(error||'Primary public read failed'));
      markPrimaryReadFailed(table,failure);
      throw failure;
    }
  }

  const provider=await activePublicProvider();
  if(provider==='neon'){
    if(!dbBackupPublicClient)throw new Error('Neon backup reader is unavailable');
    return run(dbBackupPublicClient,'backup');
  }
  if(provider==='custom'){
    if(!dbConfiguredPublicClient)throw new Error('Selected SQL reader is unavailable');
    return run(dbConfiguredPublicClient,'selected');
  }

  let primaryError=null;
  try{
    const result=await run(dbPublicClient,'primary');
    markPrimaryReadSucceeded(table);
    return result;
  }catch(error){
    primaryError=error instanceof Error?error:new Error(String(error||'Primary public read failed'));
    markPrimaryReadFailed(table,primaryError);
  }
  if(!dbBackupPublicClient)throw primaryError;
  try{
    return await run(dbBackupPublicClient,'backup');
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
  source='auto'
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
  },{source});
  return {rows:data||[],count:total,dataSource:__dataSource};
}

export async function selectAllRows(table,{
  columns,
  filters=[],
  orFilter='',
  orders=[],
  pageSize=DB_QUERY_BATCH_SIZE,
  onProgress=null
}={}){
  const size=Math.max(1,Math.min(DB_QUERY_BATCH_SIZE,Math.floor(Number(pageSize)||DB_QUERY_BATCH_SIZE)));
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
