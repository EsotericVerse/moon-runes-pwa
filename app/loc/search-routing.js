'use client';

import { fetchLocJson, getLocDataDataset } from './data';

const STORAGE_KEY='loc-search-segment-routing-v1';
const MAX_KEYS=256;
const MAX_SEGMENTS_PER_KEY=12;
const ROUTING_PREFIX_LENGTH=2;

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

async function candidateSegments(datasetId,segments,keys){
  let dataset;
  try{dataset=await getLocDataDataset(datasetId);}catch{return {segments,buildScores:new Map()};}
  const routingIndex=dataset?.routing_index;
  if(!routingIndex)return {segments,buildScores:new Map()};

  if(routingIndex.schema===2&&routingIndex.strategy==='prefix-sharded'&&routingIndex.shards){
    const prefixLength=Number(routingIndex.prefix_length)||ROUTING_PREFIX_LENGTH;
    const prefixes=[...new Set(keys.map(key=>key.slice(0,prefixLength)))];
    const paths=prefixes.map(prefix=>routingIndex.shards[prefix]).filter(Boolean);
    if(paths.length!==prefixes.length)return {segments,buildScores:new Map()};
    try{
      const shards=await Promise.all(paths.map(path=>fetchLocJson(path,{memory:true,maxResponseBytes:4*1024*1024})));
      const shardByPrefix=new Map(prefixes.map((prefix,index)=>[prefix,shards[index]]));
      const ids=new Set();
      const buildScores=new Map();
      for(const key of keys){
        const shard=shardByPrefix.get(key.slice(0,prefixLength))||{};
        if((shard.truncated_keys||[]).includes(key))return {segments,buildScores:new Map()};
        for(const id of Array.isArray(shard.keys?.[key])?shard.keys[key]:[]){
          ids.add(id);
          buildScores.set(id,(buildScores.get(id)||0)+1);
        }
      }
      if(!ids.size)return {segments,buildScores:new Map()};
      return {segments:segments.filter(segment=>ids.has(segment.id)),buildScores};
    }catch{return {segments,buildScores:new Map()};}
  }

  const index=routingIndex?.keys;
  if(!index||typeof index!=='object')return {segments,buildScores:new Map()};
  const truncated=new Set(Array.isArray(routingIndex?.truncated_keys)?routingIndex.truncated_keys:[]);
  if(keys.some(key=>truncated.has(key)))return {segments,buildScores:new Map()};
  const ids=new Set();
  const buildScores=new Map();
  for(const key of keys){
    for(const id of Array.isArray(index[key])?index[key]:[]){ids.add(id);buildScores.set(id,(buildScores.get(id)||0)+1);}
  }
  if(!ids.size)return {segments,buildScores:new Map()};
  return {segments:segments.filter(segment=>ids.has(segment.id)),buildScores};
}

export async function rankSearchSegments(datasetId,segments,query){
  if(typeof window==='undefined'||!segments?.length)return segments||[];
  const keys=await queryKeys(query);
  if(!keys.length)return segments;
  const routed=await candidateSegments(datasetId,segments,keys);
  const store=readStore();
  const buildScore=segment=>Number(routed.buildScores.get(segment.id)||0);
  const learnedScore=segment=>keys.reduce((sum,key)=>sum+Number(store?.[datasetId]?.[key]?.[segment.id]||0),0);
  return [...routed.segments].sort((a,b)=>
    buildScore(b)-buildScore(a)
    ||learnedScore(b)-learnedScore(a)
    ||Number(a.sequence||0)-Number(b.sequence||0)
  );
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
