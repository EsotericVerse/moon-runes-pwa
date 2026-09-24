'use client';

import {ScopeCultureResponseSchema} from './scope-feature-contracts';
import {selectNeonRows} from './neon-repository';

const CULTURE_TABLES=Object.freeze({
  loc:'api.loc_culture_entries',
  periods:'api.lo3rwang_context_entries'
});

function periodRows(rows){
  return (rows||[]).map(row=>{
    const payload=row?.payload&&typeof row.payload==='object'&&!Array.isArray(row.payload)?row.payload:{};
    return ({
    ...payload,
    era_id:payload.era_id||row.context_key,
    period:payload.period||row.context_key||'',
    name:payload.name||row.title||row.context_key,
    title:row.title||row.context_key,
    description:row.summary||'',
    start_date:row.start_date||payload.start_date||row.date||null,
    end_date:row.end_date||payload.end_date||null,
    order:Number(payload.order||0),
    status:payload.status||'',
    anchor_type:payload.anchor_type||payload.anchor?.type||null,
    anchor_role:payload.anchor_role||payload.anchor?.role||null,
    is_primary_anchor:Boolean(payload.is_primary_anchor??payload.primary_anchor??payload.anchor?.primary??false),
    is_rc_zone:Boolean(payload.is_rc_zone??payload.rc_zone??payload.anchor?.rc_zone??false)
  });}).sort((a,b)=>a.order-b.order||String(a.period).localeCompare(String(b.period)));
}

function mergeHistory(rows){
  const result={records:(rows||[]).map(row=>({history_id:row.history_id,history_kind:row.history_kind,sequence_no:row.sequence_no,title:row.title,body:row.body||{},source_payload:row.source_payload||{}}))};
  for(const row of rows||[]){
    const body=row?.body;
    if(!body||typeof body!=='object'||Array.isArray(body))continue;
    for(const [key,value] of Object.entries(body)){
      if(Array.isArray(value))result[key]=[...(Array.isArray(result[key])?result[key]:[]),...value];
      else if(value&&typeof value==='object'&&!Array.isArray(value))result[key]={...(result[key]&&typeof result[key]==='object'?result[key]:{}),...value};
      else if(result[key]===undefined)result[key]=value;
    }
  }
  return result;
}

function cultureRows(rows,type){
  return (rows||[]).filter(row=>row.entry_type===type).map(row=>({entry_id:row.entry_key,event_id:row.entry_key,trajectory_id:row.entry_key,title:row.title,date:row.date,start_date:row.start_date,end_date:row.end_date,era_id:row.era_id,source:row.source,style:row.style,keywords:row.keywords||[],body:row.body,description:row.body||row.payload?.description||row.payload?.summary||'',url:row.url,source_ref:row.source_ref,...(row.payload&&typeof row.payload==='object'?row.payload:{})}));
}

