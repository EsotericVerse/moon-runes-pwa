export { LOC_DATA } from './data-paths.mjs';
import { LOC_DATA } from './data-paths.mjs';

// Shared LOC runtime data is served directly from Neon Data API.
// The endpoint is public by design; api.runtime_json_documents grants SELECT only
// to anonymous/authenticated roles. Database credentials never enter the browser.
const DEFAULT_NEON_DATA_API_URL='https://ep-rapid-queen-b3oyboy6.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';
const memoryCache=new Map();
const DEFAULT_GLOBAL_CONCURRENCY=2;
const DEFAULT_MAX_BATCH_ITEMS=24;
const DEFAULT_MEMORY_CACHE_ENTRIES=24;
const DEFAULT_MAX_SEGMENTS=8;
let activeRequests=0;
const waiters=[];

function apiBaseUrl(){
  return String(process.env.NEXT_PUBLIC_NEON_DATA_API_URL||DEFAULT_NEON_DATA_API_URL).trim().replace(/\/+$/,'');
}

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

async function fetchNeonJson(path){
  const normalized=sourcePath(path);
  const params=new URLSearchParams();
  params.set('select','source_path,blob_sha,payload,imported_at');
  params.set('source_path',`eq.${normalized}`);
  const url=`${apiBaseUrl()}/runtime_json_documents?${params.toString()}`;
  await acquireSlot();
  try{
    const response=await fetch(url,{headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok)throw new Error(`Neon Data API ${response.status}: ${normalized}`);
    const rows=await response.json();
    if(!Array.isArray(rows)||rows.length===0)throw new Error(`Neon Current projection missing: ${normalized}`);
    return rows[0].payload;
  }finally{
    releaseSlot();
  }
}

export function fetchLocJson(path,{memory=true,maxMemoryEntries=DEFAULT_MEMORY_CACHE_ENTRIES}={}){
  const normalized=sourcePath(path);
  if(!memory)return fetchNeonJson(normalized);
  if(memoryCache.has(normalized)){touchMemoryCache(normalized);return memoryCache.get(normalized);}
  const request=fetchNeonJson(normalized).catch(error=>{memoryCache.delete(normalized);throw error;});
  memoryCache.set(normalized,request);
  trimMemoryCache(maxMemoryEntries);
  return request;
}

export async function fetchLocJsonBatch(items,{concurrency=DEFAULT_GLOBAL_CONCURRENCY,maxItems=DEFAULT_MAX_BATCH_ITEMS,memory=true}={}){
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
      results[index]=await fetchLocJson(path,{memory});
    }
  }
  const workerCount=Math.max(1,Math.min(concurrency,DEFAULT_GLOBAL_CONCURRENCY,queue.length||1));
  await Promise.all(Array.from({length:workerCount},()=>worker()));
  return results;
}

function segmentRecord(path,index,extra={}){
  return {id:path,path,sequence:index+1,bytes:Number(extra.bytes||0),scope:extra.scope||{},routing_keys:extra.routing_keys||[]};
}

export async function getLocDataDataset(datasetId){
  if(datasetId==='loc4-text-corpus'){
    const manifest=await fetchLocJson(LOC_DATA.TEXT_CORPUS_MANIFEST);
    const shards=Array.isArray(manifest?.shards)?manifest.shards:[];
    return {id:datasetId,tier:'on-demand',strategy:'manifest-shards',segments:shards.map((item,index)=>segmentRecord(item.path,index,item))};
  }
  if(datasetId==='loc3-lyrics-search'){
    const manifest=await fetchLocJson(LOC_DATA.MUSIC_SEARCH_MANIFEST);
    const shards=Array.isArray(manifest?.shards)?manifest.shards:[];
    return {id:datasetId,tier:'on-demand',strategy:'manifest-shards',segments:shards.map((item,index)=>{
      const path=String(typeof item==='string'?item:item?.path||'');
      const fullPath=path.startsWith('data/')?path:`data/json/search/loc3/${path}`;
      return segmentRecord(fullPath,index,typeof item==='object'?item:{});
    })};
  }
  throw new Error(`Unknown LOC data dataset: ${datasetId}`);
}

export async function fetchLocDataSegments(datasetId,{segmentIds,fromSequence,toSequence,maxSegments=DEFAULT_MAX_SEGMENTS,memory=true}={}){
  const dataset=await getLocDataDataset(datasetId);
  let segments=Array.isArray(dataset?.segments)?dataset.segments:[];
  if(Array.isArray(segmentIds)&&segmentIds.length){const wanted=new Set(segmentIds);segments=segments.filter(segment=>wanted.has(segment.id));}
  if(Number.isFinite(Number(fromSequence)))segments=segments.filter(segment=>Number(segment.sequence)>=Number(fromSequence));
  if(Number.isFinite(Number(toSequence)))segments=segments.filter(segment=>Number(segment.sequence)<=Number(toSequence));
  segments=[...segments].sort((a,b)=>Number(a.sequence||0)-Number(b.sequence||0));
  if(segments.length>maxSegments)throw new Error(`LOC dataset ${datasetId} selected ${segments.length} segments; budget allows ${maxSegments}`);
  const data=await fetchLocJsonBatch(segments.map(segment=>segment.path),{maxItems:maxSegments,memory});
  return segments.map((segment,index)=>({segment,data:data[index]}));
}

export function clearLocJsonCache(path){
  if(path)memoryCache.delete(sourcePath(path));
  else memoryCache.clear();
}

export function refreshLocDataVersionManifest(){
  clearLocJsonCache();
  return Promise.resolve({provider:'neon-data-api'});
}

export function refreshLocDataIndex(){
  clearLocJsonCache();
  return Promise.resolve({provider:'neon-data-api'});
}

export const LOC_IO_BUDGET=Object.freeze({
  maxBatchItems:DEFAULT_MAX_BATCH_ITEMS,
  maxConcurrentRequests:DEFAULT_GLOBAL_CONCURRENCY,
  maxMemoryEntries:DEFAULT_MEMORY_CACHE_ENTRIES,
  maxSegments:DEFAULT_MAX_SEGMENTS
});
