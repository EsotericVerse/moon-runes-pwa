'use client';

import {getMediaSearchProviders,getSearchProviders} from './search-providers';
import {DEFAULT_LIST_BATCH_SIZE} from './list-loading-contract.mjs';
import {normalizeDataScopeId,selectManagedScopes} from './scope-table-mapping';

const SEARCH_PAGE_SIZE=DEFAULT_LIST_BATCH_SIZE;

function normalize(value){
  return String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
}

function scopeCards(query,scopes=[]){
  const q=normalize(query);
  if(!q)return [];
  return scopes.flatMap(scope=>{
    const id=String(scope?.id||'').trim();
    if(!id||!normalize(id).includes(q))return [];
    return [{
      row:{
        scope_card:true,
        scope_id:id,
        title:id,
        search_terms:id,
        summary:''
      },
      source:'Scope',
      providerId:'scope-card'
    }];
  });
}

export async function searchNeonRows(scopeId,query,{
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
  const runtimeScope=String(scopeId||'').trim();
  const managedScopes=await selectManagedScopes();
  const dataScope=normalizeDataScopeId(runtimeScope);
  const targetScopes=runtimeScope==='loc'
    ?managedScopes
    :managedScopes.filter(scope=>scope.id===dataScope);
  const scopeIds=targetScopes.map(scope=>scope.id);
  const providers=mediaOnly
    ?getMediaSearchProviders(scopeIds)
    :getSearchProviders(scopeIds,{includeFaq:runtimeScope==='loc'});
  const cards=mediaOnly?[]:scopeCards(q,targetScopes);
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
      nor,
      limit:safeLimit
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
