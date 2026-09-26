'use client';

import {ScopeCultureResponseSchema} from './scope-feature-contracts';
import {selectNeonRows} from './neon-repository';
import {selectScopeTimeRows} from './scope-time';
import {decodeCultureText,formatCultureDateTime} from '../modular-v2/modules/culture-timeline/culture-timeline-model.mjs';

function sourceLabel(value){return String(value||'').trim();}
function runtimeScopeId(scopeId){return String(scopeId||'')==='lrunes'?'lunarunes':String(scopeId||'');}
function dataScopeId(scopeId){return runtimeScopeId(scopeId)==='lunarunes'?'lrunes':runtimeScopeId(scopeId);}
function periodRows(rows){
  return (rows||[]).map(row=>({
    era_id:row.era_id||row.entry_key,period:row.period||row.entry_key||'',name:row.entry_name||row.title||row.entry_key,
    title:row.title||row.entry_key,description:row.summary||'',start_date:row.start_date||null,end_date:row.end_date||null,
    order:Number(row.order_no||0),status:row.status||'',anchor_id:row.anchor_id||null,start_anchor_id:row.start_anchor_id||null,
    end_anchor_id:row.end_anchor_id||null,date_status:row.date_status||''
  })).sort((a,b)=>a.order-b.order||String(a.period).localeCompare(String(b.period)));
}
function runeTimelineRows(rows){
  const periods=periodRows((rows||[]).filter(row=>row.entry_type==='period'))
    .map(row=>({...row,scope_id:'lunarunes'}));
  const current=periods.find(row=>String(row.status).trim().toLowerCase()==='current');
  return {
    eras:current?[current]:[],
    history:periods.filter(row=>row!==current).map(row=>({...row,status:'history'}))
  };
}
function timelineItems(rows){
  const all=Array.isArray(rows)?rows:[];
  const anchors=new Map(all.filter(row=>row.entry_type==='anchor').map(row=>[`${row.scope_id}:${row.anchor_id}`,row]));
  return all.filter(row=>['anchor','event','period'].includes(row.entry_type)).map(row=>{
    const startAnchor=anchors.get(`${row.scope_id}:${row.start_anchor_id}`);
    const endAnchor=anchors.get(`${row.scope_id}:${row.end_anchor_id}`);
    const start=row.start_date||startAnchor?.start_date||null;
    const end=row.end_date||endAnchor?.start_date||null;
    const kindLabel={anchor:'定錨點',event:'事件',period:'時期'}[row.entry_type];
    const scopeId=runtimeScopeId(row.scope_id);
    return {...row,scope_id:scopeId,id:`${scopeId}:${row.entry_key}`,entry_id:`${scopeId}:${row.entry_key}`,start_date:start,end_date:end,date:start,
      display_label:row.title,group_label:`${row.scope_id} · ${kindLabel}`};
  }).filter(row=>row.start_date).sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date)));
}
function dateFilters(startDate,endDate){
  const filters=[{column:'created_at',operator:'gte',value:`${String(startDate).slice(0,10)}T00:00:00+08:00`}];
  if(endDate)filters.push({column:'created_at',operator:'lte',value:String(endDate).slice(0,10)+'T23:59:59.999+08:00'});
  return filters;
}
async function selectAllRows(table,{columns,filters=[]}){
  const rows=[];let offset=0;
  while(true){
    const result=await selectNeonRows(table,{columns,filters,range:[offset,offset+4999]});
    rows.push(...result.rows);
    if(result.rows.length<5000)break;
    offset+=result.rows.length;
  }
  return rows;
}

export async function selectScopeCultureData(scopeId){
  const id=runtimeScopeId(scopeId);
  const dataId=dataScopeId(scopeId);
  if(!['loc','lrunes','lo3rwang'].includes(dataId))throw new Error('Scope 無效');
  const [authorContext,runeContext]=await Promise.all([
    dataId==='loc'||dataId==='lo3rwang'?selectScopeTimeRows('lo3rwang').then(rows=>rows.map(row=>({...row,scope_id:'lo3rwang'}))):Promise.resolve([]),
    dataId==='loc'||dataId==='lrunes'?selectScopeTimeRows('lrunes').then(rows=>rows.map(row=>({...row,scope_id:'lrunes'}))):Promise.resolve([])
  ]);
  const scopeContext=[...authorContext,...runeContext];
  const eraSource=authorContext.filter(row=>row.entry_type==='period');
  const runeTimeline=runeTimelineRows(runeContext);
  const eras=periodRows(eraSource);
  const contextEvents=dataId==='lo3rwang'?authorContext.filter(row=>row.entry_type==='event').map(row=>({
    entry_id:row.event_id||row.entry_key,event_id:row.event_id||row.entry_key,title:row.title,description:row.summary||'',date:row.start_date||null,
    start_date:row.start_date||null,end_date:row.end_date||null,status:row.status||'',visibility:row.visibility||'public'
  })):[];
  const contextAnchors=dataId==='lo3rwang'?authorContext.filter(row=>row.entry_type==='anchor').map(row=>({
    entry_id:row.entry_key,trajectory_id:row.entry_key,title:row.title,description:row.summary||'',start_date:row.start_date||null,date:row.start_date||null,
    end_date:row.end_date||null,anchor_id:row.anchor_id||null,status:row.status||''
  })):[];
  const authorPeriods=eras.map(row=>({...row,scope_id:'lo3rwang',group_label:'lo3rwang 時期'}));
  return ScopeCultureResponseSchema.parse({
    scopeId:id,eras:{eras:dataId==='lrunes'?runeTimeline.eras:(dataId==='loc'?authorPeriods:eras)},
    authorEras:dataId==='lo3rwang'||dataId==='loc'?{eras:dataId==='loc'?authorPeriods:eras}:undefined,
    runeEras:{eras:runeTimeline.eras},runeHistory:{records:runeTimeline.history},periods:eraSource,timelineItems:timelineItems(scopeContext),
    events:contextEvents,trajectories:contextAnchors,works:[],authorKeywords:{keywords:[]},musicPeriods:{periods:[]},writingPeriods:{periods:[]}
  });
}

