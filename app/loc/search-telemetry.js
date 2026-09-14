'use client';

const STORAGE_KEY='loc-search-telemetry-v1';
const MAX_RUNS=80;

function readRuns(){
  if(typeof window==='undefined')return [];
  try{
    const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    return Array.isArray(value)?value:[];
  }catch{return []}
}

function writeRuns(runs){
  if(typeof window==='undefined')return;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(runs.slice(-MAX_RUNS)))}catch{}
}

export function recordSearchTelemetry({collection,dataset,segments=0,bytes=0,hits=0,elapsedMs=0}){
  if(typeof window==='undefined')return;
  const runs=readRuns();
  runs.push({
    at:new Date().toISOString(),
    collection:String(collection||''),
    dataset:String(dataset||''),
    segments:Math.max(0,Number(segments)||0),
    bytes:Math.max(0,Number(bytes)||0),
    hits:Math.max(0,Number(hits)||0),
    elapsed_ms:Math.max(0,Math.round(Number(elapsedMs)||0))
  });
  writeRuns(runs);
}

export function getSearchTelemetrySummary(){
  const runs=readRuns();
  return runs.reduce((summary,run)=>{
    summary.runs+=1;
    summary.segments+=Number(run.segments||0);
    summary.bytes+=Number(run.bytes||0);
    summary.hits+=Number(run.hits||0);
    summary.elapsed_ms+=Number(run.elapsed_ms||0);
    return summary;
  },{runs:0,segments:0,bytes:0,hits:0,elapsed_ms:0});
}

export function clearSearchTelemetry(){writeRuns([])}
