'use client';

import pMap,{pMapIterable} from 'p-map';
import {MAX_SELECT_ROWS} from './query-policy';

export const IO_PROFILE=Object.freeze({
  metadata:Object.freeze({
    initialBatch:128,
    maxBatch:MAX_SELECT_ROWS,
    targetBytes:768*1024,
    targetMs:500
  }),
  heavy:Object.freeze({
    initialBatch:4,
    maxBatch:MAX_SELECT_ROWS,
    targetBytes:256*1024,
    targetMs:450
  }),
  write:Object.freeze({
    targetBytes:512*1024
  }),
  scheduler:Object.freeze({
    minConcurrentRequests:1,
    maxConcurrentRequests:2,
    fastRequestMs:250,
    slowRequestMs:800,
    fastGapMs:60,
    normalGapMs:140,
    slowGapMs:400,
    pressureGapMs:1200,
    pressureCooldownMs:15000,
    busyQueueThreshold:4
  }),
  workers:Object.freeze({
    concurrency:2,
    backpressure:2
  })
});

let activeRequests=0;
let recentLatencyMs=0;
let pressureUntil=0;
let nextRequestAt=0;
let pumpTimer=null;
const requestQueue=[];

function nowMs(){
  return globalThis.performance?.now?.()??Date.now();
}

function isPressureError(error){
  const message=String(error?.message||error||'').toLowerCase();
  return /429|rate|throttl|timeout|503|502|504|network|fetch failed|connection/.test(message);
}

function desiredRequestConcurrency(){
  const scheduler=IO_PROFILE.scheduler;
  if(Date.now()<pressureUntil)return scheduler.minConcurrentRequests;
  if(requestQueue.length>=scheduler.busyQueueThreshold)return scheduler.minConcurrentRequests;
  if(recentLatencyMs>=scheduler.slowRequestMs)return scheduler.minConcurrentRequests;
  if(recentLatencyMs>0&&recentLatencyMs<=scheduler.fastRequestMs)return scheduler.maxConcurrentRequests;
  return scheduler.minConcurrentRequests;
}

function requestGapMs(){
  const scheduler=IO_PROFILE.scheduler;
  if(Date.now()<pressureUntil)return scheduler.pressureGapMs;
  if(recentLatencyMs>=scheduler.slowRequestMs)return scheduler.slowGapMs;
  if(requestQueue.length>=scheduler.busyQueueThreshold)return scheduler.normalGapMs;
  if(recentLatencyMs>0&&recentLatencyMs<=scheduler.fastRequestMs)return scheduler.fastGapMs;
  return scheduler.normalGapMs;
}

function schedulePump(delay=0){
  if(pumpTimer!==null)return;
  pumpTimer=setTimeout(()=>{
    pumpTimer=null;
    pumpRequestQueue();
  },Math.max(0,Math.floor(Number(delay)||0)));
}

function updateLatency(sampleMs){
  const value=Math.max(1,Number(sampleMs)||1);
  recentLatencyMs=recentLatencyMs?recentLatencyMs*0.7+value*0.3:value;
}

function pumpRequestQueue(){
  if(!requestQueue.length)return;
  const allowed=desiredRequestConcurrency();
  if(activeRequests>=allowed)return;

  const now=Date.now();
  const wait=Math.max(0,nextRequestAt-now);
  if(wait>0){
    schedulePump(wait);
    return;
  }

  const job=requestQueue.shift();
  activeRequests+=1;
  const gap=requestGapMs();
  nextRequestAt=Date.now()+gap;
  const started=nowMs();

  Promise.resolve()
    .then(job.task)
    .then(value=>{
      updateLatency(nowMs()-started);
      job.resolve(value);
    })
    .catch(error=>{
      updateLatency(nowMs()-started);
      if(isPressureError(error)){
        pressureUntil=Date.now()+IO_PROFILE.scheduler.pressureCooldownMs;
        nextRequestAt=Math.max(nextRequestAt,Date.now()+IO_PROFILE.scheduler.pressureGapMs);
      }
      job.reject(error);
    })
    .finally(()=>{
      activeRequests-=1;
      pumpRequestQueue();
    });

  if(requestQueue.length)schedulePump(gap);
}

export function runNeonIo(task){
  if(typeof task!=='function')throw new TypeError('IO task must be a function');
  return new Promise((resolve,reject)=>{
    requestQueue.push({task,resolve,reject});
    pumpRequestQueue();
  });
}

export function reportNeonIoError(error){
  if(!isPressureError(error))return;
  pressureUntil=Date.now()+IO_PROFILE.scheduler.pressureCooldownMs;
  nextRequestAt=Math.max(nextRequestAt,Date.now()+IO_PROFILE.scheduler.pressureGapMs);
  if(pumpTimer!==null){
    clearTimeout(pumpTimer);
    pumpTimer=null;
  }
  schedulePump(IO_PROFILE.scheduler.pressureGapMs);
}

export function estimatePayloadBytes(rows){
  return new TextEncoder().encode(JSON.stringify(rows||[])).byteLength;
}

export function nextAdaptiveBatchSize({
  current,
  payloadBytes=0,
  requestMs=0,
  consumerMs=0,
  profile='metadata'
}={}){
  const config=IO_PROFILE[profile]||IO_PROFILE.metadata;
  const base=Math.max(1,Math.floor(Number(current)||config.initialBatch));
  const byteRatio=payloadBytes>0?config.targetBytes/payloadBytes:2;
  const elapsed=Math.max(Number(requestMs)||0,Number(consumerMs)||0,1);
  const timeRatio=config.targetMs/elapsed;
  const factor=Math.max(0.35,Math.min(4,byteRatio,timeRatio));
  const maxBatch=Math.max(1,Math.floor(Number(config.maxBatch)||MAX_SELECT_ROWS));
  return Math.min(maxBatch,Math.max(1,Math.round(base*factor)));
}

export function initialBatchSize(profile='metadata'){
  return Math.max(1,Math.floor(Number(IO_PROFILE[profile]?.initialBatch)||1));
}

export function chunkRowsByPayload(rows){
  const source=Array.isArray(rows)?rows:[rows];
  const target=Math.max(1024,Math.floor(Number(IO_PROFILE.write.targetBytes)||512*1024));
  const chunks=[];
  let current=[];
  let currentBytes=2;
  for(const row of source){
    const rowBytes=new TextEncoder().encode(JSON.stringify(row??{})).byteLength+1;
    if(current.length&&currentBytes+rowBytes>target){
      chunks.push(current);
      current=[];
      currentBytes=2;
    }
    current.push(row);
    currentBytes+=rowBytes;
  }
  if(current.length)chunks.push(current);
  return chunks;
}

export function mapIoTasks(items,mapper){
  const list=Array.isArray(items)?items:[...items];
  return pMap(list,mapper,{concurrency:IO_PROFILE.workers.concurrency});
}

export function mapIoIterable(items,mapper){
  return pMapIterable(items,mapper,{
    concurrency:IO_PROFILE.workers.concurrency,
    backpressure:Math.max(IO_PROFILE.workers.backpressure,IO_PROFILE.workers.concurrency)
  });
}

export function ioControllerState(){
  return {
    activeRequests,
    queuedRequests:requestQueue.length,
    recentLatencyMs,
    pressure:Boolean(Date.now()<pressureUntil),
    requestConcurrency:desiredRequestConcurrency(),
    requestGapMs:requestGapMs(),
    nextRequestAt
  };
}
