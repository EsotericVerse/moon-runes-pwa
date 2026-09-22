'use client';

export {LOC_DATA,neonSourceCandidates} from './data-paths.mjs';
import {LOC_DATA,neonSourceCandidates} from './data-paths.mjs';
import {neonClient} from './neon-client';

const memoryCache=new Map();
const DEFAULT_GLOBAL_CONCURRENCY=2;
const DEFAULT_MAX_BATCH_ITEMS=24;
const DEFAULT_MEMORY_CACHE_ENTRIES=24;
const DEFAULT_MAX_SEGMENTS=8;
let activeRequests=0;
const waiters=[];

function acquireSlot(limit=DEFAULT_GLOBAL_CONCURRENCY){
  if(activeRequests<limit){activeRequests+=1;return Promise.resolve();}
  return new Promise(resolve=>waiters.push({resolve,limit}));
}
function releaseSlot(){
  activeRequests=Math.max(0,activeRequests-1);
  for(let index=0;index<waiters.length;index+=1){
    const waiter=waiters[index];
    if(activeRequests<waiter.limit){
      waiters.splice(index,1);activeRequests+=1;waiter.resolve();return;
    }
  }
}
function trimMemoryCache(maxEntries=DEFAULT_MEMORY_CACHE_ENTRIES){
  while(memoryCache.size>maxEntries){memoryCache.delete(memoryCache.keys().next().value);}
}
function touchMemoryCache(key){
  if(!memoryCache.has(key))return;
  const value=memoryCache.get(key);memoryCache.delete(key);memoryCache.set(key,value);
}

async function fetchNeonJson(path){
  const candidates=neonSourceCandidates(path);
  if(!candidates.length)throw new Error('LOC Neon data path is required');
  await acquireSlot();
  try{
    const result=await neonClient.from('runtime_json_documents')
      .select('source_path,blob_sha,payload,imported_at')
      .in('source_path',candidates)
      .limit(candidates.length);
    if(result?.error)throw new Error(`Neon runtime document SELECT failed: ${result.error.message||'query failed'}`);
    const rows=Array.isArray(result?.data)?result.data:[];
    const byPath=new Map(rows.map(row=>[String(row.source_path||''),row]));
    const row=candidates.map(candidate=>byPath.get(candidate)).find(Boolean);
    if(!row)throw new Error(`Neon runtime document not found: ${candidates.at(-1)}`);
    return row.payload;
  }finally{releaseSlot();}
}

export async function fetchRuneRows(runeNumbers){
  const numbers=[...new Set((runeNumbers||[]).map(Number).filter(Number.isInteger))];
  if(!numbers.length)return [];
  const result=await neonClient.from('lrunes_runes')
    .select('rune_number,rune_name,canonical_payload,updated_at')
    .in('rune_number',numbers);
  if(result?.error)throw new Error(`Neon rune SELECT failed: ${result.error.message||'query failed'}`);
  return Array.isArray(result?.data)?result.data:[];
}

export function fetchLocJson(path,{memory=true,maxMemoryEntries=DEFAULT_MEMORY_CACHE_ENTRIES}={}){
  const key=String(path||'').trim();
  if(!key)throw new Error('LOC Neon data path is required');
  if(!memory)return fetchNeonJson(key);
  if(memoryCache.has(key)){touchMemoryCache(key);return memoryCache.get(key);}
  const request=fetchNeonJson(key).catch(error=>{memoryCache.delete(key);throw error;});
  memoryCache.set(key,request);trimMemoryCache(maxMemoryEntries);return request;
}

export function fetchLocStaticJson(path){
  return fetchLocJson(path);
}

