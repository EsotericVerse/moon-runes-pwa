'use client';

import {DB_QUERY_BATCH_SIZE} from './query-contract.mjs';


import {dbPublicClient} from './db-client.mjs';

export function dbPublicRelation(table){
  const [schema,name]=String(table).split('.');
  return dbPublicClient.schema(schema).from(name);
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
  let query=dbPublicRelation(table).select(idColumn,{count:'exact',head:true});
  query=applyFilters(query,filters);
  if(orFilter)query=query.or(orFilter);
  const {count,error,status}=await query;
  if(error||status>=400)throw new Error(error?.message||('DB COUNT '+table+' failed: HTTP '+status));
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
  let query=dbPublicRelation(table).select(columns,count?{count}:undefined);
  query=applyFilters(query,filters);
  if(orFilter)query=query.or(orFilter);
  query=applyOrders(query,orders);
  query=query.range(safeOffset,safeOffset+safeLimit-1);
  const {data,error,count:total}=await query;
  if(error)throw new Error(error.message||('DB SELECT '+table+' failed'));
  return {rows:data||[],count:total};
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
