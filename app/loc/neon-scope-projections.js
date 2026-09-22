'use client';

import {z} from 'zod';
import {neonClient} from './neon-client';
import {scopeDataViewV2} from '../modular-v2/scope-registry.v2';

const projectionRowsSchema=z.array(z.record(z.string(),z.unknown()));

function parseProjectionRows(rows,label){
  const parsed=projectionRowsSchema.safeParse(rows);
  if(!parsed.success)throw new Error(`${label} returned an invalid row shape`);
  return parsed.data;
}

export async function selectScopeProjectionRows(scopeId,projection,{limit=1000}={}){
  const view=scopeDataViewV2(scopeId,projection);
  if(!view)return [];
  const result=await neonClient.from(view).select('*').order('updated_at',{ascending:false}).limit(limit);
  if(result.error)throw new Error(`${projection} projection ${view}: ${result.error.message||'query failed'}`);
  return parseProjectionRows(result.data||[],`${projection} projection ${view}`);
}

export async function selectScopeRankingPage(scopeId,{page=1,pageSize=20,rankingType=''}={}){
  const view=scopeDataViewV2(scopeId,'rankings');
  if(!view)return {rows:[],count:0,page,pageSize};
  const safePage=Math.max(1,Number(page)||1);const safeSize=Math.min(100,Math.max(1,Number(pageSize)||20));
  const start=(safePage-1)*safeSize;
  let query=neonClient.from(view).select('*',{count:'exact'}).order('rank_value',{ascending:false}).range(start,start+safeSize-1);
  if(rankingType)query=query.eq('ranking_type',rankingType);
  const {data,error,count}=await query;
  if(error)throw new Error(`ranking projection ${view}: ${error.message||'query failed'}`);
  return {rows:parseProjectionRows(data||[],`ranking projection ${view}`),count:Number(count||0),page:safePage,pageSize:safeSize};
}

export async function selectScopeRankingTypes(scopeId){
  const view=scopeDataViewV2(scopeId,'rankings');
  if(!view)return [];
  const {data,error}=await neonClient.from(view).select('ranking_type').limit(1000);
  if(error)throw new Error(`ranking types ${view}: ${error.message||'query failed'}`);
  const rows=parseProjectionRows(data||[],`ranking types ${view}`);
  return [...new Set(rows.map(row=>row.ranking_type).filter(Boolean))];
}
