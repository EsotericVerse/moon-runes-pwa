'use client';

const STORAGE_KEY='loc-search-segment-routing-v1';
const MAX_KEYS=256;
const MAX_SEGMENTS_PER_KEY=12;

function tokens(value){
  const text=String(value||'').normalize('NFKC').toLocaleLowerCase('zh-Hant');
  const out=[];
  for(const run of text.match(/[\u3400-\u9fff]+/g)||[]){
    const chars=Array.from(run);
    for(let i=0;i<chars.length;i+=1){out.push(chars[i]);if(i+1<chars.length)out.push(chars[i]+chars[i+1]);}
  }
  for(const word of text.match(/[a-z0-9][a-z0-9_-]{1,}/g)||[])out.push(word);
  return [...new Set(out)].slice(0,24);
}

async function digest(value){
  const bytes=new TextEncoder().encode(value);
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash).slice(0,8),byte=>byte.toString(16).padStart(2,'0')).join('');
}

async function queryKeys(query){return Promise.all(tokens(query).map(digest));}
function readStore(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}}
function writeStore(store){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(store))}catch{}}

export async function rankSearchSegments(datasetId,segments,query){
  if(typeof window==='undefined'||!segments?.length)return segments||[];
  const keys=await queryKeys(query);
  if(!keys.length)return segments;
  const store=readStore();
  return [...segments].sort((a,b)=>{
    const score=segment=>keys.reduce((sum,key)=>sum+Number(store?.[datasetId]?.[key]?.[segment.id]||0),0);
    return score(b)-score(a)||Number(a.sequence||0)-Number(b.sequence||0);
  });
}

export async function recordSearchSegmentHits(datasetId,segmentId,query,hitCount){
  if(typeof window==='undefined'||!segmentId||hitCount<=0)return;
  const keys=await queryKeys(query);
  if(!keys.length)return;
  const store=readStore();
  const dataset=store[datasetId]&&typeof store[datasetId]==='object'?store[datasetId]:{};
  for(const key of keys){
    const row=dataset[key]&&typeof dataset[key]==='object'?dataset[key]:{};
    row[segmentId]=Math.min(1000,Number(row[segmentId]||0)+hitCount);
    dataset[key]=Object.fromEntries(Object.entries(row).sort((a,b)=>b[1]-a[1]).slice(0,MAX_SEGMENTS_PER_KEY));
  }
  const trimmed=Object.fromEntries(Object.entries(dataset).slice(-MAX_KEYS));
  store[datasetId]=trimmed;
  writeStore(store);
}
