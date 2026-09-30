'use client';

import {NEON_QUERY_BATCH_SIZE} from './query-contract.mjs';

import {isReferenceOnlyResource,publicContentFilters} from './content-policy';
import {selectNeonCount,selectNeonRows} from './neon-query';
import {resolveScopeTables} from './scope-table-mapping';

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
function sourceFilters(startDate='',endDate=''){
  return publicContentFilters(timeFilters('createtime',startDate,endDate));
}

async function selectAggregateRows(table,{columns,filters=[],orders=[]}={}){
  const output=[];
  let offset=0;
  const pageSize=NEON_QUERY_BATCH_SIZE;
  while(true){
    const {rows}=await selectNeonRows(table,{columns,filters,orders,limit:pageSize,offset});
    if(!rows.length)break;
    output.push(...rows);
    offset+=rows.length;
    if(rows.length<pageSize)break;
  }
  return output;
}

export async function selectSourceCatalog({scopeId,startDate='',endDate='',limit=20}={}){
  if(!scopeId)throw new Error('scopeId is required');
  const {galaxy:table}=await resolveScopeTables(scopeId);
  const filters=publicContentFilters([
    ...timeFilters('createtime',startDate,endDate),
    {column:'source_name',operator:'neq',value:''}
  ]);
  const safeLimit=Math.max(1,Math.min(NEON_QUERY_BATCH_SIZE,Math.floor(Number(limit)||20)));
  const {rows}=await selectNeonRows(table,{
    columns:'source_name,item_count:count()',
    filters,
    orders:[{column:'source_name',ascending:true}],
    limit:safeLimit,
    offset:0
  });
  const normalized=rows.map(row=>({
    scope_id:String(scopeId),
    source_name:String(row.source_name||'').trim(),
    item_count:Number(row.item_count)||0
  })).filter(row=>row.source_name)
    .sort((a,b)=>b.item_count-a.item_count||a.source_name.localeCompare(b.source_name));
  return {
    rows:normalized,
    totalCount:normalized.length
  };
}

export async function selectSourceDaily({scopeId='',startDate='',endDate=''}={}){
  if(!String(scopeId||'').trim())throw new Error('Scope ID 無效');
  const {galaxy:table}=await resolveScopeTables(scopeId);
  const filters=publicContentFilters([
    ...timeFilters('createtime',startDate,endDate),
    {column:'source_name',operator:'neq',value:''}
  ]);
  const rows=await selectAggregateRows(table,{
    columns:'source_name,day:createtime::date,item_count:count()',
    filters
  });
  return rows.map(row=>({
    scope_id:String(scopeId),
    source_name:String(row.source_name||'').trim(),
    day:String(row.day||''),
    item_count:Number(row.item_count)||0
  })).sort((a,b)=>a.day.localeCompare(b.day)||a.source_name.localeCompare(b.source_name));
}

export async function selectDailyCounts(table,{startDate='',endDate='',filters=[]}={}){
  const resolved=[...filters,...timeFilters('createtime',startDate,endDate)];
  const rows=await selectAggregateRows(table,{
    columns:'day:createtime::date,item_count:count()',
    filters:resolved
  });
  return rows.map(row=>({day:String(row.day||''),item_count:Number(row.item_count)||0}))
    .sort((a,b)=>a.day.localeCompare(b.day));
}

export async function selectDailyCategoryCounts(table,categoryColumn,{startDate='',endDate='',filters=[],includeEmpty=false,includeUndated=false}={}){
  const resolved=[
    ...filters,
    ...timeFilters('createtime',startDate,endDate),
    ...(!includeEmpty?[{column:categoryColumn,operator:'neq',value:''}]:[])
  ];
  const rows=await selectAggregateRows(table,{
    columns:`${categoryColumn},day:createtime::date,item_count:count()`,
    filters:resolved
  });
  return rows.map(row=>({
    category:String(row?.[categoryColumn]||'').trim(),
    day:String(row.day||''),
    item_count:Number(row.item_count)||0
  })).filter(row=>(includeUndated||row.day)&&(includeEmpty||row.category))
    .sort((a,b)=>a.day.localeCompare(b.day)||a.category.localeCompare(b.category));
}

