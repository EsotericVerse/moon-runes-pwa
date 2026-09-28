'use client';

import {isReferenceOnlyResource,publicContentFilters} from './content-policy';
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

async function selectNeonRowById(table,{idColumn,id,columns}={}){
  const page=await __select(table,{columns,filters:[{column:idColumn,operator:'eq',value:String(id)}],limit:1});
  return page.rows[0]||null;
}

function timeFilters(column,startDate,endDate){
  const filters=[];
  if(startDate)filters.push({column,operator:'gte',value:String(startDate).slice(0,10)+'T00:00:00+08:00'});
  if(endDate)filters.push({column,operator:'lte',value:String(endDate).slice(0,10)+'T23:59:59.999+08:00'});
  return filters;
}
function taipeiDateKey(value){
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return new Date(date.getTime()+8*60*60*1000).toISOString().slice(0,10);
}
function mondayOf(value){
  const key=taipeiDateKey(value);
  if(!key)return '';
  const date=new Date(key+'T00:00:00Z');
  const day=date.getUTCDay();
  const shift=day===0?-6:1-day;
  date.setUTCDate(date.getUTCDate()+shift);
  return date.toISOString().slice(0,10);
}
async function selectSourceRows({startDate='',endDate='',excludedIds=[]}={}){
  const result=await selectNeonAllRows('silver.lo3rwang_galaxy',{
    columns:'uid,source_name,createtime',
    filters:publicContentFilters(timeFilters('createtime',startDate,endDate))
  });
  const excluded=new Set((excludedIds||[]).map(value=>String(value||'')).filter(Boolean));
  return excluded.size?result.rows.filter(row=>!excluded.has(String(row.uid||''))):result.rows;
}

export async function selectSourceCatalog({scopeId='lo3rwang',limit=null,offset=0,excludedIds=[]}={}){
  if(String(scopeId)!=='lo3rwang')return {rows:[],totalCount:0};
  const excluded=(excludedIds||[]).map(value=>String(value||'')).filter(Boolean);
  let all;
  if(!excluded.length){
    const result=await selectNeonAllRows('silver.lo3rwang_source_stats',{
      columns:'source_name,work_count',
      orders:[{column:'work_count',ascending:false},{column:'source_name',ascending:true}]
    });
    all=result.rows.map(row=>({
      scope_id:'lo3rwang',
      source_name:String(row.source_name||''),
      work_count:Number(row.work_count)||0
    }));
  }else{
    const rows=await selectSourceRows({excludedIds:excluded});
    const map=new Map();
    for(const row of rows){
      const source=String(row.source_name||'').trim();
      if(!source)continue;
      const current=map.get(source)||{scope_id:'lo3rwang',source_name:source,work_count:0};
      current.work_count+=1;
      map.set(source,current);
    }
    all=[...map.values()].sort((a,b)=>b.work_count-a.work_count||a.source_name.localeCompare(b.source_name));
  }
  const start=Math.max(0,Math.floor(Number(offset)||0));
  const bounded=limit!==null&&limit!==undefined&&Number.isFinite(Number(limit));
  const page=bounded?all.slice(start,start+Math.max(0,Math.floor(Number(limit)||0))):all;
  return {rows:page,totalCount:all.length};
}

export async function selectSourceWeekly({scopeId='lo3rwang',startDate='',endDate='',limit=null,offset=0,excludedIds=[]}={}){
  if(String(scopeId)!=='lo3rwang')return {rows:[],totalCount:0};
  const excluded=(excludedIds||[]).map(value=>String(value||'')).filter(Boolean);
  let rows;
  let aggregated=false;
  if(!excluded.length){
    const filters=[];
    if(startDate)filters.push({column:'work_date',operator:'gte',value:String(startDate).slice(0,10)});
    if(endDate)filters.push({column:'work_date',operator:'lte',value:String(endDate).slice(0,10)});
    const result=await selectNeonAllRows('silver.lo3rwang_source_daily',{
      columns:'source_name,work_date,work_count',
      filters,
      orders:[{column:'work_date',ascending:true},{column:'source_name',ascending:true}]
    });
    rows=result.rows;
    aggregated=true;
  }else{
    rows=await selectSourceRows({startDate,endDate,excludedIds:excluded});
  }
  const map=new Map();
  for(const row of rows){
    const source=String(row.source_name||'').trim();
    const weekStart=mondayOf(aggregated?row.work_date:row.createtime);
    if(!source||!weekStart)continue;
    const key=source+'|'+weekStart;
    const current=map.get(key)||{scope_id:'lo3rwang',source_name:source,week_start:weekStart,work_count:0};
    current.work_count+=aggregated?(Number(row.work_count)||0):1;
    map.set(key,current);
  }
  const all=[...map.values()].sort((a,b)=>a.week_start.localeCompare(b.week_start)||a.source_name.localeCompare(b.source_name));
  const start=Math.max(0,Math.floor(Number(offset)||0));
  const bounded=limit!==null&&limit!==undefined&&Number.isFinite(Number(limit));
  const page=bounded?all.slice(start,start+Math.max(0,Math.floor(Number(limit)||0))):all;
  return {rows:page,totalCount:all.length};
}

