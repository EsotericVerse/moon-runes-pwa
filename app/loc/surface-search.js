'use client';

import {Index} from 'flexsearch';

function text(value){
  return String(value??'').normalize('NFKC').trim();
}
function safeNumber(value,fallback){
  const number=Math.floor(Number(value));
  return Number.isFinite(number)&&number>=0?number:fallback;
}

/**
 * FlexSearch 的 Current 作用場：表皮輕微搜尋。
 *
 * Caller 必須先用 Neon / Scope / SQL 把資料縮到局部集合，
 * 再把這個小集合交給本模組做高頻、重複的 lexical matching。
 *
 * 本模組不讀 Neon、不決定 Scope、不保存 Canon，也不是 corpus SSOT。
 */
export function createSurfaceSearch(rows=[],{
  getText,
  cache=100,
  tokenize='forward'
}={}){
  if(!Array.isArray(rows))throw new TypeError('Surface search rows must be an array.');
  if(typeof getText!=='function')throw new TypeError('Surface search requires getText(row).');

  const cacheSize=Math.max(1,safeNumber(cache,100));
  const index=new Index({tokenize,cache:cacheSize});
  const records=new Map();
  let localId=0;

  for(const row of rows){
    const value=text(getText(row));
    if(!value)continue;
    localId+=1;
    records.set(localId,row);
    index.add(localId,value);
  }

  return {
    get size(){return records.size;},
    search(query,{limit=20,offset=0}={}){
      const value=text(query);
      if(!value)return [];
      const safeLimit=Math.max(1,safeNumber(limit,20));
      const safeOffset=safeNumber(offset,0);
      const ids=index.search(value,{limit:safeLimit,offset:safeOffset,cache:true});
      return ids.map(id=>records.get(Number(id))).filter(Boolean);
    },
    clear(){
      index.clear();
      records.clear();
    }
  };
}
