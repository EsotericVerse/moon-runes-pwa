'use client';

import {DB_QUERY_BATCH_SIZE} from './query-contract.mjs';

import {decodeCultureText,formatCultureDateTime} from '../modular/modules/culture-timeline/culture-timeline-model.mjs';
import {workDisplayText} from '../modular/work-display-model';
import {resolveGalaxyExternalLinks,selectCategoryCounts,selectDailyCategoryCounts,selectSourceCatalog,selectSourceDaily} from './galaxy-query';
import {selectCount,selectRows} from './db-query.mjs';
import {publicContentFilters} from './content-policy';
import {selectManagedScope,selectManagedScopes} from './scope-data';



const TIME_COLUMNS='record_id,record_type,label,resource_id,display_order,status,note,time_date,anchor_ids,date_status,year_value,visibility,style_tags';
function scopeIdOf(value){return String(value||'').trim();}
function timeDate(row){
  if(row?.time_date)return String(row.time_date).slice(0,10);
  const year=Number(row?.year_value);
  return String(row?.date_status||'')==='year_only'&&Number.isInteger(year)&&year>0?`${year}-01-01`:null;
}
function anchorIds(value){
  const source=Array.isArray(value)?value:String(value||'').split(',');
  const ids=source.map(item=>String(item||'0').trim()||'0').filter(Boolean);
  return ids.length?ids:['0','0'];
}
function previousDay(value){
  if(!value)return null;
  const date=new Date(String(value).slice(0,10)+'T00:00:00Z');
  date.setUTCDate(date.getUTCDate()-1);
  return date.toISOString().slice(0,10);
}
async function selectCultureTimeRows(scope,birthday=''){
  const scopeId=scopeIdOf(scope?.id);
  const table=scope?.time;
  if(!scopeId||!table)throw new Error('Scope data 未解析');
  const {rows}=await selectRows(table,{
    columns:TIME_COLUMNS,
    filters:[{column:'record_type',operator:'in',value:['anchor','period','event']}],
    orders:[{column:'display_order',ascending:true},{column:'record_id',ascending:true}],
    limit:DB_QUERY_BATCH_SIZE,
    offset:0
  });
  const scopeBirthday=/^\d{4}-\d{2}-\d{2}$/.test(String(birthday||'').slice(0,10))
    ?String(birthday).slice(0,10)
    :null;
  const anchors=rows.filter(row=>row.record_type==='anchor');
  const periods=rows.filter(row=>row.record_type==='period');
  const events=rows.filter(row=>row.record_type==='event');
  const anchorMap=new Map();
  for(const row of anchors){
    const anchorId=String(row.resource_id||'').trim();
    if(!anchorId)continue;
    const existing=anchorMap.get(anchorId);
    if(existing){
      const existingSignature=existing.time_date
        ?'exact:'+String(existing.time_date).slice(0,10)
        :String(existing.date_status||'')==='year_only'?'year:'+String(existing.year_value||''):'unknown';
      const nextSignature=row.time_date
        ?'exact:'+String(row.time_date).slice(0,10)
        :String(row.date_status||'')==='year_only'?'year:'+String(row.year_value||''):'unknown';
      if(existingSignature!==nextSignature){
        throw new Error('Scope '+scopeId+' 定錨點識別衝突：'+anchorId+' 對應不同日期（'+existingSignature+' / '+nextSignature+'）');
      }
      continue;
    }
    anchorMap.set(anchorId,row);
  }
  const normalize=(row,type)=>{
    const id=String(row.resource_id||row.record_id||'');
    const ids=anchorIds(row.anchor_ids);
    const firstId=ids[0]||'0';
    const lastId=ids.at(-1)||'0';
    const milestoneIds=type==='event'?ids.slice(1,-1).filter(anchorId=>anchorId!=='0'):[];
    const startAnchor=firstId==='0'?null:anchorMap.get(firstId);
    const endAnchor=lastId==='0'?null:anchorMap.get(lastId);
    const startDate=type==='anchor'
      ?timeDate(row)
      :(firstId==='0'?scopeBirthday:timeDate(startAnchor));
    const endBoundary=type==='anchor'
      ?null
      :(lastId==='0'?null:timeDate(endAnchor));
    return {
      ...row,
      scope_id:scopeId,
      entry_key:type+':'+id,
      entry_type:type,
      title:row.label||id,
      summary:row.note||'',
      era_id:type==='period'?id:null,
      period:type==='period'?id:null,
      entry_name:type==='period'?String(row.label||'').replace(/^P\d+\s*[｜|]\s*/,''):null,
      order_no:row.display_order,
      anchor_id:type==='anchor'?id:null,
      anchor_ids:type==='anchor'?[]:ids,
      start_anchor_id:firstId==='0'?null:firstId,
      milestone_anchor_ids:milestoneIds,
      milestone_dates:milestoneIds.map(anchorId=>timeDate(anchorMap.get(anchorId))).filter(Boolean),
      end_anchor_id:lastId==='0'?null:lastId,
      event_id:type==='event'?id:null,
      open_start:type!=='anchor'&&firstId==='0',
      open_end:type!=='anchor'&&lastId==='0',
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

function openPeriodRangeFromRows(scopeId,rows=[]){
  const period=[...rows]
    .filter(row=>row.entry_type==='period'&&row.open_end&&row.start_date)
    .sort((a,b)=>Number(b.order_no||0)-Number(a.order_no||0))[0];
  if(!period)return null;
  return {
    ...period,
    scope_id:scopeId,
    display_label:period.title||period.period||'時期',
    derived_from:'anchor_ids[last]=0'
  };
}

const LOC_SOURCE_ORDER=Object.freeze(['Facebook','Threads','IG','Others']);
function locSourceCategory(value=''){
  const source=String(value||'').trim().toLowerCase();
  if(!source)return 'Others';
  if(source.includes('facebook')||source==='fb')return 'Facebook';
  if(source.includes('threads'))return 'Threads';
  if(source.includes('instagram')||source.includes('reels')||source==='ig')return 'IG';
  return 'Others';
}
function buildLocScopeDistribution(rows=[]){
  const combined=new Map();
  for(const row of rows){
    const scope=scopeIdOf(row?.scope_id||'');
    const day=String(row?.day||'').slice(0,10);
    if(!scope||!day)continue;
    const key=scope+'|'+day;
    const current=combined.get(key)||{scope_id:scope,start_date:day,item_count:0};
    current.item_count+=Number(row?.item_count)||0;
    combined.set(key,current);
  }
  return [...combined.values()]
    .sort((a,b)=>String(a.scope_id).localeCompare(String(b.scope_id))||String(a.start_date).localeCompare(String(b.start_date)));
}

function buildLocSourceRiver(rows=[]){
  const combined=new Map();
  const totals=new Map(LOC_SOURCE_ORDER.map(category=>[category,0]));
  for(const row of rows){
    const category=locSourceCategory(row.category);
    const count=Number(row.item_count)||0;
    totals.set(category,(totals.get(category)||0)+count);
    const day=String(row.day||'').slice(0,10);
    if(!day)continue;
    const key=category+'|'+day;
    const current=combined.get(key)||{category,day,item_count:0};
    current.item_count+=count;
    combined.set(key,current);
  }
  const perCategoryMax=new Map();
  let globalMax=0;
  for(const row of combined.values()){
    perCategoryMax.set(row.category,Math.max(perCategoryMax.get(row.category)||0,row.item_count));
    globalMax=Math.max(globalMax,row.item_count);
  }
  const sourceRiverItems=[...combined.values()].map(row=>({
    id:'loc-source:'+row.category+':'+row.day,
    entry_id:'loc-source:'+row.category+':'+row.day,
    entry_type:'source_density',
    scope_id:'loc',
    group_label:row.category,
    category:row.category,
    start_date:row.day,
    item_count:row.item_count,
    density_ratio:row.item_count/Math.max(1,perCategoryMax.get(row.category)||1),
    global_density_ratio:row.item_count/Math.max(1,globalMax),
    display_label:row.category+' '+row.item_count+' 項',
    title:row.day+' · '+row.category+' · '+row.item_count+' 項'
  })).sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date))||LOC_SOURCE_ORDER.indexOf(a.category)-LOC_SOURCE_ORDER.indexOf(b.category));
  const sourceGroups=LOC_SOURCE_ORDER.map(category=>({
    category_key:'source:'+category,
    category_type:'source',
    source_name:category,
    display_label:category,
    item_count:Number(totals.get(category))||0
  })).filter(row=>row.item_count>0);
  return {sourceRiverItems,sourceGroups};
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
function periodRows(rows){
  return (rows||[]).map(row=>({
    era_id:row.era_id||row.entry_key,period:row.period||row.entry_key||'',name:row.entry_name||row.title||row.entry_key,
    title:row.title||row.entry_key,description:row.summary||'',start_date:row.start_date||null,end_date:row.end_date||null,
    order:Number(row.order_no||0),status:row.status||'',anchor_id:row.anchor_id||null,start_anchor_id:row.start_anchor_id||null,
    end_anchor_id:row.end_anchor_id||null,anchor_ids:Array.isArray(row.anchor_ids)?row.anchor_ids:[],date_status:row.date_status||'',style_tags:row.style_tags||'',open_start:Boolean(row.open_start),open_end:Boolean(row.open_end)
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
    const scopeId=scopeIdOf(row.scope_id);
    return {...row,scope_id:scopeId,id:`${scopeId}:${row.entry_key}`,entry_id:`${scopeId}:${row.entry_key}`,start_date:start,end_date:end,date:start||end,
      display_label:row.title,group_label:`${row.scope_id} · ${kindLabel}`};
  }).filter(row=>row.start_date||(row.open_start&&row.end_date))
    .sort((a,b)=>String(a.start_date||a.end_date).localeCompare(String(b.start_date||b.end_date)));
}
function dateFilters(startDate,endDate,column='createtime'){
  const filters=[];
  if(startDate)filters.push({column,operator:'gte',value:`${String(startDate).slice(0,10)}T00:00:00+08:00`});
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
    anchor_ids:Array.isArray(row.anchor_ids)?row.anchor_ids:[],
    milestone_anchor_ids:Array.isArray(row.milestone_anchor_ids)?row.milestone_anchor_ids:[],
    milestone_dates:Array.isArray(row.milestone_dates)?row.milestone_dates:[],
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
  const id=scopeIdOf(scopeId);
  if(!id)throw new Error('資料設定無效');

  if(id==='loc'){
    const managedScopes=(await selectManagedScopes()).filter(scope=>scope.id!=='loc');
    if(!managedScopes.length){
      return {
        scopeId:id,scope:null,eras:{eras:[]},periods:[],openRanges:[],scopeRanges:[],
        timelineItems:[],sourceRiverItems:[],sourceGroups:[],events:[],trajectories:[],
        works:[],intersectionStart:''
      };
    }

    const bundles=await Promise.all(managedScopes.map(async scope=>{
      const context=await selectCultureTimeRows(scope,scope.birthday);
      return {
        scope,
        dataId:scope.id,
        runtimeId:scope.id,
        galaxy:scope.galaxy,
        galaxyMedia:scope.galaxyMedia,
        time:scope.time,
        context,
        openRange:openPeriodRangeFromRows(scope.id,context)
      };
    }));

    const validBundles=bundles.filter(bundle=>Boolean(bundle.openRange?.start_date));
    const openRanges=validBundles.map(bundle=>bundle.openRange);
    const starts=openRanges.map(row=>String(row.start_date||'')).filter(Boolean).sort();
    const intersectionStart=starts.at(-1)||'';
    const today=new Date().toISOString().slice(0,10);

    if(!intersectionStart){
      return {
        scopeId:id,scope:null,eras:{eras:[]},periods:[],openRanges:[],scopeRanges:[],
        timelineItems:[],sourceRiverItems:[],sourceGroups:[],events:[],trajectories:[],
        works:[],intersectionStart:'',intersectionEnd:today,intersectionScopeIds:[]
      };
    }

    const intersectionScopeIds=validBundles.map(bundle=>bundle.runtimeId);
    const aggregateRows=(await Promise.all(validBundles.map(async bundle=>{
      const [textDaily,mediaDaily]=await Promise.all([
        selectDailyCategoryCounts(bundle.galaxy,'source_name',{
          startDate:intersectionStart,
          endDate:today,
          filters:publicContentFilters([]),
          includeEmpty:true,
          includeUndated:false
        }),
        selectDailyCategoryCounts(bundle.galaxyMedia,'media_type',{
          startDate:intersectionStart,
          endDate:today,
          includeEmpty:true,
          includeUndated:false
        })
      ]);
      return [
        ...textDaily.map(row=>({...row,scope_id:bundle.runtimeId})),
        ...mediaDaily.map(row=>({...row,scope_id:bundle.runtimeId}))
      ];
    }))).flat();

    const built=buildLocSourceRiver(aggregateRows);
    return {
      scopeId:id,
      scope:null,
      scopes:validBundles.map(bundle=>bundle.scope),
      eras:{eras:[]},
      periods:[],
      openRanges,
      scopeRanges:buildLocScopeDistribution(aggregateRows),
      timelineItems:[],
      sourceRiverItems:built.sourceRiverItems,
      sourceGroups:built.sourceGroups,
      events:[],
      trajectories:[],
      works:[],
      intersectionStart,
      intersectionEnd:today,
      intersectionScopeIds
    };
  }

  const scope=await selectManagedScope(id);
  if(!scope)throw new Error('找不到 Scope 資料設定');
  const scopeContext=await selectCultureTimeRows(scope,scope.birthday);
  const parts=cultureParts(scopeContext,scope.id);
  const openRange=openPeriodRangeFromRows(scope.id,scopeContext);
  return {
    scopeId:id,
    scope,
    eras:{eras:parts.eras},
    periods:parts.periods,
    openRanges:openRange?[openRange]:[],
    scopeRanges:[],
    timelineItems:timelineItems(parts.normalizedContext),
    events:parts.events,
    trajectories:parts.trajectories,
    works:[]
  };
}

export async function selectScopePeriodSourceSnapshot(scope,{startDate='',endDate=null}={}){
  const scopeId=scopeIdOf(scope?.id);
  if(!scopeId)throw new Error('scopeId is required');
  const [catalog,daily,mediaCatalog,mediaDaily]=await Promise.all([
    selectSourceCatalog(scope,{startDate,endDate:endDate||'',limit:DB_QUERY_BATCH_SIZE}),
    selectSourceDaily(scope,{startDate,endDate:endDate||''}),
    selectCategoryCounts(scope.galaxyMedia,'media_type',{startDate,endDate,limit:DB_QUERY_BATCH_SIZE}),
    selectDailyCategoryCounts(scope.galaxyMedia,'media_type',{startDate,endDate})
  ]);

  const groupMap=new Map(LOC_SOURCE_ORDER.map(category=>[category,{
    category_key:'source:'+category,
    category_type:'source',
    source_name:category,
    display_label:category,
    item_count:0,
    source_names:[],
    media_types:[]
  }]));
  for(const row of catalog.rows){
    const category=locSourceCategory(row.source_name);
    const group=groupMap.get(category);
    group.item_count+=(Number(row.item_count)||0);
    group.source_names.push(String(row.source_name||'').trim());
  }
  for(const row of mediaCatalog){
    const category=locSourceCategory(row.term);
    const group=groupMap.get(category);
    group.item_count+=(Number(row.item_count)||0);
    group.media_types.push(String(row.term||'').trim());
  }

  const combined=new Map();
  for(const row of daily){
    const category=locSourceCategory(row.source_name);
    const day=String(row.day||'').slice(0,10);
    if(!day)continue;
    const key=category+'|'+day;
    combined.set(key,(combined.get(key)||0)+(Number(row.item_count)||0));
  }
  for(const row of mediaDaily){
    const category=locSourceCategory(row.category);
    const day=String(row.day||'').slice(0,10);
    if(!day)continue;
    const key=category+'|'+day;
    combined.set(key,(combined.get(key)||0)+(Number(row.item_count)||0));
  }

  const maxima=new Map();
  const firstDates=new Map();
  const lastDates=new Map();
  let globalMaximum=0;
  for(const [key,count] of combined){
    const split=key.lastIndexOf('|');
    const category=key.slice(0,split);
    const day=key.slice(split+1);
    maxima.set(category,Math.max(maxima.get(category)||0,count));
    globalMaximum=Math.max(globalMaximum,count);
    const first=firstDates.get(category);
    const last=lastDates.get(category);
    if(!first||day<first)firstDates.set(category,day);
    if(!last||day>last)lastDates.set(category,day);
  }

  const groups=LOC_SOURCE_ORDER.map(category=>{
    const group=groupMap.get(category);
    return {
      ...group,
      first_date:firstDates.get(category)||null,
      last_date:lastDates.get(category)||null,
      source_names:[...new Set(group.source_names)].filter(Boolean),
      media_types:[...new Set(group.media_types)].filter(Boolean)
    };
  }).filter(group=>group.item_count>0&&group.first_date&&group.last_date);

  const activeCategories=new Set(groups.map(group=>group.source_name));
  const buckets=[...combined.entries()].map(([key,count])=>{
    const split=key.lastIndexOf('|');
    const source=key.slice(0,split);
    const day=key.slice(split+1);
    if(!activeCategories.has(source))return null;
    const group=groupMap.get(source);
    const firstDate=firstDates.get(source)||day;
    const lastDate=lastDates.get(source)||day;
    return {
      id:'source_name:'+source+':'+day,
      category:source,
      group_label:source+' · '+Number(group?.item_count||0).toLocaleString()+' 項 · '+firstDate+' → '+lastDate,
      start_date:day,
      item_count:count,
      works:[],
      first_date:firstDate,
      last_date:lastDate,
      density_ratio:count/Math.max(1,maxima.get(source)||1),
      global_density_ratio:count/Math.max(1,globalMaximum),
      display_label:source+' '+count+' 項',
      title:day+' · '+source+' · '+count+' 項',
      scope_id:'classification',
      entry_type:'source',
      classification_dimension:'source',
      classification_level:'source'
    };
  }).filter(Boolean).sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date))||LOC_SOURCE_ORDER.indexOf(a.category)-LOC_SOURCE_ORDER.indexOf(b.category));

  return {groups,buckets,totalCount:groups.reduce((sum,row)=>sum+Number(row.item_count||0),0)};
}

