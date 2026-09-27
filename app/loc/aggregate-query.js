'use client';

import {selectNeonAllRows,selectNeonRowById,selectNeonRows} from './neon-repository';

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
async function selectSourceRows({startDate='',endDate=''}={}){
  const result=await selectNeonAllRows('silver.lo3rwang_galaxy',{
    columns:'galaxy_id,source_name,createtime',
    filters:timeFilters('createtime',startDate,endDate)
  });
  return result.rows;
}

export async function selectSourceCatalog({scopeId='lo3rwang',limit=null,offset=0}={}){
  if(String(scopeId)!=='lo3rwang')return {rows:[],totalCount:0};
  const rows=await selectSourceRows();
  const map=new Map();
  for(const row of rows){
    const source=String(row.source_name||'').trim();
    if(!source)continue;
    const current=map.get(source)||{scope_id:'lo3rwang',source_name:source,work_count:0};
    current.work_count+=1;
    map.set(source,current);
  }
  const all=[...map.values()].sort((a,b)=>b.work_count-a.work_count||a.source_name.localeCompare(b.source_name));
  const start=Math.max(0,Math.floor(Number(offset)||0));
  const bounded=limit!==null&&limit!==undefined&&Number.isFinite(Number(limit));
  const page=bounded?all.slice(start,start+Math.max(0,Math.floor(Number(limit)||0))):all;
  return {rows:page,totalCount:all.length};
}

export async function selectSourceWeekly({scopeId='lo3rwang',startDate='',endDate='',limit=null,offset=0}={}){
  if(String(scopeId)!=='lo3rwang')return {rows:[],totalCount:0};
  const rows=await selectSourceRows({startDate,endDate});
  const map=new Map();
  for(const row of rows){
    const source=String(row.source_name||'').trim();
    const weekStart=mondayOf(row.createtime);
    if(!source||!weekStart)continue;
    const key=source+'|'+weekStart;
    const current=map.get(key)||{scope_id:'lo3rwang',source_name:source,week_start:weekStart,work_count:0};
    current.work_count+=1;
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
    columns:'galaxy_id,source_name,createtime,title',
    filters,
    orders:[{column:'createtime',ascending:false}],
    limit,
    offset,
    count:'exact'
  });
  return {rows,totalCount:Number(count??rows.length)||0};
}

export async function selectGalaxySummaries(galaxyIds=[]){
  const ids=[...new Set((galaxyIds||[]).map(value=>String(value||'').trim()).filter(Boolean))];
  if(!ids.length)return [];
  const rows=await Promise.all(ids.map(id=>selectNeonRowById('silver.lo3rwang_galaxy',{
    idColumn:'galaxy_id',
    id,
    columns:'galaxy_id,title,content'
  })));
  return rows.filter(Boolean).map(row=>({
    galaxy_id:row.galaxy_id,
    title:row.title||'',
    excerpt:String(row.content||'').replace(/\s+/g,' ').trim().slice(0,600)
  }));
}