export async function selectAuthorPeriodWorkSources({startDate,endDate=null}={}){
  if(!startDate)return [];
  const filters=dateFilters(startDate,endDate);
  const [workRows,mediaRows]=await Promise.all([
    selectAllRows('silver.lo3rwang_galaxy',{columns:'source_name',filters}),
    selectAllRows('silver.lo3rwang_galaxy_media',{columns:'source_name',filters})
  ]);
  const counts=new Map();
  const add=(row,kind)=>{
    const source=sourceLabel(row.source_name);
    if(!source)return;
    const current=counts.get(source)||{item_count:0,work_count:0,media_count:0};
    current.item_count+=1;
    if(kind==='media')current.media_count+=1;
    else current.work_count+=1;
    counts.set(source,current);
  };
  for(const row of workRows)add(row,'work');
  for(const row of mediaRows)add(row,'media');
  return [...counts.entries()].map(([source,count])=>({
    category_key:`source:${source}`,
    category_type:'source',
    source_name:source,
    display_label:source,
    ...count
  })).sort((a,b)=>b.item_count-a.item_count||a.display_label.localeCompare(b.display_label));
}

function mediaMetadataDescription(row){
  const fields=[['標題',row.title],['類型',row.media_type],['來源',row.source_name],['曲風分類',row.style_tags],['補充描述',row.meta_tags]];
  return fields.map(([label,value])=>{const text=decodeCultureText(value||'').trim();return text?`${label}：${text}`:'';}).filter(Boolean).join(' · ')||'沒有可讀的 metadata 文字';
}

export async function selectAuthorPeriodWorks({startDate,endDate,sourceName,categoryType='source',limit=20,pageOffset=0}={}){
  if(!startDate||!sourceName)return {rows:[],hasMore:false,nextOffset:null};
  const pageSize=Math.max(1,Math.min(100,Math.floor(Number(limit)||20)));
  const offset=Math.max(0,Math.floor(Number(pageOffset)||0));
  const filters=[...dateFilters(startDate,endDate),{column:'source_name',operator:'eq',value:String(sourceName)}];
  const fetchSize=offset+pageSize+1;
  const [workResult,mediaResult]=await Promise.all([
    selectNeonRows('silver.lo3rwang_galaxy',{
      columns:'galaxy_id,category,content_type,source_name,source_type,source_role,title,content,meta_tags,content_hash,created_at,source_ref,url,source_id,target_id,ref_id',
      filters,orders:[{column:'created_at',ascending:false}],range:[0,fetchSize-1]
    }),
    selectNeonRows('silver.lo3rwang_galaxy_media',{
      columns:'media_id,source_name,source_type,source_native_id,media_type,title,url,media_link,meta_tags,style_tags,created_at',
      filters,orders:[{column:'created_at',ascending:false}],range:[0,fetchSize-1]
    })
  ]);
  const workRows=workResult.rows.map(row=>{
    const content=decodeCultureText(row.content||'');
    return {...row,start_date:row.created_at,date:row.created_at,display_date:formatCultureDateTime(row.created_at),entry_id:row.galaxy_id,entry_type:'work',
      title:decodeCultureText(row.title||'').trim()||content.trim().slice(0,72)||row.source_name||row.galaxy_id,
      description:content.trim().slice(0,400),group_label:sourceLabel(row.source_name),scope_id:'lo3rwang'};
  });
  const mediaRows=mediaResult.rows.map(row=>({...row,entry_id:row.media_id,entry_type:'media_metadata',start_date:row.created_at,date:row.created_at,
    display_date:formatCultureDateTime(row.created_at),title:decodeCultureText(row.title||'').trim()||'多媒體項目',description:'',
    media_metadata_text:mediaMetadataDescription(row),group_label:sourceLabel(row.source_name),scope_id:'lo3rwang'}));
  const merged=[...workRows,...mediaRows].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const rows=merged.slice(offset,offset+pageSize);
  const hasMore=merged.length>offset+pageSize||workResult.rows.length===fetchSize||mediaResult.rows.length===fetchSize;
  return {rows,hasMore,nextOffset:hasMore?offset+pageSize:null};
}
