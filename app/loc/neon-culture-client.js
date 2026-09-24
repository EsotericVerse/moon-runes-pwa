'use client';

import {ScopeCultureResponseSchema} from './scope-feature-contracts';
import {selectNeonRows} from './neon-repository';

const TIMELINE_COLUMNS='scope_id,entry_key,entry_type,title,summary,start_date,end_date,era_id,period,entry_name,order_no,status,anchor_id,start_anchor_id,end_anchor_id,before_id,after_id,date_status,entry_scope,visibility,event_id,year_value,rune_count,source_id,source,note';

function periodRows(rows){
  return (rows||[]).map(row=>({
    era_id:row.era_id||row.entry_key||row.context_key,
    period:row.period||row.entry_key||row.context_key||'',
    name:row.entry_name||row.title||row.entry_key||row.context_key,
    title:row.title||row.entry_key||row.context_key,
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
    id:row.entry_key||row.context_key,
    entry_id:row.entry_key||row.context_key,
    era_id:row.entry_key||row.context_key,
    period:row.title||row.entry_key||row.context_key,
    name:row.title||row.entry_key||row.context_key,
    title:row.title||row.entry_key||row.context_key,
    description:row.summary||row.description||'',
    date:row.start_date||row.context_date||null,
    start_date:row.start_date||row.context_date||null,
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
  const scopes=id==='loc'?['lo3rwang','runes']:[id];
  const {rows}=await selectNeonRows('api.loc_timeline_entries',{
    columns:TIMELINE_COLUMNS,
    filters:[
      {column:'scope_id',operator:'in',value:scopes},
      {column:'entry_type',operator:'in',value:['period','period_legacy','event','anchor']}
    ],
    orders:[{column:'start_date',ascending:true}],
    limit:5000
  });
  const scopeContext=rows||[];
  const authorContext=scopeContext.filter(row=>row.scope_id==='lo3rwang');
  const runeContext=scopeContext.filter(row=>row.scope_id==='runes'&&row.entry_type==='anchor');
  const eraSource=authorContext.filter(row=>row.entry_type==='period');
  const runeTimeline=runeTimelineRows(runeContext);
  const eras=periodRows(eraSource);
  const contextEvents=id==='lo3rwang'?authorContext.filter(row=>row.entry_type==='event').map(row=>({
    entry_id:row.event_id||row.entry_key,
    event_id:row.event_id||row.entry_key,
    title:row.title,
    description:row.summary||'',
    date:row.start_date||null,
    start_date:row.start_date||null,
    end_date:row.end_date||null,
    status:row.status||'',
    visibility:row.visibility||'public'
  })): [];
  const contextAnchors=id==='lo3rwang'?authorContext.filter(row=>row.entry_type==='anchor').map(row=>({
    entry_id:row.entry_key,
    trajectory_id:row.entry_key,
    title:row.title,
    description:row.summary||'',
    start_date:row.start_date||null,
    date:row.start_date||null,
    end_date:row.end_date||null,
    anchor_id:row.anchor_id||null,
    status:row.status||''
  })): [];
  const authorPeriods=periodRows(eraSource).map(row=>({...row,scope_id:'lo3rwang',group_label:'lo3rwang 時期'}));
  return ScopeCultureResponseSchema.parse({
    scopeId:id,
    eras:{eras:id==='runes'?runeTimeline.eras:(id==='loc'?authorPeriods:eras)},
    authorEras:id==='lo3rwang'||id==='loc'?{eras:id==='loc'?authorPeriods:eras}:undefined,
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
      columns:'galaxy_id,category,content_type,source_platform,source_role,title,content,content_hash,created_at,source_ref,source_id,work_id',
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
