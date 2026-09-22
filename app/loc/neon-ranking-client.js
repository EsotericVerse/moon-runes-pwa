import {z} from 'zod';

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

export async function selectScopeRankingPage(scopeId,{page=1,pageSize=20,rankingType=''}={}){
  const params=new URLSearchParams({
    scopeId:String(scopeId||''),
    page:String(page),
    pageSize:String(pageSize),
    rankingType:String(rankingType||'')
  });
  const response=await fetch(`/api/statistics/rankings?${params}`,{cache:'no-store',headers:{accept:'application/json'}});
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.error||`統計讀取失敗（${response.status}）`);
  return RankingResponseSchema.parse(payload);
}

export async function selectScopeRankingTypes(scopeId){
  const result=await selectScopeRankingPage(scopeId,{page:1,pageSize:1});
  return result.types;
}
