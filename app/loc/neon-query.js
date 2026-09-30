'use client';

import {neonPublicClient} from './neon-client';

function relation(table){
  const [schema,name]=String(table).split('.');
  return neonPublicClient.schema(schema).from(name);
}
function applyFilters(query,filters=[]){
  for(const filter of filters){
    query=filter.operator==='in'
      ?query.in(filter.column,filter.value)
      :query[filter.operator](filter.column,filter.value);
  }
  return query;
}
function applyOrders(query,orders=[]){
  for(const order of orders){
    query=query.order(order.column,{
      ascending:order.ascending??true,
      nullsFirst:order.nullsFirst
    });
  }
  return query;
}

export async function selectNeonCount(table,{filters=[],orFilter=''}={}){
  let query=relation(table).select('item_count:count()').limit(1);
  query=applyFilters(query,filters);
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
  count=null
}={}){
  if(!String(columns||'').trim()||String(columns).trim()==='*')throw new Error('Neon SELECT requires explicit columns');
  const safeLimit=Math.max(1,Math.min(5000,Math.floor(Number(limit)||20)));
  const safeOffset=Math.max(0,Math.floor(Number(offset)||0));
  let query=relation(table).select(columns,count?{count}:undefined);
  query=applyFilters(query,filters);
  if(orFilter)query=query.or(orFilter);
  query=applyOrders(query,orders);
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
  pageSize=5000
}={}){
  const size=Math.max(1,Math.min(5000,Math.floor(Number(pageSize)||5000)));
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
