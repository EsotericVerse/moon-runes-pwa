'use client';

import {ScopeCultureResponseSchema} from './scope-feature-contracts';
import {decodeCultureText,formatCultureDateTime} from '../modular-v2/modules/culture-timeline/culture-timeline-model.mjs';
import {workDisplayText} from '../modular-v2/work-display-model.v2';
import {selectCategoryCounts,selectDailyCategoryCounts,selectDailyCounts,selectGalaxyPage,selectSourceCatalog,selectSourceDaily} from './aggregate-query';
import {selectAllNeonRows,selectNeonCount,selectNeonRows} from './neon-query';
import {publicContentFilters} from './content-policy';
import {resolveScopeTables} from './scope-table-mapping';



const TIME_COLUMNS='record_id,record_type,label,resource_id,display_order,status,note,time_date,anchor_pair,date_status,year_value,visibility';
function timeDate(row){
  if(row?.time_date)return String(row.time_date).slice(0,10);
  const year=Number(row?.year_value);
  return String(row?.date_status||'')==='year_only'&&Number.isInteger(year)&&year>0?`${year}-01-01`:null;
}
function anchorPair(value){
  const [before='0',after='0']=String(value||'0,0').split(',',2).map(item=>String(item||'0').trim()||'0');
  return {before,after};
}
function previousDay(value){
  if(!value)return null;
  const date=new Date(String(value).slice(0,10)+'T00:00:00Z');
  date.setUTCDate(date.getUTCDate()-1);
  return date.toISOString().slice(0,10);
}
async function selectCultureTimeRows(scopeId,tableName=''){
  const table=tableName||(await resolveScopeTables(scopeId)).time;
  const {rows}=await selectNeonRows(table,{
    columns:TIME_COLUMNS,
    filters:[{column:'record_type',operator:'in',value:['anchor','period','event']}],
    orders:[{column:'display_order',ascending:true},{column:'record_id',ascending:true}],
    limit:5000,
    offset:0
  });
  const anchors=rows.filter(row=>row.record_type==='anchor');
  const periods=rows.filter(row=>row.record_type==='period');
  const events=rows.filter(row=>row.record_type==='event');
  const anchorMap=new Map(anchors.filter(row=>row.resource_id).map(row=>[String(row.resource_id),row]));
  const normalize=(row,type)=>{
    const id=String(row.resource_id||row.record_id||'');
    const pair=anchorPair(row.anchor_pair);
    const startAnchor=pair.before==='0'?null:anchorMap.get(pair.before);
    const endAnchor=pair.after==='0'?null:anchorMap.get(pair.after);
    const startDate=type==='anchor'?timeDate(row):timeDate(startAnchor);
    const endBoundary=type==='anchor'?null:timeDate(endAnchor);
    return {
      ...row,
      scope_id:scopeId,
      entry_key:type+':'+id,
      entry_type:type,
      title:row.label||id,
      summary:row.note||'',
      era_id:type==='period'?id:null,
      period:type==='period'?id:null,
      entry_name:type==='period'?String(row.label||'').replace(/^P\\d+\\s*[｜|]\\s*/,''):null,
      order_no:row.display_order,
      anchor_id:type==='anchor'?id:null,
      start_anchor_id:pair.before==='0'?null:pair.before,
      end_anchor_id:pair.after==='0'?null:pair.after,
      event_id:type==='event'?id:null,
      open_start:type!=='anchor'&&pair.before==='0'&&pair.after!=='0',
      open_end:type!=='anchor'&&pair.before!=='0'&&pair.after==='0',
      start_date:startDate,
      end_date:type==='period'?previousDay(endBoundary):endBoundary
    };
  };
  return [
    ...anchors.map(row=>normalize(row,'anchor')),
    ...periods.map(row=>normalize(row,'period')),
    ...events.map(row=>normalize(row,'event'))
  ];
}

function currentPeriodRangeFromRows(scopeId,rows=[]){
  const period=[...rows]
    .filter(row=>row.entry_type==='period'&&row.open_end&&row.start_date)
    .sort((a,b)=>Number(b.order_no||0)-Number(a.order_no||0))[0];
  if(!period)return null;
  return {
    ...period,
    scope_id:runtimeScopeId(scopeId),
    display_label:period.title||period.period||'目前時期',
    derived_from:'period'
  };
}

