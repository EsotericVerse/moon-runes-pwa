'use client';

const MAX_RUNS=80;
let runtimeRuns=[];

export function recordSearchTelemetry({collection,dataset,segments=0,bytes=0,hits=0,elapsedMs=0}){
  if(typeof window==='undefined')return;
  runtimeRuns.push({
    at:new Date().toISOString(),
    collection:String(collection||''),
    dataset:String(dataset||''),
    segments:Math.max(0,Number(segments)||0),
    bytes:Math.max(0,Number(bytes)||0),
    hits:Math.max(0,Number(hits)||0),
    elapsed_ms:Math.max(0,Math.round(Number(elapsedMs)||0))
  });
  runtimeRuns=runtimeRuns.slice(-MAX_RUNS);
}

export function getSearchTelemetrySummary(){
  return runtimeRuns.reduce((summary,run)=>{
    summary.runs+=1;
    summary.segments+=Number(run.segments||0);
    summary.bytes+=Number(run.bytes||0);
    summary.hits+=Number(run.hits||0);
    summary.elapsed_ms+=Number(run.elapsed_ms||0);
    return summary;
  },{runs:0,segments:0,bytes:0,hits:0,elapsed_ms:0});
}

export function clearSearchTelemetry(){runtimeRuns=[]}
