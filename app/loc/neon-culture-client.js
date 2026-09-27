'use client';

import {ScopeCultureResponseSchema} from './scope-feature-contracts';
import {selectNeonAllRows} from './neon-repository';
import {selectScopeTimeRows} from './scope-time';
import {decodeCultureText,formatCultureDateTime,groupWorksByWeek} from '../modular-v2/modules/culture-timeline/culture-timeline-model.mjs';
import {classifyStyleRows,processStyleTableRows} from './style-classifier';
import {selectCanonicalWorksPage,selectSourceWeekly} from './aggregate-query';

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
    return {...row,scope_id:scopeId,id:`${scopeId}:${row.entry_key}`,entry_id:`${scopeId}:${row.entry_key}`,start_date:start,end_date:end,date:start||end,
      display_label:row.title,group_label:`${row.scope_id} · ${kindLabel}`};
  }).filter(row=>row.start_date||(row.open_start&&row.end_date))
    .sort((a,b)=>String(a.start_date||a.end_date).localeCompare(String(b.start_date||b.end_date)));
}
function dateFilters(startDate,endDate){
  const filters=[{column:'created_at',operator:'gte',value:`${String(startDate).slice(0,10)}T00:00:00+08:00`}];
  if(endDate)filters.push({column:'created_at',operator:'lte',value:String(endDate).slice(0,10)+'T23:59:59.999+08:00'});
  return filters;
}
function withoutContent(row){
  const {content,...rest}=row||{};
  return rest;
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
  const fields=[['標題',row.title],['類型',row.media_type],['來源',row.source_name],['曲風分類',row.style_tags],['補充描述',row.meta_tags]];
  return fields.map(([label,value])=>{const text=decodeCultureText(value||'').trim();return text?`${label}：${text}`:'';}).filter(Boolean).join(' · ')||'沒有可讀的 metadata 文字';
}

export async function selectAuthorPeriodWorks({startDate,endDate,sourceName,categoryType='source',limit=20,pageOffset=0}={}){
  if(!startDate||!sourceName)return {rows:[],hasMore:false,nextOffset:null,totalCount:0};
  const pageSize=Math.max(1,Math.floor(Number(limit)||20));
  const offset=Math.max(0,Math.floor(Number(pageOffset)||0));
  const page=await selectCanonicalWorksPage({
    scopeId:'lo3rwang',
    sourceName:String(sourceName),
    startDate,
    endDate,
    limit:pageSize,
    offset
  });
  if(!page.rows.length)return {rows:[],hasMore:false,nextOffset:null,totalCount:page.totalCount};

  const textIds=page.rows.filter(row=>row.work_type==='galaxy').map(row=>String(row.work_id));
  const mediaIds=page.rows.filter(row=>row.work_type==='media').map(row=>String(row.work_id));
  const [textResult,standaloneMediaResult,linkedMediaResult]=await Promise.all([
    textIds.length?selectNeonAllRows('silver.lo3rwang_galaxy',{
      columns:'galaxy_id,category,content_type,source_name,source_type,source_role,title,meta_tags,content_hash,created_at,source_ref,url,source_id,target_id,ref_id',
      filters:[{column:'galaxy_id',operator:'in',value:textIds}]
    }):Promise.resolve({rows:[]}),
    mediaIds.length?selectNeonAllRows('silver.lo3rwang_galaxy_media',{
      columns:'media_id,media_link,source_name,source_type,source_native_id,media_type,title,url,meta_tags,style_tags,created_at',
      filters:[{column:'media_id',operator:'in',value:mediaIds}]
    }):Promise.resolve({rows:[]}),
    textIds.length?selectNeonAllRows('silver.lo3rwang_galaxy_media',{
      columns:'media_id,media_link,source_name,source_type,source_native_id,media_type,title,url,meta_tags,style_tags,created_at',
      filters:[{column:'media_link',operator:'in',value:textIds}]
    }):Promise.resolve({rows:[]})
  ]);

  const textById=new Map(textResult.rows.map(row=>[String(row.galaxy_id),row]));
  const mediaById=new Map(standaloneMediaResult.rows.map(row=>[String(row.media_id),row]));
  const linkedMediaByGalaxy=new Map();
  for(const media of linkedMediaResult.rows){
    const key=String(media.media_link||'');
    if(!key)continue;
    if(!linkedMediaByGalaxy.has(key))linkedMediaByGalaxy.set(key,[]);
    linkedMediaByGalaxy.get(key).push(media);
  }
  const rows=page.rows.map(item=>{
    if(item.work_type==='galaxy'){
      const row=textById.get(String(item.work_id));
      if(!row)return null;
      const linkedMedia=linkedMediaByGalaxy.get(String(row.galaxy_id))||[];
      const links=[];
      if(row.url&&/^https?:\/\//i.test(String(row.url)))links.push({id:'text:'+row.galaxy_id,href:row.url,label:'查看來源'});
      linkedMedia.forEach((media,index)=>{
        if(media.url&&/^https?:\/\//i.test(String(media.url)))links.push({
          id:'media:'+media.media_id,href:media.url,label:`媒體連結 ${index+1}`
        });
      });
      return {
        key:'galaxy:'+row.galaxy_id,
        galaxy_id:row.galaxy_id,
        source_name:row.source_name,
        source_type:row.source_type,
        source_role:row.source_role,
        title:decodeCultureText(row.title||'').trim()||row.source_name||row.galaxy_id,
        description:linkedMedia.map(mediaMetadataDescription).filter(Boolean).join(' ｜ '),
        created_at:row.created_at,
        start_date:row.created_at,
        date:row.created_at,
        display_date:formatCultureDateTime(row.created_at),
        entry_id:row.galaxy_id,
        entry_type:'work',
        source_id:row.source_id||null,
        target_id:row.target_id||null,
        ref_id:row.ref_id||null,
        source_ref:row.source_ref||null,
        url:row.url||null,
        links,
        group_label:sourceLabel(row.source_name),
        scope_id:'lo3rwang'
      };
    }
    const row=mediaById.get(String(item.work_id));
    if(!row)return null;
    return {
      key:'media:'+row.media_id,
      galaxy_id:row.media_link||null,
      media_id:row.media_id,
      source_name:row.source_name,
      title:decodeCultureText(row.title||'').trim()||'多媒體項目',
      description:mediaMetadataDescription(row),
      media_metadata_text:mediaMetadataDescription(row),
      created_at:row.created_at,
      start_date:row.created_at,
      date:row.created_at,
      display_date:formatCultureDateTime(row.created_at),
      entry_id:String(row.media_id),
      entry_type:'work_group',
      source_id:row.media_link||null,
      target_id:null,
      ref_id:null,
      group_label:sourceLabel(row.source_name),
      scope_id:'lo3rwang',
      links:row.url&&/^https?:\/\//i.test(String(row.url))?[{id:'media:'+row.media_id,href:row.url,label:'歌曲連結'}]:[]
    };
  }).filter(Boolean);

  const totalCount=Number(page.totalCount)||0;
  const hasMore=offset+pageSize<totalCount;
  return {rows,hasMore,nextOffset:hasMore?offset+pageSize:null,totalCount};
}

