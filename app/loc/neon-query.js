'use client';

import {NEON_QUERY_BATCH_SIZE} from './query-contract.mjs';


import {neonPublicClient} from './neon-client';

export function neonPublicRelation(table){
  const [schema,name]=String(table).split('.');
  return neonPublicClient.schema(schema).from(name);
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

export async function selectNeonCount(table,{filters=[],orFilter=''}={}){
  let query=neonPublicRelation(table).select('item_count:count()').limit(1);
  query=applyNeonFilters(query,filters);
  if(orFilter)query=query.or(orFilter);
  const {data,error}=await query;
  if(error)throw new Error(error.message||('Neon COUNT '+table+' failed'));
  return Number(data?.[0]?.item_count)||0;
}

export async function selectNeonRows(table,{
  columns,
  filters=[],
  orFilter='',
  orders=[],
  limit=20,
  offset=0,
  count=null,
  maxLimit=NEON_QUERY_BATCH_SIZE
}={}){
  if(!String(columns||'').trim()||String(columns).trim()==='*')throw new Error('Neon SELECT requires explicit columns');
  const safeMaximum=Math.max(1,Math.floor(Number(maxLimit)||NEON_QUERY_BATCH_SIZE));
  const safeLimit=Math.max(1,Math.min(safeMaximum,Math.floor(Number(limit)||20)));
  const safeOffset=Math.max(0,Math.floor(Number(offset)||0));
  let query=neonPublicRelation(table).select(columns,count?{count}:undefined);
  query=applyNeonFilters(query,filters);
  if(orFilter)query=query.or(orFilter);
  query=applyNeonOrders(query,orders);
  query=query.range(safeOffset,safeOffset+safeLimit-1);
  const {data,error,count:total}=await query;
  if(error)throw new Error(error.message||('Neon SELECT '+table+' failed'));
  return {rows:data||[],count:total};
}

export async function selectAllNeonRows(table,{
  columns,
  filters=[],
  orFilter='',
  orders=[],
  pageSize=NEON_QUERY_BATCH_SIZE
}={}){
  const size=Math.max(1,Math.min(NEON_QUERY_BATCH_SIZE,Math.floor(Number(pageSize)||NEON_QUERY_BATCH_SIZE)));
  const first=await selectNeonRows(table,{columns,filters,orFilter,orders,limit:size,offset:0,count:'exact'});
  const rows=[...first.rows];
  const total=Number(first.count) || rows.length;
  let offset=rows.length;
  while(offset<total){
    const page=await selectNeonRows(table,{columns,filters,orFilter,orders,limit:size,offset});
    if(!page.rows.length)break;
    rows.push(...page.rows);
    offset+=page.rows.length;
  }
  return {rows,count:total};
}
