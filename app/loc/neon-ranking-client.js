import {ScopeRankingResponseSchema} from './scope-feature-contracts';
import {selectNeonRows} from './neon-repository';

const RANKING_TYPES=Object.freeze({
  loc:Object.freeze(['group','keyword','text_source','text_category','text_type','meta_source','meta_type','meta_style']),
  lunarunes:Object.freeze(['group','keyword']),
  lo3rwang:Object.freeze(['text_source','text_category','text_type','meta_source','meta_type','meta_style'])
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
  row.item_count+=1;row.rank_value=row.item_count;
  map.set(key,row);
}
function tokens(value){
  if(Array.isArray(value))return value.map(String).map(v=>v.trim()).filter(Boolean);
  return String(value||'').split(/[、,，;；|\n]+/).map(v=>v.trim()).filter(Boolean);
}
function dateFilters(range){
  if(!range?.start_date)return [];
  const filters=[{column:'created_at',operator:'gte',value:String(range.start_date).slice(0,10)+'T00:00:00+08:00'}];
  if(range.end_date)filters.push({column:'created_at',operator:'lte',value:String(range.end_date).slice(0,10)+'T23:59:59.999+08:00'});
  return filters;
}
async function resolvePeriod(period){
  const value=String(period||'').trim();
  if(!value||value==='all')return null;
  const {rows}=await selectNeonRows('silver.lo3rwang_style_time',{
    columns:'entry_key,period,start_date,end_date',
    filters:[{column:'entry_type',operator:'eq',value:'period'}],
    orders:[{column:'order_no',ascending:true}],limit:1000
  });
  return rows.find(row=>String(row.period||'')===value||String(row.entry_key||'')===value)||null;
}
async function authorRankings(period){
  const range=await resolvePeriod(period);
  const filters=dateFilters(range);
  const [texts,media]=await Promise.all([
    selectAllRows('silver.lo3rwang_galaxy',{columns:'source_platform,category,content_type,meta_tags,created_at',filters}),
    selectAllRows('silver.lo3rwang_galaxy_media',{columns:'source_platform,media_type,style_tags,meta_tags,created_at',filters})
  ]);
  const map=new Map();
  for(const row of texts){
    increment(map,'text_source',row.source_platform,{period:period||'all'});
    increment(map,'text_category',row.category,{period:period||'all'});
    increment(map,'text_type',row.content_type,{period:period||'all'});
  }
  for(const row of media){
    increment(map,'meta_source',row.source_platform,{period:period||'all'});
    increment(map,'meta_type',row.media_type,{period:period||'all'});
    for(const tag of tokens(row.style_tags))increment(map,'meta_style',tag,{period:period||'all'});
  }
  return [...map.values()];
}
async function runeRankings(){
  const [runes,context]=await Promise.all([
    selectAllRows('silver.lrunes',{
      columns:'rune_number,group_name',
      filters:[{column:'record_type',operator:'eq',value:'rune'}]
    }),
    selectAllRows('silver.lrunes',{
      columns:'keyword,active',
      filters:[
        {column:'record_type',operator:'eq',value:'keyword'},
        {column:'active',operator:'eq',value:true}
      ]
    })
  ]);
  const map=new Map();
  for(const row of runes)increment(map,'group',row.group_name,{source:'lrunes'});
  for(const row of context)increment(map,'keyword',row.keyword,{source:'lrunes'});
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
  const period=String(navigation.period||'all');
  const [author,runes]=await Promise.all([
    id==='loc'||id==='lo3rwang'?authorRankings(period):Promise.resolve([]),
    id==='loc'||id==='lunarunes'?runeRankings():Promise.resolve([])
  ]);
  let rows=[...author,...runes]
    .filter(row=>!rankingType||row.ranking_type===rankingType)
    .filter(row=>matchesNavigation(row,navigation));
  rows.sort((a,b)=>Number(b.rank_value)-Number(a.rank_value)||Number(b.item_count)-Number(a.item_count)||String(a.term).localeCompare(String(b.term)));
  const size=Math.max(1,Math.min(100,Math.floor(Number(limit)||20)));
  const start=Math.max(0,Math.floor(Number(offset)||0));
  const page=rows.slice(start,start+size);
  return ScopeRankingResponseSchema.parse({rows:page,offset:start,limit:size,hasMore:start+size<rows.length,types:RANKING_TYPES[id]});
}
export async function selectScopeRankingTypes(scopeId){
  const types=RANKING_TYPES[String(scopeId||'')];
  if(!types)throw new Error('Scope 無效');
  return [...types];
}