async function selectScopePeriodMetadataRows(scopeId,{startDate,endDate}={}){
  if(!startDate)return [];
  const runtimeId=runtimeScopeId(scopeId);
  const filters=dateFilters(startDate,endDate);
  if(runtimeId==='lunarunes'){
    const result=await selectNeonAllRows('silver.lrunes',{
      columns:'record_id,record_type,galaxy_id,media_id,title,meta_tags,style_tags,source_name,source_type,created_at,url,source_ref',
      filters:[
        {column:'record_type',operator:'in',value:['galaxy','galaxy_media']},
        ...filters
      ]
    });
    return result.rows;
  }
  const [textsResult,mediaResult]=await Promise.all([
    selectNeonAllRows('silver.lo3rwang_galaxy',{
      columns:'galaxy_id,title,meta_tags,source_name,source_type,created_at,url,source_ref,content_hash',
      filters
    }),
    selectNeonAllRows('silver.lo3rwang_galaxy_media',{
      columns:'media_id,title,meta_tags,style_tags,source_name,source_type,created_at,url,media_link,media_type',
      filters
    })
  ]);
  return [
    ...textsResult.rows.map(row=>({...row,record_type:'galaxy'})),
    ...mediaResult.rows.map(row=>({...row,record_type:'galaxy_media'}))
  ];
}

async function selectScopeStyleRows(scopeId,{startDate,endDate}={}){
  if(!startDate)return [];
  const runtimeId=runtimeScopeId(scopeId);
  const filters=dateFilters(startDate,endDate);
  const output=[];
  if(runtimeId==='lunarunes'){
    await processStyleTableRows('silver.lrunes',{
      columns:'record_id,record_type,galaxy_id,media_id,title,content,meta_tags,style_tags,source_name,source_type,created_at,url,source_ref',
      filters:[
        {column:'record_type',operator:'in',value:['galaxy','galaxy_media']},
        ...filters
      ],
      orders:[{column:'created_at',ascending:true}],
      onClassified:row=>{output.push(withoutContent(row));}
    });
    return output;
  }
  await processStyleTableRows('silver.lo3rwang_galaxy',{
    columns:'galaxy_id,title,content,meta_tags,source_name,source_type,created_at,url,source_ref,content_hash',
    filters,
    orders:[{column:'created_at',ascending:true}],
    onClassified:row=>{output.push({...withoutContent(row),record_type:'galaxy'});}
  });
  const mediaResult=await selectNeonAllRows('silver.lo3rwang_galaxy_media',{
    columns:'media_id,title,meta_tags,style_tags,source_name,source_type,created_at,url,media_link,media_type',
    filters
  });
  const mediaClassified=await classifyStyleRows(mediaResult.rows);
  output.push(...mediaClassified.map(row=>({...row,record_type:'galaxy_media'})));
  return output;
}

