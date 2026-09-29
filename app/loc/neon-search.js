'use client';

import {getMediaSearchProviders,getSearchProviders,PUBLIC_SEARCH_SCOPE_IDS} from './search-providers';
import {DEFAULT_LIST_BATCH_SIZE} from './list-loading-contract.mjs';

const SEARCH_PAGE_SIZE=DEFAULT_LIST_BATCH_SIZE;

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
  cursor=null,
  startDate='',
  endDate='',
  and=[],
  nor=[],
  mediaOnly=false
}={}){
  const q=String(query||'').trim();
  if(!q)return {rows:[],failures:[],hasMore:false,nextCursor:null};

  const safeLimit=Math.max(1,Math.min(SEARCH_PAGE_SIZE,Math.floor(Number(limit)||SEARCH_PAGE_SIZE)));
  const scopeIds=collectionId==='all'?[...PUBLIC_SEARCH_SCOPE_IDS]:[];
  const providers=mediaOnly
    ?getMediaSearchProviders(collectionId,scopeIds)
    :getSearchProviders(collectionId,scopeIds);
  const cards=mediaOnly?[]:scopeCards(q,collectionId);
  const failures=[];

  let stage=Number.isInteger(cursor?.stage)
    ?cursor.stage
    :(cards.length?0:1);
  const sourceOffset=Math.max(0,Math.floor(Number(cursor?.offset)||0));

  if(stage===0){
    return {
      rows:cards,
      failures,
      hasMore:providers.length>0,
      nextCursor:providers.length?{stage:1,offset:0}:null
    };
  }

  const provider=providers[stage-1];
  if(!provider)return {rows:[],failures,hasMore:false,nextCursor:null};

  try{
    const result=await provider.search(q,{
      cursor:sourceOffset,
      startDate,
      endDate,
      and,
      nor
    });
    if(result.hasMore){
      return {
        rows:result.rows||[],
        failures,
        hasMore:true,
        nextCursor:{stage,offset:result.nextCursor}
      };
    }
    const hasMore=stage<providers.length;
    return {
      rows:result.rows||[],
      failures,
      hasMore,
      nextCursor:hasMore?{stage:stage+1,offset:0}:null
    };
  }catch(error){
    failures.push(new Error(`${provider.id}: ${error?.message||'search failed'}`));
    const hasMore=stage<providers.length;
    if(!hasMore)throw new AggregateError(failures,'Neon 搜尋 Provider 無法查詢');
    return {
      rows:[],
      failures,
      hasMore:true,
      nextCursor:{stage:stage+1,offset:0}
    };
  }
}
