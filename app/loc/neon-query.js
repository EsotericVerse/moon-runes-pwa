'use client';

import {neonPublicClient} from './neon-client';

export function neonRelation(table,client=neonPublicClient){
  const [schema,name]=String(table).split('.');
  return client.schema(schema).from(name);
}

export function applyNeonFilters(query,filters=[]){
  for(const filter of filters){
    query=filter.operator==='in'
      ?query.in(filter.column,filter.value)
      :query[filter.operator](filter.column,filter.value);
  }
  return query;
}

export function applyNeonOrders(query,orders=[]){
  for(const order of orders){
    query=query.order(order.column,{
      ascending:order.ascending??true,
      nullsFirst:order.nullsFirst
    });
  }
  return query;
}

export async function selectNeonRows(table,{
  columns='*',filters=[],orFilter='',orders=[],limit=null,offset=0,range=null,count=null,client=neonPublicClient
}={}){
  let query=neonRelation(table,client).select(columns,count?{count}:undefined);
  query=applyNeonFilters(query,filters);
  if(orFilter)query=query.or(orFilter);
  query=applyNeonOrders(query,orders);
  if(Array.isArray(range)&&range.length===2)query=query.range(range[0],range[1]);
  else if(Number.isFinite(limit))query=limit>0?query.range(offset,offset+limit-1):query.limit(0);
  const {data,error,count:total}=await query;
  if(error)throw new Error(error.message||('Neon SELECT '+table+' failed'));
  return {rows:data||[],count:total};
}

export async function selectNeonAllRows(table,options={}){
  const {limit,offset,range,count,batchSize=500,...rest}=options||{};
  const rows=[];
  let cursor=0;
  const size=Math.max(1,Math.floor(Number(batchSize)||500));
  while(true){
    const page=await selectNeonRows(table,{...rest,limit:size,offset:cursor});
    rows.push(...page.rows);
    if(page.rows.length<size)break;
    cursor+=page.rows.length;
  }
  return {rows,count:rows.length};
}

export async function processNeonRows(table,{
  columns,filters=[],orFilter='',orders=[],batchSize=96,onRow,onBatch,client=neonPublicClient
}={}){
  let offset=0,processed=0;
  const size=Math.max(1,Math.floor(Number(batchSize)||96));
  while(true){
    const page=await selectNeonRows(table,{columns,filters,orFilter,orders,limit:size,offset,client});
    if(!page.rows.length)break;
    if(typeof onBatch==='function')await onBatch(page.rows);
    else if(typeof onRow==='function')for(const row of page.rows)await onRow(row);
    processed+=page.rows.length;
    offset+=page.rows.length;
    if(page.rows.length<size)break;
  }
  return {processed,stopped:false,nextOffset:offset};
}
