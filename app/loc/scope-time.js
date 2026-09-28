'use client';

import {scopeDataTable} from './scope-list';
import {neonPublicClient} from './neon-client';


function __relation(table){
  const [schema,name]=String(table).split('.');
  return neonPublicClient.schema(schema).from(name);
}
function __filters(query,filters=[]){
  for(const filter of filters)query=filter.operator==='in'?query.in(filter.column,filter.value):query[filter.operator](filter.column,filter.value);
  return query;
}
function __orders(query,orders=[]){
  for(const order of orders)query=query.order(order.column,{ascending:order.ascending??true,nullsFirst:order.nullsFirst});
  return query;
}
async function __select(table,{columns='*',filters=[],orFilter='',orders=[],limit=null,offset=0,range=null,count=null}={}){
  let query=__relation(table).select(columns,count?{count}:undefined);
  query=__filters(query,filters);
  if(orFilter)query=query.or(orFilter);
  query=__orders(query,orders);
  if(Array.isArray(range)&&range.length===2)query=query.range(range[0],range[1]);
  else if(Number.isFinite(limit))query=limit>0?query.range(offset,offset+limit-1):query.limit(0);
  const {data,error,count:total}=await query;
  if(error)throw new Error(error.message||('Neon SELECT '+table+' failed'));
  return {rows:data||[],count:total};
}
async function selectNeonRows(table,options={}){return __select(table,options);}
async function selectNeonAllRows(table,options={}){
  const {limit,offset,range,count,...rest}=options||{};
  const rows=[];
  let cursor=0;
  const size=500;
  while(true){
    const page=await __select(table,{...rest,limit:size,offset:cursor});
    rows.push(...page.rows);
    if(page.rows.length<size)break;
    cursor+=page.rows.length;
  }
  return {rows,count:rows.length};
}

export const SCOPE_TIME_COLUMNS='record_id,record_type,label,resource_id,display_order,status,note,time_date,anchor_pair,date_status,year_value,visibility';

function dateText(value){return value?String(value).slice(0,10):null;}
function addDays(value,amount){
  const text=dateText(value);
  if(!text)return null;
  const date=new Date(text+'T00:00:00Z');
  date.setUTCDate(date.getUTCDate()+amount);
  return date.toISOString().slice(0,10);
}
function anchorDate(row){
  const exact=dateText(row?.time_date);
  if(exact)return exact;
  const year=Number(row?.year_value);
  return String(row?.date_status||'')==='year_only'&&Number.isInteger(year)&&year>0?`${year}-01-01`:null;
}
export function splitAnchorPair(value){
  const [before='0',after='0']=String(value||'0,0').split(',',2).map(item=>String(item||'0').trim()||'0');
  return {before,after};
}
export function normalizeScopeTimeRows(rows,scopeId=''){
  const source=Array.isArray(rows)?rows:[];
  const anchors=new Map(source
    .filter(row=>row.record_type==='anchor'&&row.resource_id)
    .map(row=>[String(row.resource_id),row]));
  return source.flatMap(row=>{
    const type=String(row.record_type||'');
    const id=String(row.resource_id||row.record_id||'');
    const pair=splitAnchorPair(row.anchor_pair);
    if(type!=='anchor'&&pair.before==='0'&&pair.after==='0')return [];
    const before=pair.before==='0'?null:anchors.get(pair.before);
    const after=pair.after==='0'?null:anchors.get(pair.after);
    const startAnchorId=pair.before==='0'?null:pair.before;
    const endAnchorId=pair.after==='0'?null:pair.after;
    const pointDate=type==='anchor'?anchorDate(row):null;
    const startDate=type==='anchor'?pointDate:anchorDate(before);
    const endBoundary=type==='anchor'?null:anchorDate(after);
    const endDate=type==='period'&&endBoundary?addDays(endBoundary,-1):endBoundary;
    return [{
      ...row,
      scope_id:scopeId||row.scope_id||'',
      entry_key:type+':'+id,
      entry_type:type,
      title:row.label||id,
      summary:row.note||'',
      era_id:type==='period'?id:null,
      period:type==='period'?id:null,
      entry_name:type==='period'?String(row.label||'').replace(/^P\d+\s*[｜|]\s*/,''):null,
      order_no:row.display_order,
      anchor_id:type==='anchor'?id:null,
      start_anchor_id:startAnchorId,
      end_anchor_id:endAnchorId,
      before_id:type==='event'?startAnchorId:null,
      after_id:type==='event'?endAnchorId:null,
      event_id:type==='event'?id:null,
      open_start:type!=='anchor'&&pair.before==='0'&&pair.after!=='0',
      open_end:type!=='anchor'&&pair.before!=='0'&&pair.after==='0',
      start_date:startDate,
      end_date:endDate
    }];
  }).sort((a,b)=>{
    const ad=String(a.start_date||a.end_date||'9999-12-31');
    const bd=String(b.start_date||b.end_date||'9999-12-31');
    return ad.localeCompare(bd)||Number(a.order_no||0)-Number(b.order_no||0)||String(a.entry_key).localeCompare(String(b.entry_key));
  });
}
export async function selectScopeTimeRows(scopeId){
  const id=String(scopeId||'').trim();
  if(!id)return [];
  if(id==='loc')throw new Error('LOC 是聚合 Scope，不存在 silver.loc_time；請先讀 silver.manage 再逐 Scope 讀取 *_time。');
  const table=scopeDataTable(id,'time');
  const {rows}=await selectNeonAllRows(table,{
    columns:SCOPE_TIME_COLUMNS,
    filters:[
      {column:'record_type',operator:'in',value:['anchor','period','event']}
    ]
  });
  return normalizeScopeTimeRows(rows,id);
}
