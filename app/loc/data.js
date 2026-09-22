'use client';

export {LOC_DATA} from './data-paths.mjs';
import {LOC_DATA} from './data-paths.mjs';
import {selectNeonRows} from './neon-repository';

const memoryCache=new Map();
const DEFAULT_GLOBAL_CONCURRENCY=2;
const DEFAULT_MAX_BATCH_ITEMS=24;
const DEFAULT_MEMORY_CACHE_ENTRIES=24;
const DEFAULT_MAX_SEGMENTS=8;
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
    if(activeRequests<waiter.limit){waiters.splice(index,1);activeRequests+=1;waiter.resolve();return;}
  }
}
function trimMemoryCache(maxEntries=DEFAULT_MEMORY_CACHE_ENTRIES){
  while(memoryCache.size>maxEntries)memoryCache.delete(memoryCache.keys().next().value);
}
function touchMemoryCache(key){
  if(!memoryCache.has(key))return;
  const value=memoryCache.get(key);memoryCache.delete(key);memoryCache.set(key,value);
}
function runeRows(rows){
  return (rows||[]).map(row=>({
    編號:row.rune_number,
    符文名稱:row.rune_name,
    所屬分組:row.group_name,
    英文:row.english_name,
    ...(row.canonical_payload&&typeof row.canonical_payload==='object'?row.canonical_payload:{})
  }));
}
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
async function fetchCanonical(path){
  const normalized=sourcePath(path);
  await acquireSlot();
  try{
    if(normalized==='canonical/runes'||normalized==='canonical/lots'||normalized==='canonical/rune-interpretations'){
      const {rows}=await selectNeonRows('silver.lrunes_runes',{columns:'rune_number,rune_name,group_name,english_name,canonical_payload',orders:[{column:'rune_number',ascending:true}],limit:5000});
      return runeRows(rows);
    }
    if(normalized==='canonical/rune-grammar'){
      return (await selectNeonRows('silver.lrunes_algorithm',{columns:'algorithm_id,name,definition,input_contract,output_contract,source_ref,lifecycle,updated_at',orders:[{column:'algorithm_id',ascending:true}],limit:5000})).rows;
    }
    if(normalized==='canonical/harmony'){
      return (await selectNeonRows('silver.lrunes_harmony',{columns:'rune_number,rune_name,soul_question,practice_challenge,ritual_advice,harmony_advice,source_payload',orders:[{column:'rune_number',ascending:true}],limit:5000})).rows;
    }
    if(['canonical/history','evolution/daily-rune-history','context/loc8-events'].includes(normalized)){
      const {rows}=await selectNeonRows('silver.lrunes_evolution_history',{columns:'history_id,history_kind,sequence_no,title,body,source_payload',orders:[{column:'sequence_no',ascending:true,nullsFirst:false}],limit:5000});
      return mergeHistory(rows);
    }
    if(normalized==='culture/lrunes-periods'){
      const {rows}=await selectNeonRows('silver.runes_context_entries',{columns:'context_key,context_type,title,summary,payload',filters:[{column:'context_type',operator:'in',value:['period','era']}],limit:5000});
      return {eras:periodRows(rows)};
    }
    if(normalized==='culture/lo3rwang-periods'){
      const {rows}=await selectNeonRows('silver.lo3rwang_period_context_entries',{columns:'context_key,context_type,title,summary,payload',filters:[{column:'context_type',operator:'eq',value:'period'}],limit:5000});
      return {eras:periodRows(rows)};
    }
    if(normalized==='knowledge/faq'){
      return (await selectNeonRows('silver.faq_entries',{columns:'faq_id,category,intent,question,aliases,answer,keywords,related_ids,source_refs,canon_version,status',orders:[{column:'faq_id',ascending:true}],limit:5000})).rows;
    }
    if(normalized==='context/cross-relations'){
      return (await selectNeonRows('silver.content_relations',{columns:'*',orders:[{column:'updated_at',ascending:false,nullsFirst:false}],limit:5000})).rows;
    }
    if(normalized==='culture/zhengde-keywords'){
      const [{rows:works},{rows:semantics}]=await Promise.all([
        selectNeonRows('silver.works',{columns:'work_id,scope',filters:[{column:'scope',operator:'eq',value:'lo3rwang'}],limit:5000}),
        selectNeonRows('silver.work_semantics',{columns:'work_id,theme_tags,emotion_tags,imagery_tags,context_tags,genre_tags',limit:5000})
      ]);
      const wanted=new Set(works.map(row=>row.work_id));
      const counts=new Map();
      for(const row of semantics)if(wanted.has(row.work_id))for(const keyword of flattenTags(row))counts.set(keyword,(counts.get(keyword)||0)+1);
      return {keywords:[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([name,count])=>({name,count}))};
    }
    if(normalized==='literary/loc4-writing'){
      const [{rows:works},{rows:semantics},{rows:songs}]=await Promise.all([
        selectNeonRows('silver.works',{columns:'work_id,scope,work_type,title,created_date,period_code,era_code,era_name,content_origin,source_status,source_ref',filters:[{column:'scope',operator:'eq',value:'lo3rwang'}],orders:[{column:'created_date',ascending:false,nullsFirst:false}],limit:5000}),
        selectNeonRows('silver.work_semantics',{columns:'work_id,ai_summary,theme_tags,emotion_tags,imagery_tags,context_tags,genre_tags',limit:5000}),
        selectNeonRows('silver.song_versions',{columns:'work_id,title,suno_url,version_label,is_representative,song_id',limit:5000})
      ]);
      const semanticsByWork=new Map(semantics.map(row=>[row.work_id,row]));
      const songsByWork=new Map();
      for(const song of songs){
        if(!song.suno_url)continue;
        const list=songsByWork.get(song.work_id)||[];
        list.push({title:song.title,url:song.suno_url,source_type:'song',role:song.version_label});
        songsByWork.set(song.work_id,list);
      }
      return {works:works.map(row=>{
        const semantic=semanticsByWork.get(row.work_id)||{};
        return {...row,...semantic,summary:semantic.ai_summary||'',period:row.period_code||row.era_code||'',period_name:row.era_name||row.period_code||'',tags:[...new Set(flattenTags(semantic))],source_refs:songsByWork.get(row.work_id)||[]};
      })};
    }
    if(normalized==='knowledge/assets'){
      return {assets:(await selectNeonRows('silver.knowledge_assets',{columns:'asset_id,owner_scope,title,body,asset_type,source_ref,rights_ref,lifecycle,metadata,updated_at',orders:[{column:'updated_at',ascending:false,nullsFirst:false}],limit:5000})).rows};
    }
    if(['canonical/three-card-combinations','context/loc2-events','culture/loc3-period-keywords','governance/loc6','culture/period-keywords','culture/loc6-period-keywords','context/graph-schema','governance/style-groups','media/registry','knowledge/search-governance','knowledge/search-stats'].includes(normalized))return [];
    if(normalized.startsWith('dataset/'))return {shards:[]};
    throw new Error(`此 Neon semantic data key 尚未對應 canonical table: ${normalized}`);
  }finally{releaseSlot();}
}
export function fetchLocStaticJson(path){return fetchLocJson(path);}
export function fetchLocJson(path,{memory=true,maxMemoryEntries=DEFAULT_MEMORY_CACHE_ENTRIES}={}){
  const normalized=sourcePath(path);
  if(!memory)return fetchCanonical(normalized);
  if(memoryCache.has(normalized)){touchMemoryCache(normalized);return memoryCache.get(normalized);}
  const request=fetchCanonical(normalized).catch(error=>{memoryCache.delete(normalized);throw error;});
  memoryCache.set(normalized,request);trimMemoryCache(maxMemoryEntries);return request;
}
export async function fetchRuneRows(runeNumbers){
  const wanted=new Set((runeNumbers||[]).map(Number).filter(Number.isInteger));
  if(!wanted.size)return [];
  const rows=await fetchLocJson(LOC_DATA.RUNES,{memory:true});
  return (Array.isArray(rows)?rows:[]).filter(row=>wanted.has(Number(row?.編號))).map(row=>({rune_number:Number(row.編號),canonical_payload:row}));
}
export async function fetchLocJsonBatch(items,{concurrency=DEFAULT_GLOBAL_CONCURRENCY,maxItems=DEFAULT_MAX_BATCH_ITEMS,memory=true}={}){
  const queue=[...items];if(queue.length>maxItems)throw new Error(`LOC data batch has ${queue.length} items; budget allows ${maxItems}`);
  const results=new Array(queue.length);let cursor=0;
  async function worker(){while(true){const index=cursor++;if(index>=queue.length)return;const item=queue[index];results[index]=await fetchLocJson(typeof item==='string'?item:item.path,{memory});}}
  const workerCount=Math.max(1,Math.min(concurrency,DEFAULT_GLOBAL_CONCURRENCY,queue.length||1));
  await Promise.all(Array.from({length:workerCount},()=>worker()));return results;
}
function segmentRecord(path,index,extra={}){return {id:path,path,sequence:index+1,bytes:Number(extra.bytes||0),scope:extra.scope||{},routing_keys:extra.routing_keys||[]};}
export async function getLocDataDataset(datasetId,{memory=true}={}){
  const manifestPaths={'loc4-text-corpus':LOC_DATA.TEXT_CORPUS_MANIFEST,'loc3-lyrics-search':LOC_DATA.MUSIC_SEARCH_MANIFEST,'loc4-offline-history':LOC_DATA.OFFLINE_HISTORY_MANIFEST,'threads-main-posts':LOC_DATA.THREADS_BROWSER_MANIFEST,'facebook-posts':LOC_DATA.FACEBOOK_MANIFEST};
  const path=manifestPaths[datasetId];if(!path)throw new Error(`Unknown LOC data dataset: ${datasetId}`);
  const manifest=await fetchLocJson(path,{memory});const shards=Array.isArray(manifest?.shards)?manifest.shards:[];
  return {id:datasetId,tier:'on-demand',strategy:'neon-canonical',segments:shards.map((item,index)=>segmentRecord(String(typeof item==='string'?item:item?.path||item?.name||''),index,typeof item==='object'?item:{}))};
}
export async function fetchLocDataSegments(datasetId,{segmentIds,fromSequence,toSequence,maxSegments=DEFAULT_MAX_SEGMENTS,memory=true}={}){
  const dataset=await getLocDataDataset(datasetId,{memory});let segments=Array.isArray(dataset?.segments)?dataset.segments:[];
  if(Array.isArray(segmentIds)&&segmentIds.length){const wanted=new Set(segmentIds);segments=segments.filter(segment=>wanted.has(segment.id));}
  if(Number.isFinite(Number(fromSequence)))segments=segments.filter(segment=>Number(segment.sequence)>=Number(fromSequence));
  if(Number.isFinite(Number(toSequence)))segments=segments.filter(segment=>Number(segment.sequence)<=Number(toSequence));
  segments=[...segments].sort((a,b)=>Number(a.sequence||0)-Number(b.sequence||0));
  if(segments.length>maxSegments)throw new Error(`LOC dataset ${datasetId} selected ${segments.length} segments; budget allows ${maxSegments}`);
  const data=await fetchLocJsonBatch(segments.map(segment=>segment.path),{maxItems:maxSegments,memory});
  return segments.map((segment,index)=>({segment,data:data[index]}));
}
export function clearLocJsonCache(path){if(path)memoryCache.delete(sourcePath(path));else memoryCache.clear();}
export function refreshLocDataVersionManifest(){clearLocJsonCache();return Promise.resolve({provider:'neon-canonical-api'});}
export function refreshLocDataIndex(){clearLocJsonCache();return Promise.resolve({provider:'neon-canonical-api'});}
export const LOC_IO_BUDGET=Object.freeze({maxBatchItems:DEFAULT_MAX_BATCH_ITEMS,maxConcurrentRequests:DEFAULT_GLOBAL_CONCURRENCY,maxMemoryEntries:DEFAULT_MEMORY_CACHE_ENTRIES,maxSegments:DEFAULT_MAX_SEGMENTS});
