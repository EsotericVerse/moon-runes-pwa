'use client';

import {neonClient} from './neon-client';
import {scopeDataViewV2} from '../modular-v2/scope-registry.v2';

const PAGE_SIZE=500;

async function selectPage(view,start,end,orderBy){
  let query=neonClient.from(view).select('*').range(start,end);
  if(orderBy)query=query.order(orderBy,{ascending:false});
  const result=await query;
  if(result?.error)throw new Error(`${view} projection: ${result.error.message||'query failed'}`);
  return Array.isArray(result?.data)?result.data:[];
}

export async function selectScopeProjectionRows(scopeId,projection){
  const view=scopeDataViewV2(scopeId,projection);
  if(!view)return [];
  const rows=[];
  for(let start=0;;start+=PAGE_SIZE){
    const page=await selectPage(view,start,start+PAGE_SIZE-1,'updated_at');
    rows.push(...page);
    if(page.length<PAGE_SIZE)break;
  }
  return rows;
}

export async function selectScopeRankingPage(scopeId,{page=1,pageSize=20,rankingType=''}={}){
  const view=scopeDataViewV2(scopeId,'rankings');
  if(!view)return{rows:[],count:0,page,pageSize};
  const safePage=Math.max(1,Number(page)||1);
  const safeSize=Math.min(100,Math.max(1,Number(pageSize)||20));
  const start=(safePage-1)*safeSize;
  let query=neonClient.from(view).select('*',{count:'exact'});
  if(rankingType)query=query.eq('ranking_type',rankingType);
  query=query.order('rank_value',{ascending:false}).range(start,start+safeSize-1);
  const result=await query;
  if(result?.error)throw new Error(`ranking projection ${view}: ${result.error.message||'query failed'}`);
  return{rows:Array.isArray(result?.data)?result.data:[],count:Number(result?.count||0),page:safePage,pageSize:safeSize};
}

export async function selectScopeRankingTypes(scopeId){
  const view=scopeDataViewV2(scopeId,'rankings');
  if(!view)return[];
  const result=await neonClient.from(view).select('ranking_type').limit(1000);
  if(result?.error)throw new Error(`ranking types ${view}: ${result.error.message||'query failed'}`);
  return[...new Set((Array.isArray(result?.data)?result.data:[]).map(row=>row.ranking_type).filter(Boolean))];
}