function canonicalSourceWorks(rows=[]){
  const groups=new Map();
  for(const row of rows){
    const source=String(row?.source_name||'').trim();
    if(!source)continue;
    const isMedia=String(row?.record_type||'')==='galaxy_media'||Boolean(row?.media_id);
    const key=isMedia
      ?String(row?.media_link||row?.media_id||'')
      :String(row?.galaxy_id||row?.record_id||'');
    if(!key)continue;
    const existing=groups.get(key);
    if(!existing||(!isMedia&&String(existing?.record_type||'')==='galaxy_media')){
      groups.set(key,{...row,source_name:source});
    }
  }
  return [...groups.values()];
}

export async function selectScopeClassificationBuckets(scopeId,{startDate,endDate,dimension='source',styleLevel='label'}={}){
  const runtimeId=runtimeScopeId(scopeId);
  if(dimension==='source'){
    if(runtimeId==='lunarunes'||!startDate)return [];
    return (await selectAuthorPeriodSourceSnapshot({startDate,endDate})).buckets;
  }
  return (await selectScopeStyleSnapshot(runtimeId,{startDate,endDate,styleLevel})).buckets;
}

export async function selectScopeStyleSnapshot(scopeId,{startDate,endDate,styleLevel='label'}={}){
  if(!startDate)return {groups:[],buckets:[]};
  const runtimeId=runtimeScopeId(scopeId);
  const field=styleLevel==='group'?'style_group':'style_label';
  const rows=await selectScopeStyleRows(runtimeId,{startDate,endDate});
  const counts=new Map();
  for(const row of rows){
    const term=String(row[field]||'').trim();
    if(term)counts.set(term,(counts.get(term)||0)+1);
  }
  const groups=[...counts.entries()]
    .map(([term,item_count])=>({
      category_key:`style:${styleLevel}:${term}`,
      category_type:'style',
      style_level:styleLevel,
      style_name:term,
      display_label:term,
      item_count
    }))
    .sort((a,b)=>b.item_count-a.item_count||a.display_label.localeCompare(b.display_label));
  const buckets=groupWorksByWeek(rows,field).map(row=>({
    ...row,
    works:[],
    scope_id:'classification',
    entry_type:'style',
    classification_dimension:'style',
    classification_level:styleLevel
  }));
  return {groups,buckets};
}

export async function selectScopeStyleGroups(scopeId,{startDate,endDate,styleLevel='label'}={}){
  return (await selectScopeStyleSnapshot(scopeId,{startDate,endDate,styleLevel})).groups;
}

export async function selectScopeStyleWorks(scopeId,{startDate,endDate,styleName,styleLevel='label',limit=20,pageOffset=0}={}){
  if(!startDate||!styleName)return {rows:[],hasMore:false,nextOffset:null};
  const pageSize=Math.max(1,Math.min(100,Math.floor(Number(limit)||20)));
  const offset=Math.max(0,Math.floor(Number(pageOffset)||0));
  const field=styleLevel==='group'?'style_group':'style_label';
  const matches=[];
  const rows=await selectScopeStyleRows(scopeId,{startDate,endDate});
  for(const row of rows){
    if(String(row[field]||'')===String(styleName))matches.push(row);
  }
  matches.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const page=matches.slice(offset,offset+pageSize).map(row=>{
    const isMedia=String(row.record_type||'')==='galaxy_media'||Boolean(row.media_id);
    return {
      ...row,
      entry_id:row.galaxy_id||row.media_id||row.record_id,
      entry_type:isMedia?'media_metadata':'work',
      start_date:row.created_at,
      date:row.created_at,
      display_date:formatCultureDateTime(row.created_at),
      title:decodeCultureText(row.title||'').trim()||row.style_label||row.style_group||'作品',
      description:'',
      media_metadata_text:isMedia?mediaMetadataDescription(row):'',
      group_label:String(row[field]||''),
      scope_id:runtimeScopeId(scopeId)
    };
  });
  const hasMore=offset+pageSize<matches.length;
  return {rows:page,hasMore,nextOffset:hasMore?offset+pageSize:null};
}
