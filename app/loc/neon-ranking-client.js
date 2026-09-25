import {ScopeRankingResponseSchema} from './scope-feature-contracts';
import {selectNeonRows} from './neon-repository';

const RANKING_TABLES=Object.freeze({
  loc:'api.loc_rankings',
  runes:'api.runes_rankings',
  lo3rwang:'api.lo3rwang_rankings'
});

const RANKING_COLUMNS=Object.freeze({
  loc:'scope_id,ranking_key,ranking_type,term,rank_value,item_count,period,source',
  runes:'ranking_key,ranking_type,term,rank_value,item_count,source',
  lo3rwang:'ranking_key,ranking_type,term,rank_value,item_count,period'
});

function containsFilter(filters,column,value){
  const text=String(value||'').trim();
  if(!text)return;
  const escaped=text.replace(/[\\%_]/g,'\\$&');
  filters.push({column,operator:'ilike',value:`%${escaped}%`});
}

function navigationFilters(scopeId,navigation={}){
  const filters=[];
  if(scopeId==='loc'||scopeId==='runes')containsFilter(filters,'source',navigation.source);
  if(scopeId==='loc'||scopeId==='lo3rwang')containsFilter(filters,'period',navigation.period);
  return filters;
}

function normalizeRows(rows){
  return (rows||[]).map(({scope_id:_,...row})=>({
    ...row,
    ranking_key:String(row.ranking_key||''),
    ranking_type:String(row.ranking_type||''),
    term:String(row.term||''),
    rank_value:Number(row.rank_value??row.metric_value??0),
    item_count:Number(row.item_count??row.metric_value??0)
  }));
}

export async function selectScopeRankingPage(scopeId,{page=1,pageSize=20,rankingType='',navigation={}}={}){
  const id=String(scopeId||'');
  const table=RANKING_TABLES[id];
  const columns=RANKING_COLUMNS[id];
  if(!table||!columns)throw new Error('Scope 無效');

  const filters=navigationFilters(id,navigation);
  const size=Math.max(1,Math.min(100,Math.floor(Number(pageSize)||20)));
  const currentPage=Math.max(1,Math.floor(Number(page)||1));
  const offset=(currentPage-1)*size;
  const pageFilters=rankingType
    ?[...filters,{column:'ranking_type',operator:'eq',value:rankingType}]
    :filters;

  const [{rows,count},typeResult]=await Promise.all([
    selectNeonRows(table,{
      columns,
      filters:pageFilters,
      orders:[
        {column:'rank_value',ascending:false},
        {column:'item_count',ascending:false},
        {column:'term',ascending:true}
      ],
      range:[offset,offset+size-1],
      count:'exact'
    }),
    selectNeonRows(table,{columns:'ranking_type',filters,limit:5000})
  ]);

  const rowsForResponse=normalizeRows(rows);
  const types=[...new Set(typeResult.rows.map(row=>String(row.ranking_type||'')).filter(Boolean))].sort();
  return ScopeRankingResponseSchema.parse({
    rows:rowsForResponse,
    count:count??0,
    page:currentPage,
    pageSize:size,
    types
  });
}

export async function selectScopeRankingTypes(scopeId){
  const result=await selectScopeRankingPage(scopeId,{page:1,pageSize:1});
  return result.types;
}
