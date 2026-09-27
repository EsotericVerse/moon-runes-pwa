'use client';

import {getSearchProviders} from './search-providers';

const SEARCH_PAGE_SIZE=20;

const SCOPE_SEARCH_ALIASES=Object.freeze({
  loc:'loc lunacodex luna codex 月典',
  lunarunes:'lunarunes lrunes 月之符文 符文',
  lo3rwang:'lo3rwang 政德 王政德 lucas oscar wang'
});
const SCOPE_SEARCH_TITLES=Object.freeze({
  loc:'LunaCodex／月典',
  lunarunes:'LunaRunes／月之符文',
  lo3rwang:'lo3rwang／政德'
});

function normalize(value){
  return String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
}

function scopeCards(query,collectionId){
  if(collectionId!=='all')return [];
  const q=normalize(query);
  if(!q)return [];
  const rows=[];
  for(const scopeId of Object.keys(SCOPE_SEARCH_ALIASES)){
    const haystack=normalize(scopeId+' '+SCOPE_SEARCH_ALIASES[scopeId]+' '+SCOPE_SEARCH_TITLES[scopeId]);
    if(!haystack.includes(q))continue;
    rows.push({
      row:{
        scope_card:true,
        scope_id:scopeId,
        title:SCOPE_SEARCH_TITLES[scopeId],
        search_terms:SCOPE_SEARCH_ALIASES[scopeId],
        summary:''
      },
      source:'Scope',
      providerId:'scope-card'
    });
  }
  return rows;
}

export async function searchNeonRows(collectionId,query,{
  limit=SEARCH_PAGE_SIZE,
  offset=0,
  startDate='',
  endDate='',
  and=[],
  nor=[]
}={}){
  const q=String(query||'').trim();
  if(!q)return {rows:[],failures:[],hasMore:false,totalCount:0,nextOffset:null};

  const safeLimit=Math.max(1,Math.min(SEARCH_PAGE_SIZE,Math.floor(Number(limit)||SEARCH_PAGE_SIZE)));
  const safeOffset=Math.max(0,Math.floor(Number(offset)||0));
  const providers=getSearchProviders(collectionId);
  const cards=scopeCards(q,collectionId);
  const failures=[];

  let skip=safeOffset;
  let remaining=safeLimit;
  const rows=[];
  let totalCount=cards.length;

  if(skip<cards.length){
    const take=Math.min(remaining,cards.length-skip);
    rows.push(...cards.slice(skip,skip+take));
    remaining-=take;
    skip=0;
  }else{
    skip-=cards.length;
  }

  let successfulProviders=0;
  for(const provider of providers){
    try{
      const requestedLimit=remaining>0?safeLimit:0;
      const result=await provider.search(q,{
        limit:requestedLimit,
        offset:skip,
        startDate,
        endDate,
        and,
        nor
      });
      successfulProviders+=1;
      totalCount+=result.count;
      if(skip>=result.count){
        skip-=result.count;
        continue;
      }
      skip=0;
      if(remaining<=0)continue;
      const take=result.rows.slice(0,remaining);
      rows.push(...take);
      remaining-=take.length;
    }catch(error){
      failures.push(new Error(`${provider.id}: ${error?.message||'search failed'}`));
    }
  }

  if(providers.length&&!successfulProviders){
    throw new AggregateError(failures,'Neon 搜尋 Provider 全部無法查詢');
  }

  const nextOffset=safeOffset+rows.length;
  return {
    rows,
    failures,
    totalCount,
    hasMore:nextOffset<totalCount,
    nextOffset:nextOffset<totalCount?nextOffset:null
  };
}