function sourceLabel(value){return String(value||'').trim();}
function mondayOf(value){
  const key=String(value||'').slice(0,10);
  if(!key)return '';
  const date=new Date(key+'T00:00:00Z');
  const day=date.getUTCDay();
  date.setUTCDate(date.getUTCDate()+(day===0?-6:1-day));
  return date.toISOString().slice(0,10);
}
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
function cultureParts(scopeContext,runtimeId){
  const normalizedContext=(scopeContext||[]).map(row=>({...row,scope_id:runtimeId}));
  const periods=normalizedContext.filter(row=>row.entry_type==='period');
  const eras=periods.map(row=>({
    ...periodRows([row])[0],
    scope_id:runtimeId,
    group_label:runtimeId+' 時期'
  }));
  const events=normalizedContext.filter(row=>row.entry_type==='event').map(row=>({
    entry_id:row.event_id||row.entry_key,
    event_id:row.event_id||row.entry_key,
    scope_id:runtimeId,
    title:row.title,
    description:row.summary||'',
    date:row.start_date||null,
    start_date:row.start_date||null,
    end_date:row.end_date||null,
    status:row.status||'',
    visibility:row.visibility||'public'
  }));
  const trajectories=normalizedContext.filter(row=>row.entry_type==='anchor').map(row=>({
    entry_id:row.entry_key,
    trajectory_id:row.entry_key,
    scope_id:runtimeId,
    title:row.title,
    description:row.summary||'',
    start_date:row.start_date||null,
    date:row.start_date||null,
    end_date:row.end_date||null,
    anchor_id:row.anchor_id||null,
    status:row.status||''
  }));
  return {normalizedContext,periods,eras,events,trajectories};
}

export async function selectScopeCultureData(scopeId){
  const id=runtimeScopeId(scopeId);
  const dataId=dataScopeId(scopeId);
  if(!['loc','lrunes','lo3rwang'].includes(dataId))throw new Error('資料設定無效');

  if(dataId==='loc'){
    const [authorTables,runeTables]=await Promise.all([
      resolveScopeTables('lo3rwang'),
      resolveScopeTables('lrunes')
    ]);
    const [authorContext,runeContext]=await Promise.all([
      selectCultureTimeRows('lo3rwang',authorTables.time),
      selectCultureTimeRows('lrunes',runeTables.time)
    ]);
    const authorCurrent=currentPeriodRangeFromRows('lo3rwang',authorContext);
    const runeCurrent=currentPeriodRangeFromRows('lrunes',runeContext);
    const currentRanges=[authorCurrent,runeCurrent].filter(Boolean);
    const starts=currentRanges.map(row=>String(row.start_date||'')).filter(Boolean).sort();
    const intersectionStart=starts.at(-1)||'';

    let authorText={rows:[],count:0};
    let runeText={rows:[],count:0};
    let authorMedia=0;
    let runeMedia=0;
    if(intersectionStart){
      const textFilters=publicContentFilters(dateFilters(intersectionStart,null));
      const mediaFilters=dateFilters(intersectionStart,null);
      [authorText,runeText,authorMedia,runeMedia]=await Promise.all([
        selectAllNeonRows(authorTables.galaxy,{
          columns:'uid,title,source_name,createtime,url',
          filters:textFilters,
          orders:[{column:'createtime',ascending:false},{column:'uid',ascending:true}],
          pageSize:5000
        }),
        selectAllNeonRows(runeTables.galaxy,{
          columns:'uid,title,source_name,createtime,url',
          filters:textFilters,
          orders:[{column:'createtime',ascending:false},{column:'uid',ascending:true}],
          pageSize:5000
        }),
        selectNeonCount(authorTables.galaxyMedia,{filters:mediaFilters}),
        selectNeonCount(runeTables.galaxyMedia,{filters:mediaFilters})
      ]);
      for(const range of currentRanges){
        const isRune=String(range.scope_id)==='lunarunes';
        const textCount=isRune?Number(runeText.count||0):Number(authorText.count||0);
        const mediaCount=isRune?Number(runeMedia||0):Number(authorMedia||0);
        range.intersection_start=intersectionStart;
        range.text_count=textCount;
        range.media_count=mediaCount;
        range.item_count=textCount+mediaCount;
      }
    }

    const authorParts=cultureParts(authorContext,'lo3rwang');
    const runeParts=cultureParts(runeContext,'lunarunes');
    const currentCountByScope=new Map(currentRanges.map(row=>[String(row.scope_id),Number(row.item_count)||0]));
    const currentPeriodByScope=new Map(currentRanges.map(row=>[String(row.scope_id),String(row.period||'')]));
    const mergedTimeline=timelineItems([
      ...authorParts.normalizedContext,
      ...runeParts.normalizedContext
    ]).map(item=>{
      const scope=String(item.scope_id||'');
      const isCurrent=item.entry_type==='period'&&String(item.period||'')===currentPeriodByScope.get(scope);
      if(!isCurrent)return item;
      const count=currentCountByScope.get(scope)||0;
      return {...item,item_count:count,display_label:(item.display_label||item.title||item.period)+' · '+count.toLocaleString()+' 項'};
    });
    const works=[
      ...(authorText.rows||[]).map(row=>({
        ...row,
        key:'lo3rwang:'+row.uid,
        scope_id:'lo3rwang',
        entry_type:'work',
        original_source:row.source_name||'',
        display_date:formatCultureDateTime(row.createtime)
      })),
      ...(runeText.rows||[]).map(row=>({
        ...row,
        key:'lunarunes:'+row.uid,
        scope_id:'lunarunes',
        entry_type:'work',
        original_source:row.source_name||'',
        display_date:formatCultureDateTime(row.createtime)
      }))
    ].sort((a,b)=>String(b.createtime||'').localeCompare(String(a.createtime||'')));

    return ScopeCultureResponseSchema.parse({
      scopeId:id,
      eras:{eras:[...authorParts.eras,...runeParts.eras]},
      periods:[...authorParts.periods,...runeParts.periods],
      currentRanges,
      scopeRanges:[],
      timelineItems:mergedTimeline,
      events:[...authorParts.events,...runeParts.events],
      trajectories:[...authorParts.trajectories,...runeParts.trajectories],
      works,
      intersectionStart
    });
  }

  const tables=await resolveScopeTables(dataId);
  const scopeContext=await selectCultureTimeRows(dataId,tables.time);
  const runtimeId=runtimeScopeId(dataId);
  const parts=cultureParts(scopeContext,runtimeId);
  const currentRange=currentPeriodRangeFromRows(dataId,scopeContext);
  return ScopeCultureResponseSchema.parse({
    scopeId:id,
    eras:{eras:parts.eras},
    periods:parts.periods,
    currentRanges:currentRange?[currentRange]:[],
    scopeRanges:[],
    timelineItems:timelineItems(parts.normalizedContext),
    events:parts.events,
    trajectories:parts.trajectories,
    works:[]
  });
}

