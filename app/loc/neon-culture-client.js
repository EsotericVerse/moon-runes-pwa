'use client';

import {ScopeCultureResponseSchema} from './scope-feature-contracts';
import {selectScopeTimeRows} from './scope-time';
import {selectManagedScopeIds} from './scope-list';
import {decodeCultureText,formatCultureDateTime,groupWorksByWeek} from '../modular-v2/modules/culture-timeline/culture-timeline-model.mjs';
import {workDisplayText} from '../modular-v2/work-display-model.v2';
import {selectGalaxyPage,selectSourceWeekly} from './aggregate-query';
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

function sourceLabel(value){return String(value||'').trim();}
function runtimeScopeId(scopeId){return String(scopeId||'')==='lrunes'?'lunarunes':String(scopeId||'');}
function dataScopeId(scopeId){return runtimeScopeId(scopeId)==='lunarunes'?'lrunes':runtimeScopeId(scopeId);}
function periodRows(rows){
  return (rows||[]).map(row=>({
    era_id:row.era_id||row.entry_key,period:row.period||row.entry_key||'',name:row.entry_name||row.title||row.entry_key,
    title:row.title||row.entry_key,description:row.summary||'',start_date:row.start_date||null,end_date:row.end_date||null,
    order:Number(row.order_no||0),status:row.status||'',anchor_id:row.anchor_id||null,start_anchor_id:row.start_anchor_id||null,
    end_anchor_id:row.end_anchor_id||null,date_status:row.date_status||'',open_start:Boolean(row.open_start),open_end:Boolean(row.open_end)
  })).sort((a,b)=>a.order-b.order||String(a.period).localeCompare(String(b.period)));
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
    return {...row,scope_id:scopeId,id:`${scopeId}:${row.entry_key}`,entry_id:`${scopeId}:${row.entry_key}`,start_date:start,end_date:end,date:start||end,
      display_label:row.title,group_label:`${row.scope_id} · ${kindLabel}`};
  }).filter(row=>row.start_date||(row.open_start&&row.end_date))
    .sort((a,b)=>String(a.start_date||a.end_date).localeCompare(String(b.start_date||b.end_date)));
}
function dateFilters(startDate,endDate,column='createtime'){
  const filters=[{column,operator:'gte',value:`${String(startDate).slice(0,10)}T00:00:00+08:00`}];
  if(endDate)filters.push({column,operator:'lte',value:String(endDate).slice(0,10)+'T23:59:59.999+08:00'});
  return filters;
}
export async function selectScopeCultureData(scopeId){
  const id=runtimeScopeId(scopeId);
  const dataId=dataScopeId(scopeId);
  if(!['loc','lrunes','lo3rwang'].includes(dataId))throw new Error('資料設定無效');

  const scopeIds=dataId==='loc'
    ?(await selectManagedScopeIds()).filter(scope=>scope!=='loc')
    :[dataId];
  const settled=await Promise.allSettled(scopeIds.map(async scope=>{
    const rows=await selectScopeTimeRows(scope);
    return rows.map(row=>({...row,scope_id:runtimeScopeId(scope)}));
  }));
  const scopeContext=settled
    .filter(item=>item.status==='fulfilled')
    .flatMap(item=>item.value);

  const periods=scopeContext.filter(row=>row.entry_type==='period');
  const eras=periods.map(row=>({
    ...periodRows([row])[0],
    scope_id:runtimeScopeId(row.scope_id),
    group_label:`${runtimeScopeId(row.scope_id)} 時期`
  }));
  const events=scopeContext.filter(row=>row.entry_type==='event').map(row=>({
    entry_id:row.event_id||row.entry_key,
    event_id:row.event_id||row.entry_key,
    scope_id:runtimeScopeId(row.scope_id),
    title:row.title,
    description:row.summary||'',
    date:row.start_date||null,
    start_date:row.start_date||null,
    end_date:row.end_date||null,
    status:row.status||'',
    visibility:row.visibility||'public'
  }));
  const trajectories=scopeContext.filter(row=>row.entry_type==='anchor').map(row=>({
    entry_id:row.entry_key,
    trajectory_id:row.entry_key,
    scope_id:runtimeScopeId(row.scope_id),
    title:row.title,
    description:row.summary||'',
    start_date:row.start_date||null,
    date:row.start_date||null,
    end_date:row.end_date||null,
    anchor_id:row.anchor_id||null,
    status:row.status||''
  }));

  return ScopeCultureResponseSchema.parse({
    scopeId:id,
    eras:{eras},
    periods,
    timelineItems:timelineItems(scopeContext),
    events,
    trajectories,
    works:[]
  });
}

