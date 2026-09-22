'use client';

import {z} from 'zod';
import {selectNeonRows} from './neon-repository';

const RowSchema=z.object({}).passthrough();
const CultureSchema=z.object({
  scopeId:z.enum(['loc','runes','lo3rwang']),
  eras:z.object({eras:z.array(RowSchema).default([])}).default({eras:[]}),
  authorEras:z.object({eras:z.array(RowSchema).default([])}).optional(),
  runeEras:z.object({eras:z.array(RowSchema).default([])}).default({eras:[]}),
  runeHistory:z.record(z.string(),z.unknown()).default({}),
  periods:z.array(RowSchema).default([]),
  authorKeywords:z.object({keywords:z.array(RowSchema).default([])}).default({keywords:[]}),
  musicPeriods:z.record(z.string(),z.unknown()).default({periods:[]}),
  writingPeriods:z.record(z.string(),z.unknown()).default({periods:[]})
});

function periodRows(rows){
  return (rows||[]).map(row=>({
    era_id:row.payload?.era_id||row.context_key,
    period:row.payload?.period||row.context_key||'',
    name:row.payload?.name||row.title||row.context_key,
    title:row.title||row.context_key,
    description:row.summary||'',
    start_date:row.payload?.start_date||null,
    end_date:row.payload?.end_date||null,
    order:Number(row.payload?.order||0),
    status:row.payload?.status||''
  })).sort((a,b)=>a.order-b.order);
}

function mergeHistory(rows){
  const result={records:(rows||[]).map(row=>({...row,body:row.body||{},source_payload:row.source_payload||{}}))};
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

function flattenTags(row){
  return [row?.theme_tags,row?.emotion_tags,row?.imagery_tags,row?.context_tags,row?.genre_tags]
    .filter(Array.isArray).flat().map(value=>String(value||'').trim()).filter(Boolean);
}

function buildWorkRows(works,semantics){
  const byWork=new Map((semantics||[]).map(row=>[row.work_id,row]));
  return (works||[]).map(work=>({...work,...(byWork.get(work.work_id)||{})}));
}

function buildWorkPeriods(rows,acceptedTypes){
  const buckets=new Map();
  for(const row of rows||[]){
    if(acceptedTypes.size&&!acceptedTypes.has(row.work_type))continue;
    const period=row.period_code||row.era_code||row.era_name||'未分類';
    const key=`${row.work_type||'work'}:${period}`;
    const bucket=buckets.get(key)||{period,work_type:row.work_type||'work',work_count:0,keywords:new Map(),workIds:new Set()};
    if(!bucket.workIds.has(row.work_id)){bucket.workIds.add(row.work_id);bucket.work_count+=1;}
    for(const keyword of flattenTags(row))bucket.keywords.set(keyword,(bucket.keywords.get(keyword)||0)+1);
    buckets.set(key,bucket);
  }
  return {periods:[...buckets.values()].sort((a,b)=>String(a.period).localeCompare(String(b.period))).map(bucket=>({
    period:bucket.period,work_type:bucket.work_type,work_count:bucket.work_count,
    keywords:[...bucket.keywords.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([keyword,count])=>({keyword,count}))
  }))};
}

function buildAuthorKeywords(rows){
  const counts=new Map();
  for(const row of rows||[])for(const keyword of flattenTags(row))counts.set(keyword,(counts.get(keyword)||0)+1);
  return {keywords:[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([name,count])=>({name,count}))};
}

export async function selectScopeCultureData(scopeId){
  const scope=String(scopeId||'');
  if(!['loc','runes','lo3rwang'].includes(scope))throw new Error('Scope 無效');
  const [periodResult,historyResult,worksResult,semanticsResult]=await Promise.all([
    scope==='runes'?Promise.resolve({rows:[]}):selectNeonRows('silver.lo3rwang_period_context_entries',{
      columns:'context_key,context_type,title,summary,payload',
      filters:[{column:'context_type',operator:'eq',value:'period'}],
      orders:[{column:'context_key',ascending:true}],limit:5000
    }),
    scope==='lo3rwang'?Promise.resolve({rows:[]}):selectNeonRows('silver.lrunes_evolution_history',{
      columns:'history_id,history_kind,sequence_no,title,body,source_payload',
      orders:[{column:'sequence_no',ascending:true,nullsFirst:false}],limit:5000
    }),
    scope==='runes'?Promise.resolve({rows:[]}):selectNeonRows('silver.works',{
      columns:'work_id,work_type,period_code,era_code,era_name,scope',
      filters:[{column:'scope',operator:'eq',value:'lo3rwang'}],limit:5000
    }),
    scope==='runes'?Promise.resolve({rows:[]}):selectNeonRows('silver.work_semantics',{
      columns:'work_id,theme_tags,emotion_tags,imagery_tags,context_tags,genre_tags',limit:5000
    })
  ]);
  const periods=periodResult.rows||[];
  const historyRows=historyResult.rows||[];
  const workRows=buildWorkRows(worksResult.rows||[],semanticsResult.rows||[]);
  const eras=periodRows(periods);
  const runeHistory=mergeHistory(historyRows);
  const runeEras=[...(Array.isArray(runeHistory.eras)?runeHistory.eras:[]),...(Array.isArray(runeHistory.rune_periods)?runeHistory.rune_periods:[])]
    .filter((row,index,array)=>row&&array.findIndex(item=>JSON.stringify(item)===JSON.stringify(row))===index);
  return CultureSchema.parse({
    scopeId:scope,
    eras:{eras:scope==='runes'?runeEras:eras},
    authorEras:scope==='loc'||scope==='lo3rwang'?{eras}:undefined,
    runeEras:{eras:runeEras},
    runeHistory,
    periods:periods.map(row=>({...row,payload:row.payload||{}})),
    authorKeywords:buildAuthorKeywords(workRows),
    musicPeriods:buildWorkPeriods(workRows,new Set(['music'])),
    writingPeriods:buildWorkPeriods(workRows,new Set(['writing','novel','literary','text']))
  });
}