function normalizedWorkTimelineBuckets(rows=[]){
  const maximum=Math.max(1,...rows.map(row=>Number(row.item_count)||0));
  return rows.map(row=>({
    ...row,
    global_density_ratio:(Number(row.item_count)||0)/maximum
  })).sort((a,b)=>String(a.start_date||'').localeCompare(String(b.start_date||''))||String(a.group_label||'').localeCompare(String(b.group_label||'')));
}

export async function selectScopeWorkSnapshot(scopeId,{startDate,endDate=null}={}){
  if(!startDate)return {buckets:[],totalCount:0};
  const runtimeId=runtimeScopeId(scopeId);
  const dataId=dataScopeId(scopeId);
  if(!['lo3rwang','lrunes'].includes(dataId))return {buckets:[],totalCount:0};
  const tables=await resolveScopeTables(dataId);
  const textTable=tables.galaxy;
  const mediaTable=tables.galaxyMedia;
  const textFilters=publicContentFilters(dateFilters(startDate,endDate));
  const mediaFilters=dateFilters(startDate,endDate);
  const [textDaily,mediaDaily,textCount,mediaCount]=await Promise.all([
    selectDailyCounts(textTable,{startDate,endDate,filters:publicContentFilters([])}),
    selectDailyCounts(mediaTable,{startDate,endDate}),
    selectNeonCount(textTable,{filters:textFilters}),
    selectNeonCount(mediaTable,{filters:mediaFilters})
  ]);
  const buckets=[
    ...textDaily.map(row=>({
      id:'works:text:'+row.day,
      category:'文字作品',
      group_label:'文字作品',
      display_label:'文字作品 '+row.item_count+' 項',
      title:row.day+' · 文字作品 · '+row.item_count+' 項',
      start_date:row.day,
      item_count:Number(row.item_count)||0,
      scope_id:runtimeId,
      entry_type:'work_density'
    })),
    ...mediaDaily.map(row=>({
      id:'works:media:'+row.day,
      category:'多媒體',
      group_label:'多媒體',
      display_label:'多媒體 '+row.item_count+' 項',
      title:row.day+' · 多媒體 · '+row.item_count+' 項',
      start_date:row.day,
      item_count:Number(row.item_count)||0,
      scope_id:runtimeId,
      entry_type:'work_density'
    }))
  ];
  return {buckets:normalizedWorkTimelineBuckets(buckets),totalCount:textCount+mediaCount};
}

