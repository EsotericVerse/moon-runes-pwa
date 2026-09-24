'use client';

import {ScopeCultureResponseSchema} from './scope-feature-contracts';
import {selectNeonRows} from './neon-repository';

const PERIOD_TABLE='api.lo3rwang_context_entries';
const PERIOD_COLUMNS='context_key,context_type,title,summary,era_id,period,entry_name,start_date,end_date,order_no,status,anchor_id,start_anchor_id,end_anchor_id,date_value,date_status,entry_scope,visibility,event_id,year_value';
const RUNE_CONTEXT_COLUMNS='context_key,context_type,title,summary,entry_scope,description,context_date,date_status,anchor_id,before_id,after_id,order_no,rune_count,rune_number,literature_id,work_id,status,milestone,style_prompt,ranking_types';

function periodRows(rows){
  return (rows||[]).map(row=>({
    era_id:row.era_id||row.context_key,
    period:row.period||row.context_key||'',
    name:row.entry_name||row.title||row.context_key,
    title:row.title||row.context_key,
    description:row.summary||'',
    start_date:row.start_date||row.date_value||null,
    end_date:row.end_date||null,
    order:Number(row.order_no||0),
    status:row.status||'',
    anchor_id:row.anchor_id||null,
    start_anchor_id:row.start_anchor_id||null,
    end_anchor_id:row.end_anchor_id||null,
    date_status:row.date_status||''
  })).sort((a,b)=>a.order-b.order||String(a.period).localeCompare(String(b.period)));
}

function runeTimelineRows(rows){
  const anchors=(rows||[]).map(row=>({
    id:row.context_key,
    entry_id:row.context_key,
    era_id:row.context_key,
    period:row.title||row.context_key,
    name:row.title||row.context_key,
    title:row.title||row.context_key,
    description:row.description||row.summary||'',
    date:row.context_date||null,
    start_date:row.context_date||null,
    end_date:null,
    scope_id:'runes',
    status:row.status||'',
    rune_count:Number(row.rune_count||0)
  })).filter(row=>row.start_date).sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date)));
  const current=anchors.find(row=>String(row.status).toLowerCase()==='current'||Number(row.rune_count)===66);
  return {
    eras:current?[{...current,period:'符文66',name:'符文66',title:'符文66',status:'current'}]:[],
    history:anchors.filter(row=>row!==current).map(row=>({...row,status:'history'}))
  };
}

export async function selectScopeCultureData(scopeId){
  const id=String(scopeId||'');
  if(!['loc','runes','lo3rwang'].includes(id))throw new Error('Scope 無效');

  if(id==='loc'){
    const [author,runes]=await Promise.all([
      selectNeonRows(PERIOD_TABLE,{columns:PERIOD_COLUMNS,filters:[{column:'context_type',operator:'in',value:['period','event','anchor']}],limit:5000}),
      selectNeonRows('api.runes_context_entries',{columns:RUNE_CONTEXT_COLUMNS,filters:[{column:'context_type',operator:'eq',value:'anchor'}],limit:5000})
    ]);
    const authorPeriods=periodRows((author.rows||[]).filter(row=>row.context_type==='period')).map(row=>({...row,scope_id:'lo3rwang',group_label:'lo3rwang 時期'}));
    const runeTimeline=runeTimelineRows(runes.rows);
    return ScopeCultureResponseSchema.parse({
      scopeId:id,
      eras:{eras:authorPeriods},
      authorEras:{eras:authorPeriods},
      runeEras:{eras:runeTimeline.eras},
      runeHistory:{records:runeTimeline.history},
      periods:authorPeriods,
      events:[],
      trajectories:[],
      works:[],
      authorKeywords:{keywords:[]},
      musicPeriods:{periods:[]},
      writingPeriods:{periods:[]}
    });
  }

  const [periods,runePeriods]=await Promise.all([
    id==='lo3rwang'?selectNeonRows(PERIOD_TABLE,{columns:PERIOD_COLUMNS,filters:[{column:'context_type',operator:'in',value:['period','event','anchor']}],limit:5000}):Promise.resolve({rows:[]}),
    id==='runes'?selectNeonRows('api.runes_context_entries',{columns:RUNE_CONTEXT_COLUMNS,filters:[{column:'context_type',operator:'eq',value:'anchor'}],limit:5000}):Promise.resolve({rows:[]})
  ]);
  const scopeContext=periods.rows||[];
  const eraSource=scopeContext.filter(row=>row.context_type==='period');
  const runeTimeline=runeTimelineRows(runePeriods.rows);
  const eras=periodRows(eraSource);
  const contextEvents=id==='lo3rwang'?scopeContext.filter(row=>row.context_type==='event').map(row=>({
    entry_id:row.event_id||row.context_key,
    event_id:row.event_id||row.context_key,
    title:row.title,
    description:row.summary||'',
    date:row.date_value||null,
    start_date:row.start_date||row.date_value||null,
    end_date:row.end_date||null,
    status:row.status||'',
    visibility:row.visibility||'public'
  })): [];
  const contextAnchors=id==='lo3rwang'?scopeContext.filter(row=>row.context_type==='anchor').map(row=>({
    entry_id:row.context_key,
    trajectory_id:row.context_key,
    title:row.title,
    description:row.summary||'',
    start_date:row.date_value||row.start_date||null,
    date:row.date_value||null,
    end_date:row.end_date||null,
    anchor_id:row.anchor_id||null,
    status:row.status||''
  })): [];
  return ScopeCultureResponseSchema.parse({
    scopeId:id,
    eras:{eras:id==='runes'?runeTimeline.eras:eras},
    authorEras:id==='lo3rwang'?{eras}:undefined,
    runeEras:{eras:runeTimeline.eras},
    runeHistory:{records:runeTimeline.history},
    periods:eraSource,
    events:contextEvents,
    trajectories:contextAnchors,
    works:[],
    authorKeywords:{keywords:[]},
    musicPeriods:{periods:[]},
    writingPeriods:{periods:[]}
  });
}

export async function selectAuthorPeriodWorks({startDate,endDate,limit=200}={}){
  if(!startDate)return [];
  const filters=[{column:'created_at',operator:'gte',value:startDate}];
  if(endDate)filters.push({column:'created_at',operator:'lte',value:endDate+'T23:59:59.999Z'});
  const rows=[];
  const pageSize=Math.max(1,Math.min(1000,Math.floor(Number(limit)||1000)));
  for(let offset=0;;offset+=pageSize){
    const result=await selectNeonRows('api.lo3rwang_galaxy',{
      columns:'galaxy_id,category,content_type,source_platform,source_role,title,content,created_at,source_ref,source_id,work_id',
      filters,
      orders:[{column:'created_at',ascending:false}],
      range:[offset,offset+pageSize-1]
    });
    rows.push(...result.rows);
    if(result.rows.length<pageSize)break;
  }
  return rows.map(row=>({
    ...row,
    start_date:row.created_at,
    date:row.created_at,
    entry_id:row.galaxy_id,
    title:row.title||String(row.content||'').trim().slice(0,72)||row.source_platform||row.galaxy_id,
    description:String(row.content||'').trim().slice(0,400),
    group_label:row.content_type||row.category||row.source_role||'作品',
    scope_id:'lo3rwang'
  }));
}