export async function selectScopeCultureData(scopeId){
  const id=String(scopeId||'');
  if(!['loc','runes','lo3rwang'].includes(id))throw new Error('Scope 無效');

  if(id==='loc'){
    const [author,runes]=await Promise.all([
      selectNeonRows('api.lo3rwang_context_entries',{columns:'context_key,context_type,title,summary,payload',filters:[{column:'context_type',operator:'in',value:['period','event','anchor']}],limit:5000}),
      selectNeonRows('api.runes_context_entries',{columns:'context_key,context_type,title,summary,payload',filters:[{column:'context_type',operator:'eq',value:'anchor'}],limit:5000})
    ]);

    const authorPeriods=periodRows((author.rows||[]).filter(row=>row.context_type==='period')).map(row=>({...row,scope_id:'lo3rwang',group_label:'lo3rwang 時期'}));
    const runeHistory=(runes.rows||[]).map(row=>{
      const payload=row?.payload&&typeof row.payload==='object'&&!Array.isArray(row.payload)?row.payload:{};
      return {
        ...payload,
        era_id:row.context_key,
        period:row.context_key,
        name:row.title,
        title:row.title,
        description:row.summary||'',
        start_date:payload.date||null,
        end_date:null,
        order:0,
        status:'history',
        scope_id:'runes'
      };
    }).filter(row=>row.start_date).sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date)));

    return ScopeCultureResponseSchema.parse({
      scopeId:id,
      eras:{eras:authorPeriods},
      authorEras:{eras:authorPeriods},
      runeEras:{eras:runeHistory},
      runeHistory:{records:[]},
      periods:authorPeriods,
      events:[],
      trajectories:[],
      works:[],
      authorKeywords:{keywords:[]},
      musicPeriods:{periods:[]},
      writingPeriods:{periods:[]}
    });
  }

  const [culture,periods,runePeriods]=await Promise.all([
    Promise.resolve({rows:[]}),
    id==='lo3rwang'?selectNeonRows(CULTURE_TABLES.periods,{columns:'context_key,context_type,title,summary,payload',filters:[{column:'context_type',operator:'in',value:['period','event','anchor']}],limit:5000}):Promise.resolve({rows:[]}),
    id==='runes'?selectNeonRows('api.runes_context_entries',{columns:'context_key,context_type,title,summary,payload',filters:[{column:'context_type',operator:'eq',value:'anchor'}],limit:5000}):Promise.resolve({rows:[]})
  ]);
  const cultureRowsRaw=culture.rows||[];
  const scopeContext=periods.rows||[];
  const periodContext=scopeContext.filter(row=>row.context_type==='period');
  const historyValue={records:[]};
  const runeEras=(runePeriods.rows||[]).map(row=>{
    const payload=row?.payload&&typeof row.payload==='object'&&!Array.isArray(row.payload)?row.payload:{};
    return {
      ...payload,
      era_id:row.context_key,
      period:row.context_key,
      name:row.title,
      title:row.title,
      description:row.summary||'',
      start_date:payload.date||null,
      end_date:null,
      order:0,
      status:'history',
      scope_id:'runes'
    };
  }).filter(row=>row.start_date).sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date)));
  const eraSource=periodContext;
  const eras=periodRows(eraSource);
  const contextEvents=id==='lo3rwang'?scopeContext.filter(row=>row.context_type==='event').map(row=>({
    entry_id:row.context_key,event_id:row.context_key,title:row.title,description:row.summary||'',
    ...(row.payload&&typeof row.payload==='object'?row.payload:{})
  })):[];
  const contextAnchors=id==='lo3rwang'?scopeContext.filter(row=>row.context_type==='anchor').map(row=>({
    entry_id:row.context_key,trajectory_id:row.context_key,title:row.title,description:row.summary||'',
    start_date:row.payload?.date||null,date:row.payload?.date||null,
    ...(row.payload&&typeof row.payload==='object'?row.payload:{})
  })):[];
  return ScopeCultureResponseSchema.parse({scopeId:id,eras:{eras:id==='runes'?runeEras:eras},authorEras:id==='lo3rwang'?{eras}:undefined,runeEras:{eras:runeEras},runeHistory:historyValue,periods:eraSource,events:contextEvents,trajectories:contextAnchors,works:[],authorKeywords:{keywords:[]},musicPeriods:{periods:[]},writingPeriods:{periods:[]}});
}

export async function selectAuthorPeriodWorks({startDate,endDate,limit=200}={}){
  if(!startDate)return [];
  const filters=[{column:'created_at',operator:'gte',value:startDate}];
  if(endDate)filters.push({column:'created_at',operator:'lte',value:endDate+'T23:59:59.999Z'});
  const {rows}=await selectNeonRows('api.lo3rwang_galaxy',{
    columns:'galaxy_id,category,content_type,source_platform,source_role,title,content,created_at,source_ref,source_id,work_id',
    filters,
    orders:[{column:'created_at',ascending:false}],
    limit
  });
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
