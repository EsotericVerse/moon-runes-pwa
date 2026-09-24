import {ScopeRankingResponseSchema} from './scope-feature-contracts';
import {selectNeonRows} from './neon-repository';

const RANKING_TABLES=Object.freeze({
  loc:'api.loc_rankings',
  runes:'api.runes_rankings',
  lo3rwang:'api.lo3rwang_rankings'
});

function matchesNavigation(row,navigation={}){
  const sourceValue=row?.source??row?.source_name??row?.source_type;
  if(navigation.source&&sourceValue!==undefined&&sourceValue!==null&&!String(sourceValue).toLocaleLowerCase('zh-Hant').includes(String(navigation.source).toLocaleLowerCase('zh-Hant')))return false;
  const identityValue=row?.identity??row?.work_id??row?.workId??row?.context_key;
  if(navigation.identity&&identityValue!==undefined&&identityValue!==null&&!String(identityValue).includes(String(navigation.identity)))return false;
  const periodValue=row?.period??row?.period_code??row?.era_code??row?.era_id;
  if(navigation.period&&periodValue!==undefined&&periodValue!==null&&!String(periodValue).includes(String(navigation.period)))return false;
  const dateValue=row?.date??row?.start_date??row?.active_from;
  if(navigation.from&&dateValue&&String(dateValue)<String(navigation.from))return false;
  if(navigation.to&&dateValue&&String(dateValue)>String(navigation.to))return false;
  return true;
}

export async function selectScopeRankingPage(scopeId,{page=1,pageSize=20,rankingType='',navigation={}}={}){
  const id=String(scopeId||'');
  const table=RANKING_TABLES[id];
  if(!table)throw new Error('Scope 無效');
  const {rows}=await selectNeonRows(table,{columns:id==='loc'?'scope_id,ranking_key,ranking_type,term,rank_value,item_count':'ranking_key,ranking_type,term,rank_value,item_count',limit:5000});
  // api.loc_rankings is the aggregate LOC adapter: keep every projected row,
  // including rows carrying an explicit `loc` scope_id.
  const sourceRows=rows;
  const filtered=sourceRows.filter(row=>matchesNavigation(row,navigation)).filter(row=>!rankingType||row.ranking_type===rankingType)
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
