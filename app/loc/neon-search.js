'use client';

import {Index} from 'flexsearch';
import {selectNeonRows} from './neon-repository';

const TABLES=Object.freeze({
  all:Object.freeze([
    ['silver.lo3rwang_context_entries','作者脈絡'],
    ['silver.runes_context_entries','符文脈絡'],
    ['silver.works','作者作品'],
    ['silver.lrunes_runes','月之符文'],
    ['silver.song_versions','歌曲版本'],
    ['silver.faq_entries','FAQ'],
    ['vault.work_texts','作品全文']
  ]),
  '月之符文':Object.freeze([
    ['silver.runes_context_entries','月之符文脈絡'],
    ['silver.lrunes_runes','月之符文'],
    ['silver.song_versions','歌曲版本']
  ]),
  '政德文化':Object.freeze([
    ['silver.lo3rwang_context_entries','政德文化脈絡'],
    ['silver.lo3rwang_period_context_entries','作者時期'],
    ['silver.works','作者作品'],
    ['silver.song_versions','歌曲版本'],
    ['vault.work_texts','作品全文']
  ]),
  '政德風':Object.freeze([
    ['silver.lo3rwang_context_entries','政德文化脈絡'],
    ['silver.lo3rwang_period_context_entries','作者時期'],
    ['silver.works','作者作品'],
    ['silver.song_versions','歌曲版本'],
    ['vault.work_texts','作品全文']
  ]),
  治理:Object.freeze([
    ['silver.lo3rwang_context_entries','治理脈絡'],
    ['silver.faq_entries','FAQ']
  ])
});

const SEARCH_PAGE_SIZE=500;
const SEARCH_INDEX_CACHE=new Map();
const MAX_INDEX_RESULTS=180;
const SEARCH_INDEX_TTL_MS=60_000;

function normalizeSearchText(value){
  return String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
}

function rowSearchText(row){
  return normalizeSearchText(Object.values(row||{}).map(value=>typeof value==='string'?value:JSON.stringify(value??'')).join(' '));
}

async function selectAllNeonRows(table,source){
  const rows=[];let offset=0;let total=null;
  while(total===null||offset<total){
    const result=await selectNeonRows(table,{columns:'*',count:'exact',range:[offset,offset+SEARCH_PAGE_SIZE-1]});
    rows.push(...result.rows.map(row=>({row,source})));
    total=Number.isFinite(Number(result.count))?Number(result.count):offset+result.rows.length;
    if(result.rows.length<SEARCH_PAGE_SIZE)break;
    offset+=result.rows.length;
  }
  return rows;
}

export async function selectNeonSearchRows(collectionId){
  const tables=TABLES[collectionId]||TABLES.all;
  const cacheKey=String(collectionId||'all');
  const cached=SEARCH_INDEX_CACHE.get(cacheKey);
  if(cached&&cached.expiresAt>Date.now())return cached.promise;
  if(cached)SEARCH_INDEX_CACHE.delete(cacheKey);
  let indexPromise;
  if(!indexPromise){
    indexPromise=(async()=>{
      const settled=await Promise.all(tables.map(async([table,source])=>{
        try{
          return {table,rows:await selectAllNeonRows(table,source),error:null};
        }catch(error){
          return {table,rows:[],error:new Error(`Neon Search SELECT ${table}: ${error?.message||'query failed'}`)};
        }
      }));
      const rows=settled.flatMap(item=>item.rows);
      const failures=settled.filter(item=>item.error).map(item=>item.error);
      const successfulTables=settled.length-failures.length;
      if(!successfulTables)throw new AggregateError(failures,'Neon 搜尋資料表全部無法查詢');
      const index=new Index({tokenize:'full'});
      rows.forEach(({row},id)=>index.add(id,rowSearchText(row)));
      return {index,rows,failures};
    })().catch(error=>{
      const current=SEARCH_INDEX_CACHE.get(cacheKey);
      if(current?.promise===indexPromise)SEARCH_INDEX_CACHE.delete(cacheKey);
      throw error;
    });
    SEARCH_INDEX_CACHE.set(cacheKey,{promise:indexPromise,expiresAt:Date.now()+SEARCH_INDEX_TTL_MS});
  }
  return indexPromise;
}

export async function searchNeonRows(collectionId,query,{limit=MAX_INDEX_RESULTS,offset=0}={}){
  const source=await selectNeonSearchRows(collectionId);
  const normalized=normalizeSearchText(query);
  if(!normalized)return {...source,rows:[]};
  const safeLimit=Math.max(1,Math.min(MAX_INDEX_RESULTS,Number(limit)||MAX_INDEX_RESULTS));
  const safeOffset=Math.max(0,Number(offset)||0);
  const ids=source.index.search(normalized,{limit:safeLimit,offset:safeOffset});
  return {...source,rows:ids.map(id=>source.rows[Number(id)]).filter(Boolean)};
}


export async function findLastSearchPage(collectionId,query,{pageSize=10,firstPageReserved=0}={}){
  const source=await selectNeonSearchRows(collectionId);
  const normalized=normalizeSearchText(query);
  if(!normalized)return 1;
  const size=Math.max(1,Number(pageSize)||10);
  const reserved=Math.max(0,Math.min(size,Number(firstPageReserved)||0));
  const dataCapacityOnFirstPage=Math.max(0,size-reserved);

  function hasResultAt(dataOffset){
    return source.index.search(normalized,{limit:1,offset:Math.max(0,dataOffset)}).length>0;
  }

  if(!hasResultAt(dataCapacityOnFirstPage))return 1;

  let lowPage=2;
  let highPage=2;
  while(hasResultAt(dataCapacityOnFirstPage+(highPage-2)*size)){
    lowPage=highPage;
    highPage*=2;
  }

  while(lowPage+1<highPage){
    const mid=Math.floor((lowPage+highPage)/2);
    const offset=dataCapacityOnFirstPage+(mid-2)*size;
    if(hasResultAt(offset))lowPage=mid;
    else highPage=mid;
  }

  return lowPage;
}
