'use client';

import {isReferenceOnlyResource,publicContentFilters} from './content-policy';
import {selectNeonCount,selectNeonRows} from './neon-query';

async function selectNeonRowById(table,{idColumn,id,columns}={}){
  const page=await selectNeonRows(table,{columns,filters:[{column:idColumn,operator:'eq',value:String(id)}],limit:1});
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
function sourceFilters(startDate='',endDate=''){
  return publicContentFilters(timeFilters('createtime',startDate,endDate));
}

export async function selectSourceCatalog({scopeId='lo3rwang'}={}){
  if(String(scopeId)!=='lo3rwang')return {rows:[],totalCount:0};
  const {rows}=await selectNeonRows('silver.lo3rwang_galaxy',{
    columns:'source_name,work_count:count()',
    filters:sourceFilters(),
    orders:[{column:'work_count',ascending:false}],
    limit:100
  });
  const normalized=rows
    .filter(row=>String(row.source_name||'').trim())
    .map(row=>({
      scope_id:'lo3rwang',
      source_name:String(row.source_name).trim(),
      work_count:Number(row.work_count)||0
    }))
    .sort((a,b)=>b.work_count-a.work_count||a.source_name.localeCompare(b.source_name));
  return {rows:normalized,totalCount:normalized.length};
}

export async function selectSourceWeekly({scopeId='lo3rwang',startDate='',endDate='',limit=10000,offset=0}={}){
  if(String(scopeId)!=='lo3rwang')return {rows:[],totalCount:0};
  const {rows}=await selectNeonRows('silver.lo3rwang_galaxy',{
    columns:'source_name,day:createtime::date,work_count:count()',
    filters:sourceFilters(startDate,endDate),
    limit,
    offset
  });
  const weekly=new Map();
  for(const row of rows){
    const source=String(row.source_name||'').trim();
    const weekStart=mondayOf(row.day);
    if(!source||!weekStart)continue;
    const key=source+'|'+weekStart;
    const current=weekly.get(key)||{scope_id:'lo3rwang',source_name:source,week_start:weekStart,work_count:0};
    current.work_count+=Number(row.work_count)||0;
    weekly.set(key,current);
  }
  const output=[...weekly.values()].sort((a,b)=>a.week_start.localeCompare(b.week_start)||a.source_name.localeCompare(b.source_name));
  return {rows:output,totalCount:output.length};
}

export async function selectDailyCounts(table,{startDate='',endDate='',filters=[],limit=10000,offset=0}={}){
  const result=await selectNeonRows(table,{
    columns:'day:createtime::date,work_count:count()',
    filters:[...filters,...timeFilters('createtime',startDate,endDate)],
    limit,
    offset
  });
  return result.rows.map(row=>({day:String(row.day||''),work_count:Number(row.work_count)||0}));
}

export async function selectDailyCategoryCounts(table,categoryColumn,{startDate='',endDate='',filters=[],limit=10000,offset=0}={}){
  const result=await selectNeonRows(table,{
    columns:`${categoryColumn},day:createtime::date,work_count:count()`,
    filters:[...filters,...timeFilters('createtime',startDate,endDate)],
    limit,
    offset
  });
  return result.rows.map(row=>({
    category:String(row?.[categoryColumn]||'').trim(),
    day:String(row.day||''),
    work_count:Number(row.work_count)||0
  })).filter(row=>row.category&&row.day);
}

export async function selectGalaxyPage({sourceName='',startDate='',endDate='',limit=20,offset=0}={}){
  const filters=[];
  if(sourceName)filters.push({column:'source_name',operator:'eq',value:sourceName});
  filters.push(...timeFilters('createtime',startDate,endDate));
  const publicFilters=publicContentFilters(filters);
  const totalCount=await selectNeonCount('silver.lo3rwang_galaxy',{filters:publicFilters});
  const {rows}=await selectNeonRows('silver.lo3rwang_galaxy',{
    columns:'uid,source_name,createtime,title,content',
    filters:publicFilters,
    orders:[{column:'createtime',ascending:false}],
    limit,
    offset
  });
  const ids=rows.map(row=>String(row.uid||'').trim()).filter(Boolean);
  const relations=ids.length
    ?(await selectNeonRows('silver.lo3rwang_galaxy',{
      columns:'uid,source_id,target_id',
      filters:[{column:'uid',operator:'in',value:ids}],
      limit:ids.length
    })).rows
    :[];
  const relationById=new Map(relations.map(row=>[String(row.uid),row]));
  return {
    rows:rows.map(row=>({...row,...(relationById.get(String(row.uid))||{})})),
    totalCount
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
    return (await selectNeonRows('silver.lrunes_galaxy_media',{
      columns:'media_id,title,url,media_type',
      filters:[{column:'media_id',operator:'in',value:ids}],
      limit:ids.length
    })).rows;
  }
  return (await selectNeonRows('silver.lo3rwang_galaxy_media',{
    columns:'media_id,title,url,media_type',
    filters:[{column:'media_id',operator:'in',value:ids}],
    limit:ids.length
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
    rows=(await selectNeonRows('silver.lrunes_galaxy',{
      columns:'uid,title',
      filters:[{column:'uid',operator:'in',value:ids}],
      limit:ids.length
    })).rows;
  }else{
    rows=(await selectNeonRows('silver.lo3rwang_galaxy',{
      columns:'uid,title',
      filters:[{column:'uid',operator:'in',value:ids}],
      limit:ids.length
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
