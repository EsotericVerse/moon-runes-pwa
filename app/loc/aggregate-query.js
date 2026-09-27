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
async function selectSourceRows({startDate='',endDate='',excludedIds=[]}={}){
  const result=await selectNeonAllRows('silver.lo3rwang_galaxy',{
    columns:'uid,source_name,createtime',
    filters:timeFilters('createtime',startDate,endDate)
  });
  const excluded=new Set((excludedIds||[]).map(value=>String(value||'')).filter(Boolean));
  return excluded.size?result.rows.filter(row=>!excluded.has(String(row.uid||''))):result.rows;
}

export async function selectSourceCatalog({scopeId='lo3rwang',limit=null,offset=0,excludedIds=[]}={}){
  if(String(scopeId)!=='lo3rwang')return {rows:[],totalCount:0};
  const rows=await selectSourceRows({excludedIds});
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

export async function selectSourceWeekly({scopeId='lo3rwang',startDate='',endDate='',limit=null,offset=0,excludedIds=[]}={}){
  if(String(scopeId)!=='lo3rwang')return {rows:[],totalCount:0};
  const rows=await selectSourceRows({startDate,endDate,excludedIds});
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
    columns:'uid,source_name,createtime,title',
    filters,
    orders:[{column:'createtime',ascending:false}],
    limit,
    offset,
    count:'exact'
  });
  return {rows,totalCount:Number(count??rows.length)||0};
}

function mediaIdsOf(value){
  return [...new Set((Array.isArray(value)?value:[]).map(item=>String(item||'').trim()).filter(Boolean))];
}

async function mediaRowsFor(scopeId,mediaIds=[]){
  const ids=[...new Set(mediaIds.map(String).filter(Boolean))];
  if(!ids.length)return [];
  const lunarunes=String(scopeId||'')==='lunarunes'||String(scopeId||'')==='lrunes';
  if(lunarunes){
    return (await selectNeonAllRows('silver.lrunes',{
      columns:'record_id,media_id,title,url,media_type',
      filters:[
        {column:'record_type',operator:'eq',value:'galaxy_media'},
        {column:'media_id',operator:'in',value:ids}
      ]
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
  const rows=(await Promise.all(ids.map(id=>selectNeonRowById(lunarunes?'silver.lrunes':'silver.lo3rwang_galaxy',{
    idColumn:'uid',
    id,
    columns:lunarunes?'record_id,record_type,uid,title,content,url,media_link':'uid,title,content,url,media_link'
  })))).filter(row=>row&&(!lunarunes||row.record_type==='galaxy'));
  const mediaRows=await mediaRowsFor(lunarunes?'lunarunes':'lo3rwang',rows.flatMap(row=>mediaIdsOf(row.media_link)));
  const mediaById=new Map(mediaRows.map(row=>[String(row.media_id),row]));
  return rows.map(row=>({
    uid:row.uid,
    title:row.title||'',
    excerpt:String(row.content||'').replace(/\s+/g,' ').trim().slice(0,600),
    links:resolvedLinks(row,mediaById)
  }));
}

export async function selectGalaxyIdentity(scopeId,uid){
  const id=String(uid||'').trim();
  if(!id)return null;
  const lunarunes=String(scopeId||'')==='lunarunes'||String(scopeId||'')==='lrunes';
  const row=await selectNeonRowById(lunarunes?'silver.lrunes':'silver.lo3rwang_galaxy',{
    idColumn:'uid',
    id,
    columns:lunarunes
      ?'record_id,uid,title,content,source_name,createtime,url,source_id,target_id,ref_id,media_link,record_type'
      :'uid,title,content,source_name,createtime,url,source_id,target_id,ref_id,media_link'
  });
  if(!row||lunarunes&&row.record_type!=='galaxy')return null;
  const mediaRows=await mediaRowsFor(lunarunes?'lunarunes':'lo3rwang',mediaIdsOf(row.media_link));
  const mediaById=new Map(mediaRows.map(item=>[String(item.media_id),item]));
  return {...row,links:resolvedLinks(row,mediaById)};
}
