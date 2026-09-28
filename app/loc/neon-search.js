'use client';

import {getMediaSearchProviders,getSearchProviders} from './search-providers';
import {selectManagedScopeIds} from './scope-list';

const SEARCH_PAGE_SIZE=10;

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
  const scopeIds=collectionId==='all'?await selectManagedScopeIds():[];
  const providers=mediaOnly
    ?getMediaSearchProviders(collectionId,scopeIds)
    :getSearchProviders(collectionId,scopeIds);
  const cards=mediaOnly?[]:scopeCards(q,collectionId);
  const failures=[];
  const rows=[];

  let stage=Number.isInteger(cursor?.stage)?cursor.stage:0;
  let sourceOffset=Math.max(0,Math.floor(Number(cursor?.offset)||0));
  let attemptedProviders=0;
  let successfulProviders=0;

  while(rows.length<safeLimit&&stage<=providers.length){
    if(stage===0){
      const remaining=safeLimit-rows.length;
      const take=cards.slice(sourceOffset,sourceOffset+remaining);
      rows.push(...take);
      sourceOffset+=take.length;
      if(rows.length>=safeLimit&&sourceOffset<cards.length){
        return {rows,failures,hasMore:true,nextCursor:{stage:0,offset:sourceOffset}};
      }
      stage=1;
      sourceOffset=0;
      continue;
    }

    const provider=providers[stage-1];
    if(!provider)break;
    attemptedProviders+=1;
    try{
      const result=await provider.search(q,{
        limit:safeLimit-rows.length,
        cursor:sourceOffset,
        startDate,
        endDate,
        and,
        nor
      });
      successfulProviders+=1;
      rows.push(...(result.rows||[]));
      if(result.hasMore){
        return {
          rows,
          failures,
          hasMore:true,
          nextCursor:{stage,offset:result.nextCursor}
        };
      }
      stage+=1;
      sourceOffset=0;
      if(rows.length>=safeLimit){
        const hasMore=stage<=providers.length;
        return {rows,failures,hasMore,nextCursor:hasMore?{stage,offset:0}:null};
      }
    }catch(error){
      failures.push(new Error(`${provider.id}: ${error?.message||'search failed'}`));
      stage+=1;
      sourceOffset=0;
    }
  }

  if(attemptedProviders&&!successfulProviders&&!rows.length){
    throw new AggregateError(failures,'Neon 搜尋 Provider 全部無法查詢');
  }

  return {rows,failures,hasMore:false,nextCursor:null};
}
