'use client';

import {z} from 'zod';
import {selectNeonRows} from './neon-repository';

const RankingRowSchema=z.object({
  ranking_type:z.string(),
  term:z.string(),
  item_count:z.coerce.number(),
  rank_value:z.coerce.number(),
  ranking_key:z.string()
});
const RankingResponseSchema=z.object({
  rows:z.array(RankingRowSchema),
  count:z.coerce.number().int().nonnegative(),
  page:z.coerce.number().int().positive(),
  pageSize:z.coerce.number().int().positive(),
  types:z.array(z.string())
});
const RANKING_VIEWS=Object.freeze({
  loc:'api.loc_rankings',
  runes:'api.runes_rankings',
  lo3rwang:'api.lo3rwang_rankings'
});

export async function selectScopeRankingPage(scopeId,{page=1,pageSize=20,rankingType=''}={}){
  const table=RANKING_VIEWS[String(scopeId||'')];
  if(!table)throw new Error('Scope 無效');
  const safePage=Math.max(1,Number(page)||1);
  const safeSize=Math.max(1,Math.min(100,Number(pageSize)||20));
  const start=(safePage-1)*safeSize;
  const filters=rankingType?[{column:'ranking_type',operator:'eq',value:String(rankingType)}]:[];
  const [{rows,count},{rows:typeRows}]=await Promise.all([
    selectNeonRows(table,{
      columns:'ranking_type,term,item_count,rank_value,ranking_key',
      filters,
      orders:[{column:'item_count',ascending:false},{column:'term',ascending:true}],
      range:[start,start+safeSize-1],
      count:'exact'
    }),
    selectNeonRows(table,{columns:'ranking_type',limit:5000})
  ]);
  const types=[...new Set(typeRows.map(row=>String(row.ranking_type||'')).filter(Boolean))].sort();
  return RankingResponseSchema.parse({rows,count:count??rows.length,page:safePage,pageSize:safeSize,types});
}

export async function selectScopeRankingTypes(scopeId){
  const result=await selectScopeRankingPage(scopeId,{page:1,pageSize:1});
  return result.types;
}
