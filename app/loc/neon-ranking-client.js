import {ScopeRankingResponseSchema} from './scope-feature-contracts';
import {selectNeonRows} from './neon-repository';
import {selectScopeTimeRows} from './scope-time';

const RANKING_TYPES=Object.freeze({
  loc:Object.freeze(['keyword','source']),
  lunarunes:Object.freeze(['keyword','source']),
  lo3rwang:Object.freeze(['keyword','source'])
});

async function selectAllRows(table,{columns,filters=[]}){
  const rows=[];let offset=0;
  while(true){
    const result=await selectNeonRows(table,{columns,filters,range:[offset,offset+4999]});
    rows.push(...result.rows);
    if(result.rows.length<5000)break;
    offset+=result.rows.length;
  }
  return rows;
}

function increment(map,type,term,extra={}){
  const value=String(term||'').trim();
  if(!value)return;
  const key=type+'|'+value;
  const row=map.get(key)||{ranking_key:key,ranking_type:type,term:value,rank_value:0,item_count:0,...extra};
  row.item_count+=1;
  row.rank_value=row.item_count;
  map.set(key,row);
}

function dateFilters(range){
  if(!range?.start_date)return [];
  const filters=[{column:'created_at',operator:'gte',value:String(range.start_date).slice(0,10)+'T00:00:00+08:00'}];
  if(range.end_date)filters.push({column:'created_at',operator:'lte',value:String(range.end_date).slice(0,10)+'T23:59:59.999+08:00'});
  return filters;
}

async function resolvePeriod(scopeId,period){
  const value=String(period||'').trim();
  if(!value||value==='all')return null;
  const dataScope=scopeId==='lunarunes'?'lrunes':scopeId;
  const rows=await selectScopeTimeRows(dataScope);
  return rows.find(row=>row.entry_type==='period'&&(String(row.period||'')===value||String(row.entry_key||'')===value))||null;
}

async function authorKeywords(){
  const rows=await selectAllRows('silver.lo3rwang_style_keywords',{columns:'keyword'});
  const map=new Map();
  for(const row of rows)increment(map,'keyword',row.keyword,{source:'lo3rwang'});
  return [...map.values()];
}

async function authorSources(period){
  const range=await resolvePeriod('lo3rwang',period);
  const filters=dateFilters(range);
  const [texts,media]=await Promise.all([
    selectAllRows('silver.lo3rwang_galaxy',{columns:'source_platform,created_at',filters}),
    selectAllRows('silver.lo3rwang_galaxy_media',{columns:'source_platform,created_at',filters})
  ]);
  const map=new Map();
  for(const row of [...texts,...media])increment(map,'source',row.source_platform,{source:'lo3rwang',period:period||'all'});
  return [...map.values()];
}

async function runeKeywords(){
  const rows=await selectAllRows('silver.lrunes',{
    columns:'keyword,active',
    filters:[
      {column:'record_type',operator:'eq',value:'keyword'},
      {column:'active',operator:'eq',value:true}
    ]
  });
  const map=new Map();
  for(const row of rows)increment(map,'keyword',row.keyword,{source:'lrunes'});
  return [...map.values()];
}

async function runeSources(period){
  const range=await resolvePeriod('lunarunes',period);
  const filters=[
    {column:'record_type',operator:'in',value:['galaxy','galaxy_media']},
    ...dateFilters(range)
  ];
  const rows=await selectAllRows('silver.lrunes',{columns:'source_platform,created_at,record_type',filters});
  const map=new Map();
  for(const row of rows)increment(map,'source',row.source_platform,{source:'lrunes',period:period||'all'});
  return [...map.values()];
}

function mergeRows(rows){
  const map=new Map();
  for(const row of rows){
    const key=String(row.ranking_type||'')+'|'+String(row.term||'');
    const current=map.get(key)||{...row,rank_value:0,item_count:0};
    current.item_count+=Number(row.item_count||0);
    current.rank_value=current.item_count;
    map.set(key,current);
  }
  return [...map.values()];
}

function matchesNavigation(row,navigation={}){
  const source=String(navigation.source||'').trim().toLowerCase();
  if(source&&!String(row.source||row.term||'').toLowerCase().includes(source))return false;
  return true;
}

export async function selectScopeRankingPage(scopeId,{offset=0,limit=20,rankingType='',navigation={}}={}){
  const id=String(scopeId||'');
  if(!RANKING_TYPES[id])throw new Error('Scope 無效');
  const type=RANKING_TYPES[id].includes(rankingType)?rankingType:RANKING_TYPES[id][0];
  const period=String(navigation.period||'all');

  const rows=[];
  if(id==='loc'||id==='lo3rwang'){
    rows.push(...(type==='keyword'?await authorKeywords():await authorSources(period)));
  }
  if(id==='loc'||id==='lunarunes'){
    rows.push(...(type==='keyword'?await runeKeywords():await runeSources(period)));
  }

  let merged=mergeRows(rows)
    .filter(row=>row.ranking_type===type)
    .filter(row=>matchesNavigation(row,navigation));
  merged.sort((a,b)=>Number(b.rank_value)-Number(a.rank_value)||Number(b.item_count)-Number(a.item_count)||String(a.term).localeCompare(String(b.term)));

  const size=Math.max(1,Math.min(100,Math.floor(Number(limit)||20)));
  const start=Math.max(0,Math.floor(Number(offset)||0));
  const page=merged.slice(start,start+size);
  return ScopeRankingResponseSchema.parse({rows:page,offset:start,limit:size,hasMore:start+size<merged.length,types:RANKING_TYPES[id]});
}

export async function selectScopeRankingTypes(scopeId){
  const types=RANKING_TYPES[String(scopeId||'')];
  if(!types)throw new Error('Scope 無效');
  return [...types];
}
