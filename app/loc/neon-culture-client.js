'use client';

import {ScopeCultureResponseSchema} from './scope-feature-contracts';
import {selectNeonRows} from './neon-repository';
import {selectScopeTimeRows} from './scope-time';
import {decodeCultureText,formatCultureDateTime} from '../modular-v2/modules/culture-timeline/culture-timeline-model.mjs';

const MEDIA_METADATA_CATEGORY_KEY='media_metadata';
const SOURCE_LABELS={threads:'Threads',facebook:'Facebook',suno:'Suno',pixnet:'Pixnet',ptt:'PTT',kkcity:'KKCity',wretch:'Wretch',vocus:'Vocus',instagram:'Instagram',youtube:'YouTube'};

function sourceLabel(value){const source=String(value||'').trim();return SOURCE_LABELS[source.toLowerCase()]||source;}
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
  const anchors=(rows||[]).map(row=>({
    id:row.entry_key,entry_id:row.entry_key,era_id:row.entry_key,period:row.title||row.entry_key,name:row.title||row.entry_key,title:row.title||row.entry_key,
    description:row.summary||'',date:row.start_date||null,start_date:row.start_date||null,end_date:null,scope_id:'lunarunes',
    status:row.status||'',rune_count:Number(row.rune_count||0)
  })).filter(row=>row.start_date).sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date)));
  const current=anchors.find(row=>String(row.status).trim().toLowerCase()==='current');
  return {eras:current?[{...current,period:'符文66',name:'符文66',title:'符文66',status:'current'}]:[],history:anchors.filter(row=>row!==current).map(row=>({...row,status:'history'}))};
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
async function readRuneEvolution(){
  const {rows}=await selectNeonRows('silver.lrunes',{
    columns:'record_id,title,start_date,status,rune_count',
    filters:[{column:'record_type',operator:'eq',value:'evolution'}],
    orders:[{column:'start_date',ascending:true}],
    limit:100
  });
  return rows.map(row=>({
    entry_key:row.record_id,entry_type:'anchor',title:row.title,summary:'',
    start_date:row.start_date,end_date:null,status:row.status||'',
    rune_count:row.rune_count,scope_id:'lrunes'
  }));
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
    dataId==='loc'||dataId==='lrunes'?readRuneEvolution():Promise.resolve([])
  ]);
  const scopeContext=[...authorContext,...runeContext];
  const runeAnchors=runeContext.filter(row=>row.entry_type==='anchor');
  const eraSource=authorContext.filter(row=>row.entry_type==='period');
  const runeTimeline=runeTimelineRows(runeAnchors);
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
  const [workRows,mediaCountResult]=await Promise.all([
    selectAllRows('silver.lo3rwang_galaxy',{columns:'source_platform',filters}),
    selectNeonRows('silver.lo3rwang_galaxy_media',{columns:'media_id',filters,count:'exact',limit:1})
  ]);
  const counts=new Map();
  for(const row of workRows){
    const source=String(row.source_platform||'未標示來源');
    counts.set(source,(counts.get(source)||0)+1);
  }
  const groups=[...counts.entries()].map(([source,item_count])=>({category_key:`source:${source}`,category_type:'work',source_platform:source,display_label:sourceLabel(source),item_count}))
    .sort((a,b)=>b.item_count-a.item_count||a.display_label.localeCompare(b.display_label));
  const mediaCount=Number(mediaCountResult.count)||0;
  if(mediaCount>0)groups.push({category_key:MEDIA_METADATA_CATEGORY_KEY,category_type:'media',source_platform:'多媒體',display_label:'多媒體',item_count:mediaCount});
  return groups;
}

function mediaMetadataDescription(row){
  const fields=[['標題',row.title],['類型',row.media_type],['平台',row.source_platform],['曲風分類',row.style_tags],['補充描述',row.meta_tags]];
  return fields.map(([label,value])=>{const text=decodeCultureText(value||'').trim();return text?`${label}：${text}`:'';}).filter(Boolean).join(' · ')||'沒有可讀的 metadata 文字';
}

export async function selectAuthorPeriodWorks({startDate,endDate,sourcePlatform,categoryType='work',limit=20,pageOffset=0}={}){
  if(!startDate)return {rows:[],hasMore:false,nextOffset:null};
  const pageSize=Math.max(1,Math.min(100,Math.floor(Number(limit)||20)));
  const offset=Math.max(0,Math.floor(Number(pageOffset)||0));
  const filters=dateFilters(startDate,endDate);
  if(categoryType==='media'){
    const result=await selectNeonRows('silver.lo3rwang_galaxy_media',{
      columns:'media_id,source_platform,source_native_id,media_type,title,url,media_link,meta_tags,style_tags,created_at',
      filters,orders:[{column:'created_at',ascending:false}],range:[offset,offset+pageSize-1]
    });
    return {rows:result.rows.map(row=>({...row,entry_id:row.media_id,entry_type:'media_metadata',start_date:row.created_at,date:row.created_at,
      display_date:formatCultureDateTime(row.created_at),title:decodeCultureText(row.title||'').trim()||'多媒體項目',description:'',
      media_metadata_text:mediaMetadataDescription(row),group_label:'多媒體',scope_id:'lo3rwang'})),
      hasMore:result.rows.length===pageSize,nextOffset:result.rows.length===pageSize?offset+pageSize:null};
  }
  if(sourcePlatform)filters.push({column:'source_platform',operator:'eq',value:String(sourcePlatform)});
  const result=await selectNeonRows('silver.lo3rwang_galaxy',{
    columns:'galaxy_id,category,content_type,source_platform,source_role,title,content,meta_tags,content_hash,created_at,source_ref,url,source_id,target_id,ref_id',
    filters,orders:[{column:'created_at',ascending:false}],range:[offset,offset+pageSize-1]
  });
  return {rows:result.rows.map(row=>{
    const content=decodeCultureText(row.content||'');
    return {...row,start_date:row.created_at,date:row.created_at,display_date:formatCultureDateTime(row.created_at),entry_id:row.galaxy_id,
      title:decodeCultureText(row.title||'').trim()||content.trim().slice(0,72)||row.source_platform||row.galaxy_id,
      description:content.trim().slice(0,400),group_label:sourceLabel(row.source_platform)||'未標示來源',scope_id:'lo3rwang'};
  }),hasMore:result.rows.length===pageSize,nextOffset:result.rows.length===pageSize?offset+pageSize:null};
}
