'use client';

import {Charset,Index,Resolver} from 'flexsearch';

const runtimeIndexes=new Map();

export function normalizeIndexedText(value){
  return String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant').trim();
}

export function createTextIndex(){
  const index=new Index({
    preset:'memory',
    tokenize:'forward',
    encoder:Charset.CJK,
    cache:false
  });
  const records=new Map();
  return {
    index,
    records,
    add(id,text,record=null){
      const key=String(id??'').trim();
      const content=normalizeIndexedText(text);
      if(!key||!content)return false;
      index.add(key,content);
      records.set(key,record);
      return true;
    },
    get size(){return records.size;}
  };
}

function cleanTerms(values=[]){
  return [...new Set((Array.isArray(values)?values:[values])
    .map(value=>normalizeIndexedText(value))
    .filter(Boolean))];
}

function resolvedIds(result){
  if(Array.isArray(result))return result.map(String);
  if(Array.isArray(result?.result))return result.result.map(String);
  return [];
}

export function searchTextIndex(engine,query,{
  and=[],
  nor=[],
  limit=20,
  offset=0
}={}){
  const andTerms=cleanTerms(and);
  const norTerms=cleanTerms(nor);
  let base=normalizeIndexedText(query);
  if(!base&&andTerms.length)base=andTerms.shift();
  if(!engine?.index||!base||!engine.size)return {
    ids:[],rows:[],totalCount:0,hasMore:false,nextOffset:null
  };

  let resolver=new Resolver({index:engine.index,query:base});
  for(const term of andTerms)resolver=resolver.and({query:term});
  for(const term of norTerms)resolver=resolver.not({query:term});

  // Resolve IDs only. Full source text is not duplicated in the result store.
  resolver=resolver.limit(engine.size);
  const allIds=resolvedIds(resolver.resolve());
  const start=Math.max(0,Math.floor(Number(offset)||0));
  const size=Math.max(1,Math.floor(Number(limit)||20));
  const ids=allIds.slice(start,start+size);
  const rows=ids.map(id=>engine.records.get(id)).filter(value=>value!==undefined&&value!==null);
  const nextOffset=start+ids.length;
  return {
    ids,
    rows,
    totalCount:allIds.length,
    hasMore:nextOffset<allIds.length,
    nextOffset:nextOffset<allIds.length?nextOffset:null
  };
}

export async function getRuntimeTextIndex(key,builder){
  const cacheKey=String(key||'').trim();
  if(!cacheKey)throw new TypeError('Text index key is required');
  const cached=runtimeIndexes.get(cacheKey);
  if(cached)return cached;
  const promise=(async()=>{
    const engine=createTextIndex();
    await builder(engine);
    return engine;
  })().catch(error=>{
    if(runtimeIndexes.get(cacheKey)===promise)runtimeIndexes.delete(cacheKey);
    throw error;
  });
  runtimeIndexes.set(cacheKey,promise);
  return promise;
}

export function clearRuntimeTextIndexes(){
  runtimeIndexes.clear();
}

export function runtimeTextIndexState(){
  return {
    keys:[...runtimeIndexes.keys()],
    count:runtimeIndexes.size
  };
}