export async function fetchLocJsonBatch(items,{concurrency=DEFAULT_GLOBAL_CONCURRENCY,maxItems=DEFAULT_MAX_BATCH_ITEMS,memory=true}={}){
  const queue=[...items];
  if(queue.length>maxItems)throw new Error(`LOC data batch has ${queue.length} items; budget allows ${maxItems}`);
  const results=new Array(queue.length);let cursor=0;
  async function worker(){
    while(true){const index=cursor++;if(index>=queue.length)return;const item=queue[index];results[index]=await fetchLocJson(typeof item==='string'?item:item.path,{memory});}
  }
  const workerCount=Math.max(1,Math.min(concurrency,DEFAULT_GLOBAL_CONCURRENCY,queue.length||1));
  await Promise.all(Array.from({length:workerCount},()=>worker()));return results;
}

function segmentRecord(path,index,extra={}){return{id:path,path,sequence:index+1,bytes:Number(extra.bytes||0),scope:extra.scope||{},routing_keys:extra.routing_keys||[]};}

export async function getLocDataDataset(datasetId,{memory=true}={}){
  const manifestPaths={
    'loc4-text-corpus':LOC_DATA.TEXT_CORPUS_MANIFEST,
    'loc3-lyrics-search':LOC_DATA.MUSIC_SEARCH_MANIFEST,
    'loc4-offline-history':LOC_DATA.OFFLINE_HISTORY_MANIFEST,
    'threads-main-posts':LOC_DATA.THREADS_BROWSER_MANIFEST,
    'facebook-posts':LOC_DATA.FACEBOOK_MANIFEST
  };
  const manifestPath=manifestPaths[datasetId];
  if(!manifestPath)throw new Error(`Unknown LOC data dataset: ${datasetId}`);
  const manifest=await fetchLocJson(manifestPath,{memory});
  const shards=Array.isArray(manifest?.shards)?manifest.shards:[];
  return{id:datasetId,tier:'on-demand',strategy:'manifest-shards',segments:shards.map((item,index)=>{
    const raw=typeof item==='string'?item:item?.path||item?.name||'';
    return segmentRecord(String(raw).replace(/^\/+/,''),index,typeof item==='object'?item:{});
  })};
}

export async function fetchLocDataSegments(datasetId,{segmentIds,fromSequence,toSequence,maxSegments=DEFAULT_MAX_SEGMENTS,memory=true}={}){
  const dataset=await getLocDataDataset(datasetId,{memory});
  let segments=Array.isArray(dataset?.segments)?dataset.segments:[];
  if(Array.isArray(segmentIds)&&segmentIds.length){const wanted=new Set(segmentIds);segments=segments.filter(segment=>wanted.has(segment.id));}
  if(Number.isFinite(Number(fromSequence)))segments=segments.filter(segment=>Number(segment.sequence)>=Number(fromSequence));
  if(Number.isFinite(Number(toSequence)))segments=segments.filter(segment=>Number(segment.sequence)<=Number(toSequence));
  segments=[...segments].sort((a,b)=>Number(a.sequence||0)-Number(b.sequence||0));
  if(segments.length>maxSegments)throw new Error(`LOC dataset ${datasetId} selected ${segments.length} segments; budget allows ${maxSegments}`);
  const data=await fetchLocJsonBatch(segments.map(segment=>segment.path),{maxItems:maxSegments,memory});
  return segments.map((segment,index)=>({segment,data:data[index]}));
}

export function clearLocJsonCache(path){if(path)memoryCache.delete(String(path||''));else memoryCache.clear();}
export function refreshLocDataVersionManifest(){clearLocJsonCache();return Promise.resolve({provider:'neon-data-api'});}
export function refreshLocDataIndex(){clearLocJsonCache();return Promise.resolve({provider:'neon-data-api'});}
export const LOC_IO_BUDGET=Object.freeze({maxBatchItems:DEFAULT_MAX_BATCH_ITEMS,maxConcurrentRequests:DEFAULT_GLOBAL_CONCURRENCY,maxMemoryEntries:DEFAULT_MEMORY_CACHE_ENTRIES,maxSegments:DEFAULT_MAX_SEGMENTS});