export async function selectAuthorPeriodSourceSnapshot({startDate,endDate=null}={}){
  if(!startDate)return {groups:[],buckets:[],totalCount:0};
  const filters=publicContentFilters(dateFilters(startDate,endDate));
  const [catalog,daily,totalCount]=await Promise.all([
    selectSourceCatalog({scopeId:'lo3rwang',startDate,endDate:endDate||'',limit:20}),
    selectSourceDaily({scopeId:'lo3rwang',startDate,endDate:endDate||''}),
    selectNeonCount((await resolveScopeTables('lo3rwang')).galaxy,{filters})
  ]);
  const maxima=new Map();
  let globalMaximum=0;
  for(const row of daily){
    const source=sourceLabel(row.source_name);
    const count=Number(row.item_count)||0;
    maxima.set(source,Math.max(maxima.get(source)||0,count));
    globalMaximum=Math.max(globalMaximum,count);
  }
  const groups=catalog.rows.map(row=>({
    category_key:'source:'+row.source_name,
    category_type:'source',
    source_name:row.source_name,
    display_label:row.source_name,
    item_count:Number(row.item_count)||0,
    media_count:0
  }));
  const buckets=daily.map(row=>{
    const source=sourceLabel(row.source_name);
    const count=Number(row.item_count)||0;
    const day=String(row.day||'').slice(0,10);
    return {
      id:'source_name:'+source+':'+day,
      category:source,
      group_label:source,
      start_date:day,
      item_count:count,
      works:[],
      density_ratio:count/Math.max(1,maxima.get(source)||1),
      global_density_ratio:count/Math.max(1,globalMaximum),
      display_label:source+' '+count+' 項',
      title:day+' · '+source+' · '+count+' 項',
      scope_id:'classification',
      entry_type:'source',
      classification_dimension:'source',
      classification_level:'source'
    };
  });
  return {groups,buckets,totalCount};
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
      content:row.content||'',
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

export async function selectScopeMediaSnapshot(scopeId,{startDate,endDate}={}){
  if(!startDate)return {groups:[],buckets:[],totalCount:0};
  const runtimeId=runtimeScopeId(scopeId);
  const table=(await resolveScopeTables(dataScopeId(scopeId))).galaxyMedia;
  const filters=dateFilters(startDate,endDate);
  const [groupRows,daily,totalCount]=await Promise.all([
    selectCategoryCounts(table,'media_type',{startDate,endDate,limit:20}),
    selectDailyCategoryCounts(table,'media_type',{startDate,endDate}),
    selectNeonCount(table,{filters})
  ]);
  const maxima=new Map();
  let globalMaximum=0;
  for(const row of daily){
    const term=String(row.category||'').trim();
    const count=Number(row.item_count)||0;
    maxima.set(term,Math.max(maxima.get(term)||0,count));
    globalMaximum=Math.max(globalMaximum,count);
  }
  const groups=groupRows.map(row=>({
    category_key:'media:type:'+row.term,
    category_type:'media',
    media_dimension:'type',
    media_name:row.term,
    display_label:row.term,
    item_count:Number(row.item_count)||0,
    media_count:Number(row.item_count)||0
  }));
  const buckets=daily.map(row=>{
    const term=String(row.category||'').trim();
    const day=String(row.day||'').slice(0,10);
    const count=Number(row.item_count)||0;
    return {
      id:'media_type:'+term+':'+day,
      category:term,
      group_label:term,
      start_date:day,
      item_count:count,
      works:[],
      density_ratio:count/Math.max(1,maxima.get(term)||1),
      global_density_ratio:count/Math.max(1,globalMaximum),
      display_label:term+' '+count+' 項',
      title:day+' · '+term+' · '+count+' 項',
      scope_id:runtimeId,
      entry_type:'media',
      classification_dimension:'media',
      classification_level:'type'
    };
  });
  return {groups,buckets,totalCount};
}

export async function selectScopeMediaWorks(scopeId,{startDate,endDate,mediaName,limit=20,pageOffset=0}={}){
  if(!startDate||!mediaName)return {rows:[],hasMore:false,nextOffset:null,totalCount:null};
  const pageSize=Math.max(1,Math.min(100,Math.floor(Number(limit)||20)));
  const offset=Math.max(0,Math.floor(Number(pageOffset)||0));
  const field='media_type';
  const table=(await resolveScopeTables(dataScopeId(scopeId))).galaxyMedia;
  const filters=[
    ...dateFilters(startDate,endDate),
    {column:field,operator:'eq',value:String(mediaName)}
  ];
  const totalCount=await selectNeonCount(table,{filters});
  const result=await selectNeonRows(table,{
    columns:'media_id,galaxy_link,source_native_id,media_type,title,url,meta_tags,createtime',
    filters,
    orders:[
      {column:'createtime',ascending:false},
      {column:'media_id',ascending:true}
    ],
    limit:pageSize,
    offset
  });
  const sourceRows=result.rows||[];
  const page=sourceRows.map(row=>({
    ...row,
    record_type:'galaxy_media',
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
  const hasMore=offset+pageSize<totalCount;
  return {rows:page,hasMore,nextOffset:hasMore?offset+pageSize:null,totalCount};
}