export async function selectAuthorPeriodSourceSnapshot({startDate,endDate=null}={}){
  if(!startDate)return {groups:[],buckets:[],totalCount:0};
  const result=await selectSourceWeekly({
    scopeId:'lo3rwang',
    startDate,
    endDate:endDate||''
  });
  const groups=new Map();
  const maxima=new Map();
  let globalMaximum=0;
  let totalCount=0;
  for(const row of result.rows){
    const source=sourceLabel(row.source_name);
    if(!source)continue;
    const count=Number(row.work_count)||0;
    totalCount+=count;
    groups.set(source,(groups.get(source)||0)+count);
    maxima.set(source,Math.max(maxima.get(source)||0,count));
    globalMaximum=Math.max(globalMaximum,count);
  }
  const sourceGroups=[...groups.entries()].map(([source,itemCount])=>({
    category_key:`source:${source}`,
    category_type:'source',
    source_name:source,
    display_label:source,
    item_count:itemCount,
    work_count:itemCount,
    media_count:0
  })).sort((x,y)=>y.item_count-x.item_count||x.display_label.localeCompare(y.display_label));
  const buckets=result.rows.map(row=>{
    const source=sourceLabel(row.source_name);
    const count=Number(row.work_count)||0;
    const weekStart=String(row.week_start||'').slice(0,10);
    if(!source||!weekStart)return null;
    const weekEndDate=new Date(weekStart+'T00:00:00Z');
    weekEndDate.setUTCDate(weekEndDate.getUTCDate()+7);
    const weekEnd=weekEndDate.toISOString().slice(0,10);
    return {
      id:`source_name:${source}:${weekStart}`,
      category:source,
      group_label:source,
      week_start:weekStart,
      week_end:weekEnd,
      start_date:weekStart,
      end_date:weekEnd,
      work_count:count,
      works:[],
      density_ratio:count/Math.max(1,maxima.get(source)||1),
      global_density_ratio:count/Math.max(1,globalMaximum),
      display_label:`${source} ${count} 項`,
      title:`${weekStart} – ${weekEnd} · ${source} · ${count} 項`,
      scope_id:'classification',
      entry_type:'source',
      classification_dimension:'source',
      classification_level:'source'
    };
  }).filter(Boolean).sort((x,y)=>x.group_label.localeCompare(y.group_label)||x.week_start.localeCompare(y.week_start));
  return {groups:sourceGroups,buckets,totalCount};
}

export async function selectAuthorPeriodWorkSources({startDate,endDate=null}={}){
  return (await selectAuthorPeriodSourceSnapshot({startDate,endDate})).groups;
}

function mediaMetadataDescription(row){
  const fields=[['標題',row.title],['類型',row.media_type],['Meta Tag',row.meta_tags]];
  return fields.map(([label,value])=>{const text=decodeCultureText(value||'').trim();return text?`${label}：${text}`:'';}).filter(Boolean).join(' · ')||'沒有可讀的 metadata 文字';
}

export async function selectAuthorPeriodWorks({startDate,endDate,sourceName,categoryType='source',limit=20,pageOffset=0}={}){
  if(!startDate||!sourceName)return {rows:[],hasMore:false,nextOffset:null,totalCount:0};
  const pageSize=Math.max(1,Math.floor(Number(limit)||20));
  const offset=Math.max(0,Math.floor(Number(pageOffset)||0));
  const page=await selectGalaxyPage({sourceName:String(sourceName),startDate,endDate,limit:pageSize,offset});
  const rows=page.rows.map(row=>{
    const explicitTitle=workDisplayText(row.title||'').trim();
    return {
      key:'galaxy:'+row.uid,
      uid:row.uid,
      source_name:row.source_name,
      source_id:row.source_id||null,
      target_id:row.target_id||null,
      title:explicitTitle,
      content_preview:'',
      description:'',
      createtime:row.createtime,
      start_date:row.createtime,
      date:row.createtime,
      display_date:formatCultureDateTime(row.createtime),
      entry_id:row.uid,
      entry_type:'work',
      group_label:sourceLabel(row.source_name),
      scope_id:'lo3rwang',
      links:[]
    };
  });
  const totalCount=Number(page.totalCount)||0;
  const hasMore=offset+pageSize<totalCount;
  return {rows,hasMore,nextOffset:hasMore?offset+pageSize:null,totalCount};
}

