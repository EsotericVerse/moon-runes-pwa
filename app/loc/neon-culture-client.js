'use client';

import {ScopeCultureResponseSchema} from './scope-feature-contracts';
import {callNeonRpc,selectNeonRows} from './neon-repository';
import {decodeCultureText,formatCultureDateTime} from '../modular-v2/modules/culture-timeline/culture-timeline-model.mjs';

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

function timelineItems(rows){
  const all=Array.isArray(rows)?rows:[];
  const anchors=new Map(all.filter(row=>row.entry_type==='anchor').map(row=>[
    `${row.scope_id}:${row.anchor_id}`,
    row
  ]));
  return all.filter(row=>['anchor','event','period','style'].includes(row.entry_type)).map(row=>{
    const before=anchors.get(`${row.scope_id}:${row.before_id}`);
    const after=anchors.get(`${row.scope_id}:${row.after_id}`);
    const startAnchor=anchors.get(`${row.scope_id}:${row.start_anchor_id}`);
    const endAnchor=anchors.get(`${row.scope_id}:${row.end_anchor_id}`);
    const start=row.start_date||startAnchor?.start_date||before?.start_date||after?.start_date||null;
    const end=row.end_date||endAnchor?.start_date||null;
    const kindLabel={anchor:'定錨點',event:'事件',period:'時期',style:'風格'}[row.entry_type];
    return {
      ...row,
      id:`${row.scope_id}:${row.entry_key}`,
      entry_id:`${row.scope_id}:${row.entry_key}`,
      start_date:start,
      end_date:end,
      date:start,
      display_label:row.entry_type==='style'?(row.entry_name||row.title):row.title,
      group_label:`${row.scope_id} · ${kindLabel}`
    };
  }).filter(row=>row.start_date).sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date)));
}

export async function selectScopeCultureData(scopeId){
  const id=String(scopeId||'');
  if(!['loc','runes','lo3rwang'].includes(id))throw new Error('Scope 無效');
  const scopes=id==='loc'?['lo3rwang','runes']:[id];
  const {rows}=await selectNeonRows('api.loc_timeline_entries',{
    columns:TIMELINE_COLUMNS,
    filters:[
      {column:'scope_id',operator:'in',value:scopes},
      {column:'entry_type',operator:'in',value:['period','period_legacy','event','anchor','style']}
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
    timelineItems:timelineItems(scopeContext),
    events:contextEvents,
    trajectories:contextAnchors,
    works:[],
    authorKeywords:{keywords:[]},
    musicPeriods:{periods:[]},
    writingPeriods:{periods:[]}
  });
}

export async function selectAuthorPeriodWorks({startDate,endDate,limit=100,pageOffset=0}={}){
  if(!startDate)return {rows:[],hasMore:false,nextOffset:null};
  const filters=[{column:'created_at',operator:'gte',value:`${String(startDate).slice(0,10)}T00:00:00+08:00`}];
  if(endDate)filters.push({column:'created_at',operator:'lte',value:String(endDate).slice(0,10)+'T23:59:59.999+08:00'});
  const pageSize=Math.max(1,Math.min(1000,Math.floor(Number(limit)||1000)));
  const offset=Math.max(0,Math.floor(Number(pageOffset)||0));
  const result=await selectNeonRows('api.lo3rwang_galaxy',{
    columns:'galaxy_id,category,content_type,source_platform,source_role,title,content,content_hash,created_at,source_ref,source_id,work_id',
    filters,
    orders:[{column:'created_at',ascending:false}],
    range:[offset,offset+pageSize-1]
  });
  return {
    rows:result.rows.map(row=>{
      const content=decodeCultureText(row.content||'');
      return {
        ...row,
        start_date:row.created_at,
        date:row.created_at,
        display_date:formatCultureDateTime(row.created_at),
        entry_id:row.galaxy_id,
        title:decodeCultureText(row.title||'').trim()||content.trim().slice(0,72)||row.source_platform||row.galaxy_id,
        description:content.trim().slice(0,400),
        group_label:row.source_platform||'未標示來源',
        scope_id:'lo3rwang'
      };
    }),
    hasMore:result.rows.length===pageSize,
    nextOffset:result.rows.length===pageSize?offset+pageSize:null
  };
}

export async function selectAuthorPeriodWorkCounts({startDate,endDate}={}){
  if(!startDate)return [];
  const rows=await callNeonRpc('loc_culture_weekly_source_counts',{
    p_start_date:dateTextForQuery(startDate),
    p_end_date:endDate?dateTextForQuery(endDate):null
  });
  return Array.isArray(rows)?rows:[];
}

function dateTextForQuery(value){return String(value||'').slice(0,10)}
