import {ScopeRankingResponseSchema} from './scope-feature-contracts';
import {selectNeonRows} from './neon-repository';
import {selectMetricSnapshots} from './neon-metric-snapshots';

const RANKING_TABLES=Object.freeze({
  loc:'api.loc_rankings',
  runes:'silver.runes_rankings',
  lo3rwang:'silver.lo3rwang_rankings'
});

export async function selectScopeRankingPage(scopeId,{page=1,pageSize=20,rankingType=''}={}){
  const id=String(scopeId||'');
  const table=RANKING_TABLES[id];
  if(!table)throw new Error('Scope 無效');
  let snapshotRows=[];
  try{snapshotRows=await selectMetricSnapshots(id,{metricType:'ranking'});}catch(_error){
    // RC6 remains compatible with existing ranking relations until the Neon
    // snapshot relation is present on every environment.
  }
  const {rows}=snapshotRows.length
    ? {rows:snapshotRows.map(row=>({...row,ranking_type:row.ranking_type||row.metric_key,rank_value:row.metric_value}))}
    : await selectNeonRows(table,{columns:id==='loc'?'scope_id,ranking_key,ranking_type,term,rank_value,item_count':'ranking_key,ranking_type,term,rank_value,item_count',limit:5000});
  // api.loc_rankings is the aggregate LOC adapter: keep every projected row,
  // including rows carrying an explicit `loc` scope_id.
  const sourceRows=rows;
  const filtered=sourceRows.filter(row=>!rankingType||row.ranking_type===rankingType)
    .sort((a,b)=>Number(b.rank_value||0)-Number(a.rank_value||0)||Number(b.item_count||0)-Number(a.item_count||0)||String(a.term||'').localeCompare(String(b.term||'')));
  const start=(Math.max(1,Number(page)||1)-1)*Math.max(1,Number(pageSize)||20);
  const size=Math.max(1,Math.min(100,Number(pageSize)||20));
  const normalized=filtered.map(({scope_id:_,...row})=>({...row,ranking_key:String(row.ranking_key||''),ranking_type:String(row.ranking_type||''),term:String(row.term||''),rank_value:Number(row.rank_value??row.metric_value??0),item_count:Number(row.item_count??row.metric_value??0)}));
  return ScopeRankingResponseSchema.parse({rows:normalized.slice(start,start+size),count:normalized.length,page:Number(page)||1,pageSize:size,types:[...new Set(normalized.map(row=>row.ranking_type).filter(Boolean))].sort()});
}

export async function selectScopeRankingTypes(scopeId){
  const result=await selectScopeRankingPage(scopeId,{page:1,pageSize:1});
  return result.types;
}
