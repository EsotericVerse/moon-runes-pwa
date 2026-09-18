'use client';

import { getLocDataDataset } from './data';

const MAX_KEYS=256;
const MAX_SEGMENTS_PER_KEY=12;
const runtimeStore={};

const RESERVED_LANDING_ROUTES=new Map([
  ['月典','https://loc.lo3rwang.cc/'],['loc','https://loc.lo3rwang.cc/'],['luna codex','https://loc.lo3rwang.cc/'],
  ['月之符文','https://lrunes.lo3rwang.cc/'],['lunarunes','https://lrunes.lo3rwang.cc/'],
  ['符文演算法','https://lrunes.lo3rwang.cc/algorithm'],['符文演算','https://lrunes.lo3rwang.cc/algorithm'],
  ['符文歌曲','https://lrunes.lo3rwang.cc/music'],['符文音樂','https://lrunes.lo3rwang.cc/music'],
  ['符文文學','https://lrunes.lo3rwang.cc/literary'],
  ['符文多媒體','https://lrunes.lo3rwang.cc/multimedia'],
  ['符文脈絡','https://lrunes.lo3rwang.cc/context'],
  ['符文文化','https://lrunes.lo3rwang.cc/culture'],
  ['符文治理','https://lrunes.lo3rwang.cc/governance'],
  ['脈絡對戰','https://lrunes.lo3rwang.cc/duel/fight'],
  ['音樂','https://loc.lo3rwang.cc/music'],
  ['文字創作','https://loc.lo3rwang.cc/literary'],
  ['多媒體','https://loc.lo3rwang.cc/multimedia'],
  ['演算法','https://loc.lo3rwang.cc/algorithm'],
  ['模組','https://loc.lo3rwang.cc/module'],
  ['脈絡','https://loc.lo3rwang.cc/context'],
  ['統計','https://loc.lo3rwang.cc/statics'],
  ['文化','https://loc.lo3rwang.cc/culture'],
  ['治理','https://loc.lo3rwang.cc/governance'],
  ['loc faq','https://loc.lo3rwang.cc/faq'],
  ['月之符文 faq','https://lrunes.lo3rwang.cc/faq']
]);

function landingKey(value){
  return String(value||'').normalize('NFKC').trim().toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,' ');
}
export function resolveReservedLanding(query,host=''){
  const key=landingKey(query);
  const h=String(host||'').toLowerCase();

  if(h==='lrunes.lo3rwang.cc'){
    const scoped=new Map([
      ['月之符文','https://lrunes.lo3rwang.cc/'],
      ['lunarunes','https://lrunes.lo3rwang.cc/'],
      ['符文圖鑑','https://lrunes.lo3rwang.cc/list'],
      ['符文演算法','https://lrunes.lo3rwang.cc/algorithm'],
      ['符文演算','https://lrunes.lo3rwang.cc/algorithm'],
      ['符文歌曲','https://lrunes.lo3rwang.cc/music'],
      ['符文音樂','https://lrunes.lo3rwang.cc/music'],
      ['符文文學','https://lrunes.lo3rwang.cc/literary'],
      ['符文多媒體','https://lrunes.lo3rwang.cc/multimedia'],
      ['符文脈絡','https://lrunes.lo3rwang.cc/context'],
      ['符文文化','https://lrunes.lo3rwang.cc/culture'],
      ['符文治理','https://lrunes.lo3rwang.cc/governance'],
      ['脈絡對戰','https://lrunes.lo3rwang.cc/duel/fight'],
      ['音樂','https://lrunes.lo3rwang.cc/music'],
      ['文字創作','https://lrunes.lo3rwang.cc/literary'],
      ['多媒體','https://lrunes.lo3rwang.cc/multimedia'],
      ['演算法','https://lrunes.lo3rwang.cc/algorithm'],
      ['脈絡','https://lrunes.lo3rwang.cc/context'],
      ['文化','https://lrunes.lo3rwang.cc/culture'],
      ['治理','https://lrunes.lo3rwang.cc/governance'],
      ['faq','https://lrunes.lo3rwang.cc/faq']
    ]);
    return scoped.get(key)||'';
  }

  if(h==='lo3rwang.lo3rwang.cc'){
    const scoped=new Map([
      ['lo3rwang','https://lo3rwang.lo3rwang.cc/'],
      ['政德文化','https://lo3rwang.lo3rwang.cc/culture'],
      ['簡介','https://lo3rwang.lo3rwang.cc/'],
      ['脈絡','https://lo3rwang.lo3rwang.cc/context'],
      ['統計','https://lo3rwang.lo3rwang.cc/statics'],
      ['文化','https://lo3rwang.lo3rwang.cc/culture'],
      ['治理','https://lo3rwang.lo3rwang.cc/governance']
    ]);
    return scoped.get(key)||'';
  }

  if(h==='admin.lo3rwang.cc'){
    const scoped=new Map([
      ['治理','https://admin.lo3rwang.cc/governance'],
      ['管理','https://admin.lo3rwang.cc/'],
      ['脈絡','https://admin.lo3rwang.cc/context'],
      ['統計','https://admin.lo3rwang.cc/statics'],
      ['文化','https://admin.lo3rwang.cc/culture']
    ]);
    return scoped.get(key)||'';
  }

  return RESERVED_LANDING_ROUTES.get(key)||'';
}

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