export async function selectGalaxyPage({sourceName='',startDate='',endDate='',limit=20,offset=0}={}){
  const filters=[];
  if(sourceName)filters.push({column:'source_name',operator:'eq',value:sourceName});
  filters.push(...timeFilters('createtime',startDate,endDate));
  const {rows,count}=await selectNeonRows('silver.lo3rwang_galaxy',{
    columns:'uid,source_name,createtime,title,content',
    filters:publicContentFilters(filters),
    orders:[{column:'createtime',ascending:false}],
    limit,
    offset,
    count:'exact'
  });
  const ids=rows.map(row=>String(row.uid||'').trim()).filter(Boolean);
  const relations=ids.length
    ?(await selectNeonAllRows('silver.lo3rwang_galaxy',{
      columns:'uid,source_id,target_id',
      filters:[{column:'uid',operator:'in',value:ids}]
    })).rows
    :[];
  const relationById=new Map(relations.map(row=>[String(row.uid),row]));
  return {
    rows:rows.map(row=>({...row,...(relationById.get(String(row.uid))||{})})),
    totalCount:Number(count??rows.length)||0
  };
}

function mediaIdsOf(value){
  return [...new Set((Array.isArray(value)?value:[]).map(item=>String(item||'').trim()).filter(Boolean))];
}

async function mediaRowsFor(scopeId,mediaIds=[]){
  const ids=[...new Set(mediaIds.map(String).filter(Boolean))];
  if(!ids.length)return [];
  const lunarunes=String(scopeId||'')==='lunarunes'||String(scopeId||'')==='lrunes';
  if(lunarunes){
    return (await selectNeonAllRows('silver.lrunes_galaxy_media',{
      columns:'media_id,title,url,media_type',
      filters:[{column:'media_id',operator:'in',value:ids}]
    })).rows;
  }
  return (await selectNeonAllRows('silver.lo3rwang_galaxy_media',{
    columns:'media_id,title,url,media_type',
    filters:[{column:'media_id',operator:'in',value:ids}]
  })).rows;
}

function resolvedLinks(row,mediaById){
  const links=[];
  if(row?.url&&/^https?:\/\//i.test(String(row.url)))links.push({id:'url:'+row.uid,href:row.url,label:'外部連結'});
  for(const id of mediaIdsOf(row?.media_link)){
    const media=mediaById.get(id);
    if(media?.url&&/^https?:\/\//i.test(String(media.url))){
      links.push({id:'media:'+id,href:media.url,label:media.title||media.media_type||'媒體連結'});
    }
  }
  return links;
}

export async function selectGalaxySummaries(scopeId,uids=[]){
  const ids=[...new Set((uids||[]).map(value=>String(value||'').trim()).filter(Boolean))];
  if(!ids.length)return [];
  const lunarunes=String(scopeId||'')==='lunarunes'||String(scopeId||'')==='lrunes';

  let rows=[];
  if(lunarunes){
    rows=(await selectNeonAllRows('silver.lrunes_galaxy',{
      columns:'uid,title',
      filters:[{column:'uid',operator:'in',value:ids}]
    })).rows;
  }else{
    rows=(await selectNeonAllRows('silver.lo3rwang_galaxy',{
      columns:'uid,title',
      filters:[{column:'uid',operator:'in',value:ids}]
    })).rows;
  }

  return rows.map(row=>({
    uid:row.uid,
    title:row.title||'',
    excerpt:'',
    links:[]
  }));
}

export async function selectGalaxyContent(scopeId,uid){
  const id=String(uid||'').trim();
  if(!id)return null;
  const lunarunes=String(scopeId||'')==='lunarunes'||String(scopeId||'')==='lrunes';
  const table=lunarunes?'silver.lrunes_galaxy':'silver.lo3rwang_galaxy';
  return selectNeonRowById(table,{
    idColumn:'uid',
    id,
    columns:'uid,content'
  });
}

export async function selectGalaxyIdentity(scopeId,uid){
  const id=String(uid||'').trim();
  if(!id)return null;
  const lunarunes=String(scopeId||'')==='lunarunes'||String(scopeId||'')==='lrunes';
  const table=lunarunes?'silver.lrunes_galaxy':'silver.lo3rwang_galaxy';
  const row=await selectNeonRowById(table,{
    idColumn:'uid',
    id,
    columns:'uid,title,reference_only,source_name,createtime,url,source_id,target_id,media_link'
  });
  if(!row||isReferenceOnlyResource(row))return null;
  const contentRow=await selectGalaxyContent(scopeId,id);
  const mediaRows=await mediaRowsFor(lunarunes?'lunarunes':'lo3rwang',mediaIdsOf(row.media_link));
  const mediaById=new Map(mediaRows.map(item=>[String(item.media_id),item]));
  return {...row,content:contentRow?.content||'',links:resolvedLinks(row,mediaById)};
}
