export { LOC_DATA } from './data-paths.mjs';
import { LOC_DATA } from './data-paths.mjs';
import {selectNeonRows} from './neon-repository';

const DEFAULT_GLOBAL_CONCURRENCY=2;
const DEFAULT_MAX_BATCH_ITEMS=24;
let activeRequests=0;
const waiters=[];

function sourcePath(path){
  const normalized=String(path||'').trim().replace(/^\/+/, '');
  if(!normalized)throw new Error('LOC Neon data path is required');
  return normalized;
}

function acquireSlot(limit=DEFAULT_GLOBAL_CONCURRENCY){
  if(activeRequests<limit){activeRequests+=1;return Promise.resolve();}
  return new Promise(resolve=>waiters.push({resolve,limit}));
}

function releaseSlot(){
  activeRequests=Math.max(0,activeRequests-1);
  for(let index=0;index<waiters.length;index+=1){
    const waiter=waiters[index];
    if(activeRequests<waiter.limit){
      waiters.splice(index,1);
      activeRequests+=1;
      waiter.resolve();
      return;
    }
  }
}

function runeRows(rows){return (rows||[]).map(row=>({
  編號:row.rune_number,符文名稱:row.rune_name,所屬分組:row.group_name,英文:row.english_name,
  lots_positive:row.lots_positive,lots_negative:row.lots_negative,lots_half_positive:row.lots_half_positive,lots_half_negative:row.lots_half_negative,
  神話故事:row.myth_story,符文演化歷史:row.rune_evolution_history,
  source_ref:row.source_ref,updated_at:row.updated_at
}));}
function periodRows(rows){return (rows||[]).map(row=>{const key=row.entry_key||row.context_key||row.period||'';return {era_id:key,period:row.period||key,name:row.entry_name||row.title||key,title:row.title||row.entry_name||key,description:row.summary||'',order:Number(row.order_no)||0,status:row.status||''};});}

async function fetchCanonical(path){
  const normalized=sourcePath(path);
  await acquireSlot();
  try{
    if(normalized==='canonical/runes'||normalized==='canonical/lots'||normalized==='canonical/rune-interpretations'){
      const {rows}=await selectNeonRows('silver.lrunes',{columns:'rune_number,rune_name,group_name,english_name,lots_positive,lots_negative,lots_half_positive,lots_half_negative,myth_story,rune_evolution_history,source_ref,updated_at',orders:[{column:'rune_number',ascending:true}],limit:100});
      return runeRows(rows);
    }
    if(normalized==='canonical/rune-grammar')return (await selectNeonRows('silver.lrunes_algorithm',{columns:'algorithm_id,name,definition,source_ref,lifecycle,updated_at',limit:5000})).rows;
    if(normalized==='canonical/harmony')return (await selectNeonRows('silver.lrunes_harmony',{columns:'rune_number,rune_name,soul_question,practice_challenge,ritual_advice,harmony_advice,updated_at',limit:5000})).rows;
    if(normalized==='culture/lrunes-periods')return {eras:periodRows((await selectNeonRows('silver.lrunes_style_time',{columns:'entry_key,entry_type,title,summary,period,entry_name,order_no,status,updated_at',filters:[{column:'entry_type',operator:'eq',value:'period'}],orders:[{column:'start_date',ascending:true}],limit:5000})).rows)};
    if(normalized==='culture/lo3rwang-periods')return {eras:periodRows((await selectNeonRows('silver.lo3rwang_style_time',{columns:'entry_key,entry_type,title,summary,period,entry_name,order_no,status,updated_at',filters:[{column:'entry_type',operator:'eq',value:'period'}],orders:[{column:'start_date',ascending:true}],limit:5000})).rows)};
    if(normalized==='context/content-relations')return (await selectNeonRows('silver.lrunes_style_context',{columns:'context_id,context_type,rune_number,related_rune_number,relation_type,title,rule_text,note,order_no',filters:[{column:'context_type',operator:'eq',value:'relation'},{column:'active',operator:'eq',value:true}],orders:[{column:'order_no',ascending:true}],limit:5000})).rows;
    throw new Error(`Neon canonical data path is not mapped: ${normalized}`);
  }finally{releaseSlot();}
}

export function fetchNeonData(path){
  return fetchCanonical(sourcePath(path));
}

export async function fetchRuneRows(runeNumbers){
  const wanted=new Set((runeNumbers||[]).map(Number).filter(Number.isInteger));
  if(!wanted.size)return [];
  const rows=await fetchNeonData(LOC_DATA.RUNES,{memory:true});
  return (Array.isArray(rows)?rows:[])
    .filter(row=>wanted.has(Number(row?.編號)))
    .map(row=>({rune_number:Number(row.編號),rune_data:row}));
}

export async function fetchNeonDataBatch(items,{concurrency=DEFAULT_GLOBAL_CONCURRENCY,maxItems=DEFAULT_MAX_BATCH_ITEMS,memory=true}={}){
  const queue=[...items];
  if(queue.length>maxItems)throw new Error(`LOC data batch has ${queue.length} items; budget allows ${maxItems}`);
  const results=new Array(queue.length);
  let cursor=0;
  async function worker(){
    while(true){
      const index=cursor++;
      if(index>=queue.length)return;
      const item=queue[index];
      const path=typeof item==='string'?item:item.path;
      results[index]=await fetchNeonData(path,{memory});
    }
  }
  const workerCount=Math.max(1,Math.min(concurrency,DEFAULT_GLOBAL_CONCURRENCY,queue.length||1));
  await Promise.all(Array.from({length:workerCount},()=>worker()));
  return results;
}

export function clearNeonDataCache(){
  return;
}

export function refreshLocDataVersionManifest(){
  clearNeonDataCache();
  return Promise.resolve({provider:'neon-canonical-api'});
}

export function refreshLocDataIndex(){
  clearNeonDataCache();
  return Promise.resolve({provider:'neon-canonical-api'});
}

export const LOC_IO_BUDGET=Object.freeze({
  maxBatchItems:DEFAULT_MAX_BATCH_ITEMS,
  maxConcurrentRequests:DEFAULT_GLOBAL_CONCURRENCY,
  maxMemoryEntries:0
});
