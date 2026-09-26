import {ScopeRankingResponseSchema} from './scope-feature-contracts';
import {selectNeonRows} from './neon-repository';

const RANKING_VIEWS=Object.freeze({
  loc:'api.loc_rankings',
  lunarunes:'api.runes_rankings',
  lo3rwang:'api.lo3rwang_rankings'
});

const RANKING_TYPES=Object.freeze({
  loc:Object.freeze(['group','keyword','text_source','text_category','text_type','meta_source','meta_type','meta_style']),
  lunarunes:Object.freeze(['group','keyword']),
  lo3rwang:Object.freeze(['text_source','text_category','text_type','meta_source','meta_type','meta_style'])
});

const RANKING_COLUMNS=Object.freeze({
  loc:'scope_id,ranking_key,ranking_type,term,rank_value,item_count,period,source',
  lunarunes:'ranking_key,ranking_type,term,rank_value,item_count,source',
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
  if(scopeId==='loc'||scopeId==='lunarunes')containsFilter(filters,'source',navigation.source);
  if(scopeId==='lo3rwang')containsFilter(filters,'term',navigation.source);
  if(scopeId==='lo3rwang'){
    filters.push({column:'period',operator:'eq',value:String(navigation.period||'all')});
  }else if(scopeId==='loc'){
    containsFilter(filters,'period',navigation.period);
  }
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

export async function selectScopeRankingPage(scopeId,{offset=0,limit=20,rankingType='',navigation={}}={}){
  const id=String(scopeId||'');
  const table=RANKING_VIEWS[id];
  const columns=RANKING_COLUMNS[id];
  if(!table||!columns)throw new Error('Scope 無效');

  const filters=navigationFilters(id,navigation);
  const size=Math.max(1,Math.min(100,Math.floor(Number(limit)||20)));
  const start=Math.max(0,Math.floor(Number(offset)||0));
  const pageFilters=rankingType
    ?[...filters,{column:'ranking_type',operator:'eq',value:rankingType}]
    :filters;

  const {rows}=await selectNeonRows(table,{
    columns,
    filters:pageFilters,
    orders:[
      {column:'rank_value',ascending:false},
      {column:'item_count',ascending:false},
      {column:'term',ascending:true}
    ],
    offset:start,
    limit:size
  });
  const rowsForResponse=normalizeRows(rows);
  return ScopeRankingResponseSchema.parse({
    rows:rowsForResponse,
    offset:start,
    limit:size,
    hasMore:rowsForResponse.length===size,
    types:RANKING_TYPES[id]
  });
}

export async function selectScopeRankingTypes(scopeId){
  const types=RANKING_TYPES[String(scopeId||'')];
  if(!types)throw new Error('Scope 無效');
  return [...types];
}
