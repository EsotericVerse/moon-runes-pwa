'use client';

import {Charset,Index,Resolver} from 'flexsearch';

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
  let size=0;
  return {
    index,
    add(id,text){
      const key=String(id??'').trim();
      const content=normalizeIndexedText(text);
      if(!key||!content)return false;
      index.add(key,content);
      size+=1;
      return true;
    },
    get size(){return size;}
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

export function searchTextIndex(engine,query,{and=[],nor=[],limit=20,offset=0}={}){
  const andTerms=cleanTerms(and);
  const norTerms=cleanTerms(nor);
  let base=normalizeIndexedText(query);
  if(!base&&andTerms.length)base=andTerms.shift();
  if(!engine?.index||!base||!engine.size)return {
    ids:[],totalCount:0,hasMore:false,nextOffset:null
  };

  let resolver=new Resolver({index:engine.index,query:base});
  for(const term of andTerms)resolver=resolver.and({query:term});
  for(const term of norTerms)resolver=resolver.not({query:term});
  resolver=resolver.limit(engine.size);

  const allIds=resolvedIds(resolver.resolve());
  const start=Math.max(0,Math.floor(Number(offset)||0));
  const size=Math.max(1,Math.floor(Number(limit)||20));
  const ids=allIds.slice(start,start+size);
  const nextOffset=start+ids.length;
  return {
    ids,
    totalCount:allIds.length,
    hasMore:nextOffset<allIds.length,
    nextOffset:nextOffset<allIds.length?nextOffset:null
  };
}