async function candidateSegments(datasetId,segments,keys){
  let dataset;
  try{dataset=await getLocDataDataset(datasetId);}catch{return segments;}
  const routingIndex=dataset?.routing_index;
  const index=routingIndex?.keys;
  if(!index||typeof index!=='object')return segments;
  const truncated=new Set(Array.isArray(routingIndex?.truncated_keys)?routingIndex.truncated_keys:[]);
  if(keys.some(key=>truncated.has(key)))return segments;
  const ids=new Set();
  for(const key of keys)for(const id of Array.isArray(index[key])?index[key]:[])ids.add(id);
  return ids.size?segments.filter(segment=>ids.has(segment.id)):segments;
}

export async function rankSearchSegments(datasetId,segments,query){
  if(typeof window==='undefined'||!segments?.length)return segments||[];
  const keys=await queryKeys(query);
  if(!keys.length)return segments;
  const routedSegments=await candidateSegments(datasetId,segments,keys);
  const buildKeySets=new Map(routedSegments.map(segment=>[segment.id,new Set(Array.isArray(segment.routing_keys)?segment.routing_keys:[])]));
  const buildScore=segment=>keys.reduce((sum,key)=>sum+(buildKeySets.get(segment.id)?.has(key)?1:0),0);
  const learnedScore=segment=>keys.reduce((sum,key)=>sum+Number(runtimeStore?.[datasetId]?.[key]?.[segment.id]||0),0);
  return [...routedSegments].sort((a,b)=>buildScore(b)-buildScore(a)||learnedScore(b)-learnedScore(a)||Number(a.sequence||0)-Number(b.sequence||0));
}

export async function recordSearchSegmentHits(datasetId,segmentId,query,hitCount){
  if(typeof window==='undefined'||!segmentId||hitCount<=0)return;
  const keys=await queryKeys(query);
  if(!keys.length)return;
  const dataset=runtimeStore[datasetId]&&typeof runtimeStore[datasetId]==='object'?runtimeStore[datasetId]:{};
  for(const key of keys){
    const row=dataset[key]&&typeof dataset[key]==='object'?dataset[key]:{};
    row[segmentId]=Math.min(1000,Number(row[segmentId]||0)+hitCount);
    dataset[key]=Object.fromEntries(Object.entries(row).sort((a,b)=>b[1]-a[1]).slice(0,MAX_SEGMENTS_PER_KEY));
  }
  runtimeStore[datasetId]=Object.fromEntries(Object.entries(dataset).slice(-MAX_KEYS));
}
