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
  const [culture,periods,runePeriods]=await Promise.all([
    id==='loc'?selectNeonRows(CULTURE_TABLES.loc,{columns:'scope_id,entry_key,entry_type,title,date,start_date,end_date,era_id,source,style,keywords,body,url,payload,is_derived,manual_override,source_ref',filters:[{column:'scope_id',operator:'eq',value:'loc'}],limit:5000}):Promise.resolve({rows:[]}),
    id==='lo3rwang'?selectNeonRows(CULTURE_TABLES.periods,{columns:'context_key,context_type,title,summary,payload',filters:[{column:'context_type',operator:'eq',value:'period'}],limit:5000}):Promise.resolve({rows:[]}),
    id==='runes'?selectNeonRows('api.runes_context_entries',{columns:'context_key,context_type,title,summary,payload',filters:[{column:'context_type',operator:'in',value:['period','era']}],limit:5000}):Promise.resolve({rows:[]})
  ]);
  const cultureRowsRaw=culture.rows||[];
  const PERSONAL_CULTURE_START='2026-01-30';
  const periodContext=(periods.rows||[]).flatMap(row=>{
    if(id!=='lo3rwang')return [row];
    const payload=row?.payload&&typeof row.payload==='object'&&!Array.isArray(row.payload)?row.payload:{};
    const end=payload.end_date||row.end_date||null;
    if(end&&String(end)<PERSONAL_CULTURE_START)return [];
    const start=payload.start_date||row.start_date||null;
    if(start&&String(start)<PERSONAL_CULTURE_START){
      return [{...row,payload:{...payload,start_date:PERSONAL_CULTURE_START}}];
    }
    return [row];
  });
  const historyValue={records:[]};
  const runeEras=periodRows(runePeriods.rows||[]);
  const eraSource=id==='loc'?cultureRowsRaw.filter(row=>['era','period'].includes(row.entry_type)):periodContext;
  const eras=periodRows(eraSource);
  return ScopeCultureResponseSchema.parse({scopeId:id,eras:{eras:id==='runes'?runeEras:eras},authorEras:id==='loc'||id==='lo3rwang'?{eras}:undefined,runeEras:{eras:runeEras},runeHistory:historyValue,periods:eraSource,events:cultureRows(cultureRowsRaw,'event'),trajectories:cultureRows(cultureRowsRaw,'trajectory'),works:cultureRows(cultureRowsRaw,'work'),authorKeywords:{keywords:[]},musicPeriods:{periods:[]},writingPeriods:{periods:[]}});
}
