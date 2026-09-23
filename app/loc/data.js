export { LOC_DATA } from './data-paths.mjs';
import { LOC_DATA } from './data-paths.mjs';
import {selectNeonRows} from './neon-repository';

const memoryCache=new Map();
const DEFAULT_GLOBAL_CONCURRENCY=2;
const DEFAULT_MAX_BATCH_ITEMS=24;
const DEFAULT_MEMORY_CACHE_ENTRIES=24;
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

function trimMemoryCache(maxEntries=DEFAULT_MEMORY_CACHE_ENTRIES){
  while(memoryCache.size>maxEntries){
    const oldestKey=memoryCache.keys().next().value;
    memoryCache.delete(oldestKey);
  }
}

function touchMemoryCache(key){
  if(!memoryCache.has(key))return;
  const value=memoryCache.get(key);
  memoryCache.delete(key);
  memoryCache.set(key,value);
}

function runeRows(rows){return (rows||[]).map(row=>({編號:row.rune_number,符文名稱:row.rune_name,所屬分組:row.group_name,英文:row.english_name,...(row.canonical_payload&&typeof row.canonical_payload==='object'?row.canonical_payload:{})}));}
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
function periodRows(rows){return (rows||[]).map(row=>({era_id:row.payload?.era_id||row.context_key,period:row.payload?.period||row.context_key||'',name:row.payload?.name||row.title||row.context_key,title:row.title||row.context_key,description:row.summary||'',start_date:row.payload?.start_date||null,end_date:row.payload?.end_date||null,order:Number(row.payload?.order||0),status:row.payload?.status||''})).sort((a,b)=>a.order-b.order);}
function tags(row){return [row.theme_tags,row.emotion_tags,row.imagery_tags,row.context_tags,row.genre_tags].filter(Array.isArray).flat().filter(Boolean);}

async function fetchCanonical(path){
  const normalized=sourcePath(path);
  await acquireSlot();
  try{
    if(normalized==='canonical/runes'||normalized==='canonical/lots'||normalized==='canonical/rune-interpretations'){
      const {rows}=await selectNeonRows('silver.lrunes_runes',{columns:'rune_number,rune_name,group_name,english_name,canonical_payload',orders:[{column:'rune_number',ascending:true}],limit:100});
      return runeRows(rows);
    }
    if(normalized==='canonical/rune-grammar')return (await selectNeonRows('silver.lrunes_algorithm',{limit:5000})).rows;
    if(normalized==='canonical/harmony')return (await selectNeonRows('silver.lrunes_harmony',{limit:5000})).rows;
    if(normalized==='culture/lrunes-periods')return {eras:periodRows((await selectNeonRows('silver.runes_context_entries',{filters:[{column:'context_type',operator:'in',value:['period','era']}],limit:5000})).rows)};
    if(normalized==='culture/lo3rwang-periods')return {eras:periodRows((await selectNeonRows('silver.lo3rwang_period_context_entries',{filters:[{column:'context_type',operator:'eq',value:'period'}],limit:5000})).rows)};
    if(normalized==='knowledge/faq')return (await selectNeonRows('silver.faq_entries',{limit:5000})).rows;
    if(normalized==='context/cross-relations')return (await selectNeonRows('silver.content_relations',{limit:5000})).rows;
    if(normalized==='culture/zhengde-keywords'){
      const [workResult,semanticResult]=await Promise.all([
        selectNeonRows('silver.works',{columns:'work_id',filters:[{column:'scope',operator:'eq',value:'lo3rwang'}],limit:5000}),
        selectNeonRows('silver.work_semantics',{columns:'work_id,theme_tags,emotion_tags,imagery_tags,context_tags,genre_tags',limit:5000})
      ]);
      const ids=new Set(workResult.rows.map(row=>row.work_id));const counts=new Map();
      for(const row of semanticResult.rows.filter(item=>ids.has(item.work_id)))for(const tag of tags(row))counts.set(tag,(counts.get(tag)||0)+1);
      return {keywords:[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([name,count])=>({name,count}))};
    }
    if(normalized==='literary/loc4-writing'){
      const [works,semantics,songs]=await Promise.all([
        selectNeonRows('silver.works',{filters:[{column:'scope',operator:'eq',value:'lo3rwang'}],limit:5000}),
        selectNeonRows('silver.work_semantics',{limit:5000}),
        selectNeonRows('silver.song_versions',{columns:'song_id,work_id,title,suno_url,version_label,is_representative',limit:5000})
      ]);
      const byWork=new Map(semantics.rows.map(row=>[row.work_id,row]));
      return {works:works.rows.map(row=>{const semantic=byWork.get(row.work_id)||{};const source_refs=songs.rows.filter(song=>song.work_id===row.work_id&&song.suno_url).map(song=>({title:song.title,url:song.suno_url,source_type:'song',role:song.version_label}));return {...row,...semantic,summary:semantic.ai_summary||'',period:row.period_code||row.era_code||'',period_name:row.era_name||row.period_code||'',tags:[...new Set(tags(semantic))],source_refs};})};
    }
    throw new Error(`Neon canonical data path is not mapped: ${normalized}`);
  }finally{releaseSlot();}
}

export function fetchNeonData(path,{memory=true,maxMemoryEntries=DEFAULT_MEMORY_CACHE_ENTRIES}={}){
  const normalized=sourcePath(path);
  if(!memory)return fetchCanonical(normalized);
  if(memoryCache.has(normalized)){touchMemoryCache(normalized);return memoryCache.get(normalized);}
  const request=fetchCanonical(normalized).catch(error=>{memoryCache.delete(normalized);throw error;});
  memoryCache.set(normalized,request);
  trimMemoryCache(maxMemoryEntries);
  return request;
}

export async function fetchRuneRows(runeNumbers){
  const wanted=new Set((runeNumbers||[]).map(Number).filter(Number.isInteger));
  if(!wanted.size)return [];
  const rows=await fetchNeonData(LOC_DATA.RUNES,{memory:true});
  return (Array.isArray(rows)?rows:[])
    .filter(row=>wanted.has(Number(row?.編號)))
    .map(row=>({rune_number:Number(row.編號),canonical_payload:row}));
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

export function clearNeonDataCache(path){
  if(path)memoryCache.delete(sourcePath(path));
  else memoryCache.clear();
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
  maxMemoryEntries:DEFAULT_MEMORY_CACHE_ENTRIES
});