function mediaMetadataDescription(row){
  const fields=[['標題',row.title],['類型',row.media_type],['Meta Tag',row.meta_tags]];
  return fields.map(([label,value])=>{const text=decodeCultureText(value||'').trim();return text?`${label}：${text}`:'';}).filter(Boolean).join(' · ')||'沒有可讀的 metadata 文字';
}

export async function selectScopePeriodWorkIndex(scope,{startDate='',endDate=null,sourceName='',sourceNames=[],mediaTypes=[],limit=10,offset=0,cursor=null}={}){
  const scopeId=scopeIdOf(scope?.id);
  if(!scopeId)throw new Error('scopeId is required');
  const rawSources=[...new Set((sourceNames||[]).map(value=>String(value||'').trim()).filter(Boolean))];
  const rawMedia=[...new Set((mediaTypes||[]).map(value=>String(value||'').trim()).filter(Boolean))];
  const pageSize=Math.max(1,Math.floor(Number(limit)||10));
  const baseOffset=Math.max(0,Math.floor(Number(offset)||0));
  const cursorGalaxyOffset=Number(cursor?.galaxyOffset);
  const cursorMediaOffset=Number(cursor?.mediaOffset);
  const galaxyOffset=Number.isFinite(cursorGalaxyOffset)
    ?Math.max(0,Math.floor(cursorGalaxyOffset))
    :baseOffset;
  const mediaOffset=Number.isFinite(cursorMediaOffset)
    ?Math.max(0,Math.floor(cursorMediaOffset))
    :baseOffset;

  const galaxyFilters=publicContentFilters([
    ...dateFilters(startDate,endDate),
    ...(rawSources.length?[{column:'source_name',operator:'in',value:rawSources}]:[])
  ]);
  const mediaFilters=[
    ...dateFilters(startDate,endDate),
    ...(rawMedia.length?[{column:'media_type',operator:'in',value:rawMedia}]:[])
  ];

  const includeGalaxy=!sourceName||rawSources.length>0;
  const includeMedia=!sourceName||rawMedia.length>0;
  const [galaxyCount,mediaCount,galaxyResult,mediaResult]=await Promise.all([
    includeGalaxy?selectCount(scope.galaxy,{idColumn:'uid',filters:galaxyFilters}):Promise.resolve(0),
    includeMedia?selectCount(scope.galaxyMedia,{idColumn:'media_id',filters:mediaFilters}):Promise.resolve(0),
    includeGalaxy?selectRows(scope.galaxy,{
      columns:'uid,createtime',
      filters:galaxyFilters,
      orders:[{column:'createtime',ascending:false},{column:'uid',ascending:true}],
      limit:pageSize,
      offset:galaxyOffset,
      maxLimit:pageSize
    }).then(page=>page.rows):Promise.resolve([]),
    includeMedia?selectRows(scope.galaxyMedia,{
      columns:'media_id,createtime',
      filters:mediaFilters,
      orders:[{column:'createtime',ascending:false},{column:'media_id',ascending:true}],
      limit:pageSize,
      offset:mediaOffset,
      maxLimit:pageSize
    }).then(page=>page.rows):Promise.resolve([])
  ]);

  const galaxyRows=(galaxyResult||[]).map(row=>({
    key:'galaxy:'+row.uid,
    entry_type:'work',
    entry_id:String(row.uid||''),
    uid:String(row.uid||''),
    createtime:row.createtime
  })).filter(row=>row.entry_id);
  const mediaRows=(mediaResult||[]).map(row=>({
    key:'media:'+row.media_id,
    entry_type:'media_metadata',
    entry_id:String(row.media_id||''),
    media_id:String(row.media_id||''),
    createtime:row.createtime
  })).filter(row=>row.entry_id);

  const rows=[];
  let galaxyIndex=0;
  let mediaIndex=0;
  while(rows.length<pageSize&&(galaxyIndex<galaxyRows.length||mediaIndex<mediaRows.length)){
    const galaxyRow=galaxyRows[galaxyIndex];
    const mediaRow=mediaRows[mediaIndex];
    if(!mediaRow||(galaxyRow&&(
      String(galaxyRow.createtime||'')>String(mediaRow.createtime||'')||
      (String(galaxyRow.createtime||'')===String(mediaRow.createtime||'')&&String(galaxyRow.entry_id)<=String(mediaRow.entry_id))
    ))){
      rows.push(galaxyRow);
      galaxyIndex+=1;
    }else{
      rows.push(mediaRow);
      mediaIndex+=1;
    }
  }

  return {
    rows,
    totalCount:Number(galaxyCount||0)+Number(mediaCount||0),
    nextCursor:{
      galaxyOffset:galaxyOffset+galaxyIndex,
      mediaOffset:mediaOffset+mediaIndex
    }
  };
}

