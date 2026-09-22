'use client';

import {selectNeonRows} from './neon-repository';
import {scopeDataViewV2} from '../modular-v2/scope-registry.v2';

function tableFor(scopeId,kind){
  const view=scopeDataViewV2(scopeId,kind);
  if(!view)return null;
  return view.includes('.')?view:`api.${view}`;
}

export async function selectScopeProjectionRows(scopeId,projection,{limit=1000}={}){
  const table=tableFor(scopeId,projection);
  if(!table)return [];
  const {rows}=await selectNeonRows(table,{columns:'*',orders:[{column:'updated_at',ascending:false}],limit});
  return rows;
}

export async function selectScopeRankingPage(scopeId,{page=1,pageSize=20,rankingType=''}={}){
  const table=tableFor(scopeId,'rankings');
  const safePage=Math.max(1,Number(page)||1);
  const safeSize=Math.min(100,Math.max(1,Number(pageSize)||20));
  if(!table)return {rows:[],count:0,page:safePage,pageSize:safeSize};
  const start=(safePage-1)*safeSize;
  const filters=rankingType?[{column:'ranking_type',operator:'eq',value:rankingType}]:[];
  const result=await selectNeonRows(table,{
    columns:'*',filters,orders:[{column:'rank_value',ascending:false}],
    range:[start,start+safeSize-1],count:'exact'
  });
  return {rows:result.rows,count:Number(result.count||0),page:safePage,pageSize:safeSize};
}

export async function selectScopeRankingTypes(scopeId){
  const table=tableFor(scopeId,'rankings');
  if(!table)return [];
  const {rows}=await selectNeonRows(table,{columns:'ranking_type',limit:1000});
  return [...new Set(rows.map(row=>row.ranking_type).filter(Boolean))];
}
