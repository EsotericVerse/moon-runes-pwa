import {ScopeRankingResponseSchema} from './scope-feature-contracts';
import {selectNeonAllRows,selectNeonCatalog} from './neon-repository';
import {selectScopeTimeRows} from './scope-time';
import {classifyStyleRows,processKeywordTableRows,processStyleTableRows,countStyleKeywordHits} from './style-classifier';
import {selectSourceCatalog,selectSourceWeekly} from './aggregate-query';
import {selectManagedScopeIds} from './scope-list';

const RANKING_TYPES=Object.freeze({
  loc:Object.freeze(['source']),
  lunarunes:Object.freeze(['keyword','source','style','style_group','media_type','media_place','media_tag']),
  lo3rwang:Object.freeze(['keyword','source','style','style_group','media_type','media_place','media_tag'])
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

function dateFilters(range,column='createtime'){
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

function addKeywordCounts(map,rows,source,period){
  for(const row of rows||[]){
    const term=String(row.keyword||'').trim();
    const count=Number(row.item_count)||0;
    if(!term||count<=0)continue;
    const key='keyword|'+term;
    const current=map.get(key)||{
      ranking_key:key,ranking_type:'keyword',term,rank_value:0,item_count:0,
      source,period:period||'all'
    };
    current.item_count+=count;
    current.rank_value=current.item_count;
    map.set(key,current);
  }
}

async function authorKeywords(period,rangeOverride){
  const range=rangeOverride===undefined?await resolvePeriod('lo3rwang',period):rangeOverride;
  const filters=dateFilters(range,'createtime');
  const map=new Map();
  await processKeywordTableRows('silver.lo3rwang_galaxy',{
    scopeId:'lo3rwang',
    columns:'uid,title,content,createtime',
    filters,
    orders:[{column:'createtime',ascending:true}],
    onCounts:rows=>addKeywordCounts(map,rows,'lo3rwang',period)
  });
  const mediaResult=await selectNeonAllRows('silver.lo3rwang_galaxy_media',{
    columns:'media_id,title,meta_tags,createtime',
    filters
  });
  addKeywordCounts(map,await countStyleKeywordHits(mediaResult.rows,'lo3rwang'),'lo3rwang',period);
  return [...map.values()];
}

async function authorSources(period,rangeOverride){
  const range=rangeOverride===undefined?await resolvePeriod('lo3rwang',period):rangeOverride;
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

async function runeKeywords(period,rangeOverride){
  const range=rangeOverride===undefined?await resolvePeriod('lunarunes',period):rangeOverride;
  const dateRange=dateFilters(range,'createtime');
  const map=new Map();
  await processKeywordTableRows('silver.lrunes',{
    scopeId:'lunarunes',
    columns:'record_id,record_type,title,content,createtime',
    filters:[
      {column:'record_type',operator:'eq',value:'galaxy'},
      ...dateRange
    ],
    orders:[{column:'createtime',ascending:true}],
    onCounts:rows=>addKeywordCounts(map,rows,'lrunes',period)
  });
  const mediaResult=await selectNeonAllRows('silver.lrunes',{
    columns:'record_id,record_type,title,meta_tags,createtime',
    filters:[
      {column:'record_type',operator:'eq',value:'galaxy_media'},
      ...dateRange
    ],
    orders:[{column:'createtime',ascending:true}]
  });
  addKeywordCounts(map,await countStyleKeywordHits(mediaResult.rows,'lunarunes'),'lrunes',period);
  return [...map.values()];
}

async function runeSources(period,rangeOverride){
  const range=rangeOverride===undefined?await resolvePeriod('lunarunes',period):rangeOverride;
  const filters=[
    {column:'record_type',operator:'eq',value:'galaxy'},
    ...dateFilters(range,'createtime')
  ];
  const {rows}=await selectNeonAllRows('silver.lrunes',{
    columns:'record_id,source_name,createtime',
    filters
  });
  const map=new Map();
  for(const row of rows){
    const value=String(row.source_name||'').trim();
    if(!value)continue;
    const key='source|'+value;
    const current=map.get(key)||{
      ranking_key:key,ranking_type:'source',term:value,rank_value:0,item_count:0,
      source:'lrunes',period:period||'all'
    };
    current.item_count+=1;
    current.rank_value=current.item_count;
    map.set(key,current);
  }
  return [...map.values()];
}

function splitMediaTags(value){
  return String(value||'').split(/[,，]/).map(tag=>tag.trim()).filter(Boolean);
}

async function authorMedia(period,type,rangeOverride){
  const range=rangeOverride===undefined?await resolvePeriod('lo3rwang',period):rangeOverride;
  const {rows}=await selectNeonAllRows('silver.lo3rwang_galaxy_media',{
    columns:'media_id,media_type,source_place,meta_tags,createtime',
    filters:dateFilters(range,'createtime')
  });
  const map=new Map();
  for(const row of rows){
    if(type==='media_type')increment(map,type,row.media_type,{source:'lo3rwang',period:period||'all'});
    else if(type==='media_place')increment(map,type,row.source_place,{source:'lo3rwang',period:period||'all'});
    else for(const tag of splitMediaTags(row.meta_tags))increment(map,type,tag,{source:'lo3rwang',period:period||'all'});
  }
  return [...map.values()];
}

async function runeMedia(period,type,rangeOverride){
  const range=rangeOverride===undefined?await resolvePeriod('lunarunes',period):rangeOverride;
  const {rows}=await selectNeonAllRows('silver.lrunes',{
    columns:'record_id,record_type,media_type,source_place,meta_tags,createtime',
    filters:[
      {column:'record_type',operator:'eq',value:'galaxy_media'},
      ...dateFilters(range,'createtime')
    ]
  });
  const map=new Map();
  for(const row of rows){
    if(type==='media_type')increment(map,type,row.media_type,{source:'lrunes',period:period||'all'});
    else if(type==='media_place')increment(map,type,row.source_place,{source:'lrunes',period:period||'all'});
    else for(const tag of splitMediaTags(row.meta_tags))increment(map,type,tag,{source:'lrunes',period:period||'all'});
  }
  return [...map.values()];
}

async function sourceRowsForScope(scopeId,period){
  if(scopeId==='lo3rwang')return authorSources(period);
  if(scopeId==='lrunes')return runeSources(period);
  return [];
}

async function rowsForType(id,type,period,rangeOverride){
  if(id==='lo3rwang'){
    if(type==='keyword')return authorKeywords(period,rangeOverride);
    if(type==='source')return authorSources(period,rangeOverride);
    if(type.startsWith('media_'))return authorMedia(period,type,rangeOverride);
    return authorStyles(period,type,rangeOverride);
  }
  if(id==='lunarunes'){
    if(type==='keyword')return runeKeywords(period,rangeOverride);
    if(type==='source')return runeSources(period,rangeOverride);
    if(type.startsWith('media_'))return runeMedia(period,type,rangeOverride);
    return runeStyles(period,type,rangeOverride);
  }
  return [];
}

function dateOnly(value){
  const text=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text)?text:'';
}
function addDays(value,days){
  const date=dateOnly(value);
  if(!date)return '';
  const ms=Date.parse(date+'T00:00:00Z')+Number(days||0)*86400000;
  return new Date(ms).toISOString().slice(0,10);
}
function daySpan(start,end){
  const a=Date.parse(dateOnly(start)+'T00:00:00Z');
  const b=Date.parse(dateOnly(end)+'T00:00:00Z');
  return Number.isFinite(a)&&Number.isFinite(b)&&b>=a?Math.floor((b-a)/86400000)+1:0;
}

async function resolveComparisonRanges(scopeId,period){
  if(scopeId==='loc')return null;
  const dataScope=scopeId==='lunarunes'?'lrunes':scopeId;
  const rows=(await selectScopeTimeRows(dataScope)).filter(row=>row.entry_type==='period'&&row.start_date);
  let selected=null;
  const value=String(period||'all');
  if(value&&value!=='all'){
    selected=rows.find(row=>String(row.period||'')===value||String(row.entry_key||'')===value)||null;
  }else{
    selected=rows.find(row=>String(row.status||'').trim().toLowerCase()==='current')
      ||[...rows].sort((a,b)=>String(b.start_date||'').localeCompare(String(a.start_date||'')))[0]
      ||null;
  }
  if(!selected?.start_date)return null;
  const currentStart=dateOnly(selected.start_date);
  const currentEnd=dateOnly(selected.end_date)||new Date().toISOString().slice(0,10);
  const days=daySpan(currentStart,currentEnd);
  if(!days)return null;
  const previousEnd=addDays(currentStart,-1);
  const previousStart=addDays(previousEnd,-days+1);
  return {
    current:{start_date:currentStart,end_date:currentEnd},
    previous:{start_date:previousStart,end_date:previousEnd},
    period:String(selected.period||selected.entry_key||value||'current'),
    days
  };
}

async function authorStyles(period,type,rangeOverride){
  const range=rangeOverride===undefined?await resolvePeriod('lo3rwang',period):rangeOverride;
  const filters=dateFilters(range,'createtime');
  const map=new Map();
  await processStyleTableRows('silver.lo3rwang_galaxy',{
    scopeId:'lo3rwang',
    columns:'uid,title,content,createtime',
    filters,
    orders:[{column:'createtime',ascending:true}],
    onClassified:row=>{
      const term=type==='style_group'?row.style_group:row.style_label;
      increment(map,type,term,{source:'lo3rwang',period:period||'all'});
    }
  });
  const mediaResult=await selectNeonAllRows('silver.lo3rwang_galaxy_media',{
    columns:'media_id,title,meta_tags,createtime',
    filters:dateFilters(range,'createtime')
  });
  const mediaClassified=await classifyStyleRows(mediaResult.rows,'lo3rwang');
  for(const row of mediaClassified){
    const term=type==='style_group'?row.style_group:row.style_label;
    increment(map,type,term,{source:'lo3rwang',period:period||'all'});
  }
  return [...map.values()];
}

async function runeStyles(period,type,rangeOverride){
  const range=rangeOverride===undefined?await resolvePeriod('lunarunes',period):rangeOverride;
  const dateRange=dateFilters(range);
  const map=new Map();
  await processStyleTableRows('silver.lrunes',{
    scopeId:'lunarunes',
    columns:'record_id,record_type,title,content,createtime',
    filters:[
      {column:'record_type',operator:'eq',value:'galaxy'},
      ...dateRange
    ],
    orders:[{column:'createtime',ascending:true}],
    onClassified:row=>{
      const term=type==='style_group'?row.style_group:row.style_label;
      increment(map,type,term,{source:'lrunes',period:period||'all'});
    }
  });
  const mediaResult=await selectNeonAllRows('silver.lrunes',{
    columns:'record_id,record_type,title,meta_tags,createtime',
    filters:[
      {column:'record_type',operator:'eq',value:'galaxy_media'},
      ...dateRange
    ],
    orders:[{column:'createtime',ascending:true}]
  });
  const mediaClassified=await classifyStyleRows(mediaResult.rows,'lunarunes');
  for(const row of mediaClassified){
    const term=type==='style_group'?row.style_group:row.style_label;
    increment(map,type,term,{source:'lrunes',period:period||'all'});
  }
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
  if(id==='loc'){
    const scopeIds=await selectManagedScopeIds();
    const groups=await Promise.all(scopeIds.map(scope=>sourceRowsForScope(scope,period)));
    rows.push(...groups.flat());
  }else{
    rows.push(...await rowsForType(id,type,period,undefined));
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

export async function selectScopeRankingComparison(scopeId,{rankingType='',navigation={}}={}){
  const id=String(scopeId||'');
  if(!RANKING_TYPES[id])throw new Error('Scope 無效');
  if(id==='loc')return null;
  const type=RANKING_TYPES[id].includes(rankingType)?rankingType:RANKING_TYPES[id][0];
  const period=String(navigation.period||'all');
  const ranges=await resolveComparisonRanges(id,period);
  if(!ranges)return null;
  const [currentRows,previousRows,candidateRows]=await Promise.all([
    rowsForType(id,type,period,ranges.current),
    rowsForType(id,type,period,ranges.previous),
    type==='keyword'?rowsForType(id,'media_tag',period,ranges.current):Promise.resolve([])
  ]);
  return {
    type,
    period:ranges.period,
    days:ranges.days,
    currentRange:ranges.current,
    previousRange:ranges.previous,
    currentRows:mergeRows(currentRows),
    previousRows:mergeRows(previousRows),
    candidateRows:mergeRows(candidateRows)
  };
}

export async function selectScopeRankingTypes(scopeId){
  const types=RANKING_TYPES[String(scopeId||'')];
  if(!types)throw new Error('Scope 無效');
  return [...types];
}