async function selectScopeMediaRows(scopeId,{startDate,endDate}={}){
  if(!startDate)return [];
  const runtimeId=runtimeScopeId(scopeId);
  const filters=dateFilters(startDate,endDate);
  if(runtimeId==='lunarunes'){
    const result=await selectNeonAllRows('silver.lrunes_galaxy_media',{
      columns:'media_id,galaxy_link,source_native_id,media_type,title,url,meta_tags,createtime',
      filters,
      orders:[{column:'createtime',ascending:true}]
    });
    return result.rows.map(row=>({...row,record_type:'galaxy_media'}));
  }
  const result=await selectNeonAllRows('silver.lo3rwang_galaxy_media',{
    columns:'media_id,galaxy_link,source_native_id,media_type,title,url,meta_tags,createtime',
    filters,
    orders:[{column:'createtime',ascending:true}]
  });
  return result.rows.map(row=>({...row,record_type:'galaxy_media'}));
}

export async function selectScopeMediaSnapshot(scopeId,{startDate,endDate}={}){
  if(!startDate)return {groups:[],buckets:[],totalCount:0};
  const field='media_type';
  const rows=await selectScopeMediaRows(scopeId,{startDate,endDate});
  const counted=rows.filter(row=>String(row?.[field]||'').trim());
  const counts=new Map();
  for(const row of counted){
    const term=String(row[field]||'').trim();
    counts.set(term,(counts.get(term)||0)+1);
  }
  const groups=[...counts.entries()]
    .map(([term,item_count])=>({
      category_key:`media:type:${term}`,
      category_type:'media',
      media_dimension:'type',
      media_name:term,
      display_label:term,
      item_count,
      media_count:item_count
    }))
    .sort((a,b)=>b.item_count-a.item_count||a.display_label.localeCompare(b.display_label));
  const buckets=groupWorksByWeek(counted,field).map(row=>({
    ...row,
    works:[],
    scope_id:'classification',
    entry_type:'media',
    classification_dimension:'media',
    classification_level:'type'
  }));
  return {groups,buckets,totalCount:counted.length};
}

export async function selectScopeMediaWorks(scopeId,{startDate,endDate,mediaName,limit=20,pageOffset=0}={}){
  if(!startDate||!mediaName)return {rows:[],hasMore:false,nextOffset:null,totalCount:0};
  const pageSize=Math.max(1,Math.min(100,Math.floor(Number(limit)||20)));
  const offset=Math.max(0,Math.floor(Number(pageOffset)||0));
  const field='media_type';
  const rows=await selectScopeMediaRows(scopeId,{startDate,endDate});
  const matches=rows.filter(row=>String(row?.[field]||'').trim()===String(mediaName));
  matches.sort((a,b)=>String(b.createtime||'').localeCompare(String(a.createtime||'')));
  const page=matches.slice(offset,offset+pageSize).map(row=>({
    ...row,
    entry_id:row.media_id||row.record_id,
    entry_type:'media_metadata',
    start_date:row.createtime,
    date:row.createtime,
    display_date:formatCultureDateTime(row.createtime),
    title:decodeCultureText(row.title||'').trim()||row.media_type||'多媒體',
    description:mediaMetadataDescription(row),
    media_metadata_text:mediaMetadataDescription(row),
    group_label:String(row[field]||''),
    scope_id:runtimeScopeId(scopeId),
    links:row.url&&/^https?:\/\//i.test(String(row.url))
      ?[{id:'media:'+String(row.media_id||row.record_id),href:row.url,label:'媒體連結'}]
      :[]
  }));
  const hasMore=offset+pageSize<matches.length;
  return {rows:page,hasMore,nextOffset:hasMore?offset+pageSize:null,totalCount:matches.length};
}