export async function selectCategoryCounts(table,categoryColumn,{startDate='',endDate='',filters=[],limit=20}={}){
  const resolved=[
    ...filters,
    ...timeFilters('createtime',startDate,endDate),
    {column:categoryColumn,operator:'neq',value:''}
  ];
  const safeLimit=Math.max(1,Math.min(NEON_QUERY_BATCH_SIZE,Math.floor(Number(limit)||20)));
  const {rows}=await selectNeonRows(table,{
    columns:`${categoryColumn},item_count:count()`,
    filters:resolved,
    orders:[{column:categoryColumn,ascending:true}],
    limit:safeLimit,
    offset:0
  });
  return rows.map(row=>({
    term:String(row?.[categoryColumn]||'').trim(),
    item_count:Number(row.item_count)||0
  })).filter(row=>row.term)
    .sort((a,b)=>b.item_count-a.item_count||a.term.localeCompare(b.term));
}

export async function selectGalaxyPage({scopeId,sourceName='',startDate='',endDate='',limit=20,offset=0}={}){
  if(!scopeId)throw new Error('scopeId is required');
  const {galaxy:table}=await resolveScopeTables(scopeId);
  const filters=[];
  if(sourceName)filters.push({column:'source_name',operator:'eq',value:sourceName});
  filters.push(...timeFilters('createtime',startDate,endDate));
  const publicFilters=publicContentFilters(filters);
  const {rows,count}=await selectNeonRows(table,{
    columns:'uid,source_name,createtime,title,url,source_id,target_id,media_link',
    filters:publicFilters,
    orders:[{column:'createtime',ascending:false},{column:'uid',ascending:true}],
    limit,
    offset,
    count:'exact'
  });
  return {
    rows:await resolveGalaxyExternalLinks(scopeId,rows),
    totalCount:Number(count)||rows.length
  };
}

function mediaIdsOf(value){
  return [...new Set((Array.isArray(value)?value:[]).map(item=>String(item||'').trim()).filter(Boolean))];
}

async function mediaRowsFor(scopeId,mediaIds=[]){
  const ids=[...new Set(mediaIds.map(String).filter(Boolean))];
  if(!ids.length)return [];
  const {galaxyMedia}=await resolveScopeTables(scopeId);
  return (await selectNeonRows(galaxyMedia,{
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

export async function resolveGalaxyExternalLinks(scopeId,rows=[]){
  const source=Array.isArray(rows)?rows:[];
  if(!source.length)return [];
  const ids=[...new Set(source.flatMap(row=>mediaIdsOf(row?.media_link)))];
  const mediaRows=await mediaRowsFor(scopeId,ids);
  const mediaById=new Map(mediaRows.map(item=>[String(item.media_id),item]));
  return source.map(row=>({...row,resolved_links:resolvedLinks(row,mediaById)}));
}

export async function selectGalaxySummaries(scopeId,uids=[]){
  const ids=[...new Set((uids||[]).map(value=>String(value||'').trim()).filter(Boolean))];
  if(!ids.length)return [];
  const {galaxy}=await resolveScopeTables(scopeId);
  const rows=(await selectNeonRows(galaxy,{
    columns:'uid,title',
    filters:[{column:'uid',operator:'in',value:ids}],
    limit:ids.length
  })).rows;
  return rows.map(row=>({uid:row.uid,title:row.title||'',excerpt:'',links:[]}));
}

export async function selectGalaxyContent(scopeId,uid){
  const id=String(uid||'').trim();
  if(!id)return null;
  const {galaxy}=await resolveScopeTables(scopeId);
  return selectNeonRowById(galaxy,{idColumn:'uid',id,columns:'uid,content'});
}

export async function selectGalaxyIdentity(scopeId,uid){
  const id=String(uid||'').trim();
  if(!id)return null;
  const {galaxy:table}=await resolveScopeTables(scopeId);
  const row=await selectNeonRowById(table,{
    idColumn:'uid',
    id,
    columns:'uid,title,reference_only,source_name,createtime,url,source_id,target_id,media_link'
  });
  if(!row||isReferenceOnlyResource(row))return null;
  const contentRow=await selectGalaxyContent(scopeId,id);
  const mediaRows=await mediaRowsFor(scopeId,mediaIdsOf(row.media_link));
  const mediaById=new Map(mediaRows.map(item=>[String(item.media_id),item]));
  return {...row,content:contentRow?.content||'',links:resolvedLinks(row,mediaById)};
}
