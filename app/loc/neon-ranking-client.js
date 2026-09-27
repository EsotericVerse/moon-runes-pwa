import {ScopeRankingResponseSchema} from './scope-feature-contracts';
import {selectNeonAllRows,selectNeonCatalog} from './neon-repository';
import {selectScopeTimeRows} from './scope-time';
import {classifyStyleRows,processStyleTableRows} from './style-classifier';
import {selectSourceCatalog,selectSourceWeekly} from './aggregate-query';

const RANKING_TYPES=Object.freeze({
  loc:Object.freeze(['keyword','source','style','style_group']),
  lunarunes:Object.freeze(['keyword','source','style','style_group']),
  lo3rwang:Object.freeze(['keyword','source','style','style_group'])
});

function increment(map,type,term,extra={}){
  const value=String(term||'').trim();
  if(!value)return;
  const key=type+'|'+value;
  const row=map.get(key)||{ranking_key:key,ranking_type:type,term:value,rank_value:0,item_count:0,...extra};
  row.item_count+=1;
  row.rank_value=row.item_count;
  map.set(key,row);
}

function dateFilters(range,column='created_at'){
  if(!range?.start_date)return [];
  const filters=[{column,operator:'gte',value:String(range.start_date).slice(0,10)+'T00:00:00+08:00'}];
  if(range.end_date)filters.push({column,operator:'lte',value:String(range.end_date).slice(0,10)+'T23:59:59.999+08:00'});
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
  const {rows}=await selectNeonCatalog('silver.lo3rwang_style_keywords',{columns:'keyword,keyword_group'});
  const map=new Map();
  for(const row of rows)increment(map,'keyword',row.keyword,{source:'lo3rwang'});
  return [...map.values()];
}

async function authorSources(period){
  const range=await resolvePeriod('lo3rwang',period);
  const map=new Map();
  if(!range){
    const result=await selectSourceCatalog({scopeId:'lo3rwang'});
    for(const row of result.rows){
      const value=String(row.source_name||'').trim();
      if(!value)continue;
      map.set('source|'+value,{
        ranking_key:'source|'+value,
        ranking_type:'source',
        term:value,
        rank_value:Number(row.work_count)||0,
        item_count:Number(row.work_count)||0,
        source:'lo3rwang',
        period:period||'all'
      });
    }
    return [...map.values()];
  }
  const result=await selectSourceWeekly({
    scopeId:'lo3rwang',
    startDate:range.start_date||'',
    endDate:range.end_date||''
  });
  for(const row of result.rows){
    const value=String(row.source_name||'').trim();
    if(!value)continue;
    const key='source|'+value;
    const current=map.get(key)||{
      ranking_key:key,ranking_type:'source',term:value,rank_value:0,item_count:0,
      source:'lo3rwang',period:period||'all'
    };
    current.item_count+=Number(row.work_count)||0;
    current.rank_value=current.item_count;
    map.set(key,current);
  }
  return [...map.values()];
}

async function runeKeywords(){
  const {rows}=await selectNeonCatalog('silver.lrunes',{
    columns:'keyword,active,record_type',
    filters:[
      {column:'record_type',operator:'eq',value:'keyword'},
      {column:'active',operator:'eq',value:true}
    ]
  });
  const map=new Map();
  for(const row of rows)increment(map,'keyword',row.keyword,{source:'lrunes'});
  return [...map.values()];
}

async function runeSources(){
  return [];
}

async function authorStyles(period,type){
  const range=await resolvePeriod('lo3rwang',period);
  const filters=dateFilters(range);
  const map=new Map();
  await processStyleTableRows('silver.lo3rwang_galaxy',{
    columns:'galaxy_id,title,content,meta_tags,created_at',
    filters,
    orders:[{column:'created_at',ascending:true}],
    onClassified:row=>{
      const term=type==='style_group'?row.style_group:row.style_label;
      increment(map,type,term,{source:'lo3rwang',period:period||'all'});
    }
  });
  const mediaResult=await selectNeonAllRows('silver.lo3rwang_galaxy_media',{
    columns:'media_id,title,meta_tags,create_time',
    filters:dateFilters(range,'create_time')
  });
  const mediaClassified=await classifyStyleRows(mediaResult.rows);
  for(const row of mediaClassified){
    const term=type==='style_group'?row.style_group:row.style_label;
    increment(map,type,term,{source:'lo3rwang',period:period||'all'});
  }
  return [...map.values()];
}

async function runeStyles(period,type){
  const range=await resolvePeriod('lunarunes',period);
  const filters=[
    {column:'record_type',operator:'in',value:['galaxy','galaxy_media']},
    ...dateFilters(range)
  ];
  const map=new Map();
  await processStyleTableRows('silver.lrunes',{
    columns:'record_id,record_type,title,content,meta_tags,style_tags,created_at',
    filters,
    orders:[{column:'created_at',ascending:true}],
    onClassified:row=>{
      const term=type==='style_group'?row.style_group:row.style_label;
      increment(map,type,term,{source:'lrunes',period:period||'all'});
    }
  });
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

async function selectScopeRankingRows(scopeId,{rankingType='',navigation={}}={}){
  const id=String(scopeId||'');
  if(!RANKING_TYPES[id])throw new Error('Scope 無效');
  const type=RANKING_TYPES[id].includes(rankingType)?rankingType:RANKING_TYPES[id][0];
  const period=String(navigation.period||'all');

  const rows=[];
  if(id==='loc'||id==='lo3rwang'){
    if(type==='keyword')rows.push(...await authorKeywords());
    else if(type==='source')rows.push(...await authorSources(period));
    else rows.push(...await authorStyles(period,type));
  }
  if(id==='loc'||id==='lunarunes'){
    if(type==='keyword')rows.push(...await runeKeywords());
    else if(type==='source')rows.push(...await runeSources(period));
    else rows.push(...await runeStyles(period,type));
  }

  const merged=mergeRows(rows)
    .filter(row=>row.ranking_type===type)
    .filter(row=>matchesNavigation(row,navigation));
  merged.sort((a,b)=>Number(b.rank_value)-Number(a.rank_value)||Number(b.item_count)-Number(a.item_count)||String(a.term).localeCompare(String(b.term)));
  return {id,type,rows:merged};
}

export async function selectScopeRankingPage(scopeId,{offset=0,limit=20,rankingType='',navigation={}}={}){
  const result=await selectScopeRankingRows(scopeId,{rankingType,navigation});
  const size=Math.max(1,Math.floor(Number(limit)||20));
  const start=Math.max(0,Math.floor(Number(offset)||0));
  const page=result.rows.slice(start,start+size);
  return ScopeRankingResponseSchema.parse({
    rows:page,offset:start,limit:size,hasMore:start+size<result.rows.length,types:RANKING_TYPES[result.id]
  });
}

export async function selectScopeRankingAll(scopeId,{rankingType='',navigation={}}={}){
  return (await selectScopeRankingRows(scopeId,{rankingType,navigation})).rows;
}

export async function selectScopeRankingTypes(scopeId){
  const types=RANKING_TYPES[String(scopeId||'')];
  if(!types)throw new Error('Scope 無效');
  return [...types];
}
