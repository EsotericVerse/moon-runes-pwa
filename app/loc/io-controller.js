'use client';

import pMap,{pMapIterable} from 'p-map';

export const IO_PROFILE=Object.freeze({
  metadata:Object.freeze({
    initialBatch:128,
    targetBytes:768*1024,
    targetMs:500
  }),
  heavy:Object.freeze({
    initialBatch:4,
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
    pressureCooldownMs:5000
  }),
  workers:Object.freeze({
    concurrency:2,
    backpressure:2
  })
});

let activeRequests=0;
let recentLatencyMs=0;
let pressureUntil=0;
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
  if(recentLatencyMs>=scheduler.slowRequestMs)return scheduler.minConcurrentRequests;
  if(recentLatencyMs>0&&recentLatencyMs<=scheduler.fastRequestMs)return scheduler.maxConcurrentRequests;
  return scheduler.minConcurrentRequests;
}

function updateLatency(sampleMs){
  const value=Math.max(1,Number(sampleMs)||1);
  recentLatencyMs=recentLatencyMs?recentLatencyMs*0.7+value*0.3:value;
}

function pumpRequestQueue(){
  const allowed=desiredRequestConcurrency();
  while(activeRequests<allowed&&requestQueue.length){
    const job=requestQueue.shift();
    activeRequests+=1;
    const started=nowMs();
    Promise.resolve()
      .then(job.task)
      .then(value=>{
        updateLatency(nowMs()-started);
        job.resolve(value);
      })
      .catch(error=>{
        updateLatency(nowMs()-started);
        if(isPressureError(error))pressureUntil=Date.now()+IO_PROFILE.scheduler.pressureCooldownMs;
        job.reject(error);
      })
      .finally(()=>{
        activeRequests-=1;
        pumpRequestQueue();
      });
  }
}

export function runNeonIo(task){
  if(typeof task!=='function')throw new TypeError('IO task must be a function');
  return new Promise((resolve,reject)=>{
    requestQueue.push({task,resolve,reject});
    pumpRequestQueue();
  });
}

export function reportNeonIoError(error){
  if(isPressureError(error))pressureUntil=Date.now()+IO_PROFILE.scheduler.pressureCooldownMs;
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
  return Math.max(1,Math.round(base*factor));
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
    requestConcurrency:desiredRequestConcurrency()
  };
}
