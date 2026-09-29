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
function sourceFilters(startDate='',endDate=''){
  return publicContentFilters(timeFilters('createtime',startDate,endDate));
}

async function selectAggregateRows(table,{columns,filters=[],orders=[]}={}){
  const baseCount=await selectNeonCount(table,{filters});
  if(!baseCount)return [];
  const output=[];
  let offset=0;
  const pageSize=1000;
  while(offset<baseCount){
    const {rows}=await selectNeonRows(table,{columns,filters,orders,limit:pageSize,offset});
    if(!rows.length)break;
    output.push(...rows);
    offset+=rows.length;
    if(rows.length<pageSize)break;
  }
  return output;
}

export async function selectSourceCatalog({scopeId='lo3rwang',startDate='',endDate='',limit=20}={}){
  const table=String(scopeId)==='lrunes'?'silver.lrunes_galaxy':'silver.lo3rwang_galaxy';
  const filters=publicContentFilters([
    ...timeFilters('createtime',startDate,endDate),
    {column:'source_name',operator:'neq',value:''}
  ]);
  const safeLimit=Math.max(1,Math.min(1000,Math.floor(Number(limit)||20)));
  const {rows}=await selectNeonRows(table,{
    columns:'source_name,work_count:count()',
    filters,
    orders:[{column:'work_count',ascending:false},{column:'source_name',ascending:true}],
    limit:safeLimit,
    offset:0
  });
  return {
    rows:rows.map(row=>({
      scope_id:String(scopeId)==='lrunes'?'lrunes':'lo3rwang',
      source_name:String(row.source_name||'').trim(),
      work_count:Number(row.work_count)||0
    })).filter(row=>row.source_name),
    totalCount:rows.length
  };
}

export async function selectSourceDaily({scopeId='lo3rwang',startDate='',endDate=''}={}){
  const table=String(scopeId)==='lrunes'?'silver.lrunes_galaxy':'silver.lo3rwang_galaxy';
  const filters=publicContentFilters([
    ...timeFilters('createtime',startDate,endDate),
    {column:'source_name',operator:'neq',value:''}
  ]);
  const rows=await selectAggregateRows(table,{
    columns:'source_name,day:createtime::date,work_count:count()',
    filters,
    orders:[{column:'day',ascending:true},{column:'source_name',ascending:true}]
  });
  return rows.map(row=>({
    scope_id:String(scopeId)==='lrunes'?'lrunes':'lo3rwang',
    source_name:String(row.source_name||'').trim(),
    day:String(row.day||''),
    work_count:Number(row.work_count)||0
  }));
}

export async function selectDailyCounts(table,{startDate='',endDate='',filters=[]}={}){
  const resolved=[...filters,...timeFilters('createtime',startDate,endDate)];
  const rows=await selectAggregateRows(table,{
    columns:'day:createtime::date,work_count:count()',
    filters:resolved,
    orders:[{column:'day',ascending:true}]
  });
  return rows.map(row=>({day:String(row.day||''),work_count:Number(row.work_count)||0}));
}

export async function selectDailyCategoryCounts(table,categoryColumn,{startDate='',endDate='',filters=[]}={}){
  const resolved=[
    ...filters,
    ...timeFilters('createtime',startDate,endDate),
    {column:categoryColumn,operator:'neq',value:''}
  ];
  const rows=await selectAggregateRows(table,{
    columns:`${categoryColumn},day:createtime::date,work_count:count()`,
    filters:resolved,
    orders:[{column:'day',ascending:true},{column:categoryColumn,ascending:true}]
  });
  return rows.map(row=>({
    category:String(row?.[categoryColumn]||'').trim(),
    day:String(row.day||''),
    work_count:Number(row.work_count)||0
  })).filter(row=>row.category&&row.day);
}

export async function selectCategoryCounts(table,categoryColumn,{startDate='',endDate='',filters=[],limit=20}={}){
  const resolved=[
    ...filters,
    ...timeFilters('createtime',startDate,endDate),
    {column:categoryColumn,operator:'neq',value:''}
  ];
  const safeLimit=Math.max(1,Math.min(1000,Math.floor(Number(limit)||20)));
  const {rows}=await selectNeonRows(table,{
    columns:`${categoryColumn},item_count:count()`,
    filters:resolved,
    orders:[{column:'item_count',ascending:false},{column:categoryColumn,ascending:true}],
    limit:safeLimit,
    offset:0
  });
  return rows.map(row=>({
    term:String(row?.[categoryColumn]||'').trim(),
    item_count:Number(row.item_count)||0
  })).filter(row=>row.term);
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