export async function selectScopePeriodWorkDetails(scope,{items=[]}={}){
  const scopeId=scopeIdOf(scope?.id);
  if(!scopeId)throw new Error('scopeId is required');
  const source=Array.isArray(items)?items:[];
  if(!source.length)return {rows:[],hasMore:false};
  const galaxyIds=[...new Set(source.filter(row=>row?.entry_type==='work').map(row=>String(row?.uid||row?.entry_id||'').trim()).filter(Boolean))];
  const mediaIds=[...new Set(source.filter(row=>row?.entry_type==='media_metadata').map(row=>String(row?.media_id||row?.entry_id||'').trim()).filter(Boolean))];

  const [galaxyResult,mediaResult]=await Promise.all([
    galaxyIds.length?selectRows(scope.galaxy,{
      columns:'uid,source_name,createtime,title,url,source_id,target_id,media_link',
      filters:publicContentFilters([{column:'uid',operator:'in',value:galaxyIds}]),
      limit:galaxyIds.length
    }):Promise.resolve({rows:[]}),
    mediaIds.length?selectRows(scope.galaxyMedia,{
      columns:'media_id,galaxy_link,source_native_id,media_type,title,url,meta_tags,createtime',
      filters:[{column:'media_id',operator:'in',value:mediaIds}],
      limit:mediaIds.length
    }):Promise.resolve({rows:[]})
  ]);

  const resolvedGalaxy=await resolveGalaxyExternalLinks(scope,galaxyResult.rows||[]);
  const galaxyById=new Map(resolvedGalaxy.map(row=>[String(row.uid),{
    key:'galaxy:'+row.uid,
    uid:row.uid,
    source_name:String(row.source_name||''),
    source_id:row.source_id||null,
    target_id:row.target_id||null,
    title:workDisplayText(row.title||'').trim(),
    description:'',
    createtime:row.createtime,
    start_date:row.createtime,
    date:row.createtime,
    display_date:formatCultureDateTime(row.createtime),
    entry_id:row.uid,
    entry_type:'work',
    group_label:String(row.source_name||''),
    scope_id:scopeId,
    links:Array.isArray(row.resolved_links)?row.resolved_links:[]
  }]));
  const mediaById=new Map((mediaResult.rows||[]).map(row=>{
    const metadataDescription=mediaMetadataDescription(row);
    return [String(row.media_id),{
    ...row,
    key:'media:'+row.media_id,
    record_type:'galaxy_media',
    source_name:String(row.media_type||''),
    entry_id:row.media_id,
    entry_type:'media_metadata',
    start_date:row.createtime,
    date:row.createtime,
    display_date:formatCultureDateTime(row.createtime),
    title:decodeCultureText(row.title||'').trim()||row.media_type||'多媒體',
    description:metadataDescription,
    media_metadata_text:metadataDescription,
    group_label:String(row.media_type||''),
    scope_id:scopeId,
    links:row.url&&/^https?:\/\//i.test(String(row.url))
      ?[{id:'media:'+String(row.media_id),href:row.url,label:'媒體連結'}]
      :[]
  }];
  }));

  return {
    rows:source.map(row=>row.entry_type==='work'
      ?galaxyById.get(String(row.uid||row.entry_id))
      :mediaById.get(String(row.media_id||row.entry_id))
    ).filter(Boolean)
  };
}
