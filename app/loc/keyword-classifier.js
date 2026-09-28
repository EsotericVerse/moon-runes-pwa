'use client';

import {createTextIndex,searchTextIndex} from './text-engine.mjs';
import {splitRuneKeywordEntries} from './model/rune-keyword-rules.mjs';
import {neonPublicClient} from './neon-client';


function __relation(table){
  const [schema,name]=String(table).split('.');
  return neonPublicClient.schema(schema).from(name);
}
function __filters(query,filters=[]){
  for(const filter of filters)query=filter.operator==='in'?query.in(filter.column,filter.value):query[filter.operator](filter.column,filter.value);
  return query;
}
function __orders(query,orders=[]){
  for(const order of orders)query=query.order(order.column,{ascending:order.ascending??true,nullsFirst:order.nullsFirst});
  return query;
}
async function __select(table,{columns='*',filters=[],orFilter='',orders=[],limit=null,offset=0,range=null,count=null}={}){
  let query=__relation(table).select(columns,count?{count}:undefined);
  query=__filters(query,filters);
  if(orFilter)query=query.or(orFilter);
  query=__orders(query,orders);
  if(Array.isArray(range)&&range.length===2)query=query.range(range[0],range[1]);
  else if(Number.isFinite(limit))query=limit>0?query.range(offset,offset+limit-1):query.limit(0);
  const {data,error,count:total}=await query;
  if(error)throw new Error(error.message||('Neon SELECT '+table+' failed'));
  return {rows:data||[],count:total};
}
async function selectNeonRows(table,options={}){return __select(table,options);}
async function selectNeonAllRows(table,options={}){
  const {limit,offset,range,count,...rest}=options||{};
  const rows=[];
  let cursor=0;
  const size=500;
  while(true){
    const page=await __select(table,{...rest,limit:size,offset:cursor});
    rows.push(...page.rows);
    if(page.rows.length<size)break;
    cursor+=page.rows.length;
  }
  return {rows,count:rows.length};
}

async function selectNeonCatalog(table,options={}){return selectNeonAllRows(table,options);}

async function processNeonHeavyRows(table,{columns,filters=[],orFilter='',orders=[],onRow,onBatch}={}){
  let offset=0,processed=0;
  const size=96;
  while(true){
    const page=await __select(table,{columns,filters,orFilter,orders,limit:size,offset});
    if(!page.rows.length)break;
    if(typeof onBatch==='function')await onBatch(page.rows);
    else if(typeof onRow==='function')for(const row of page.rows)await onRow(row);
    processed+=page.rows.length;
    offset+=page.rows.length;
    if(page.rows.length<size)break;
  }
  return {processed,stopped:false,nextOffset:offset};
}

function runeKeywordEntries(value){
  return String(value||'').split(/[、,，\n]+/).map(item=>item.trim()).filter(Boolean);
}

export async function selectKeywordCatalog(scopeId=''){
  const id=String(scopeId||'').trim();
  if(!['lo3rwang','lunarunes','lrunes'].includes(id))return [];
  const result=await selectNeonCatalog('silver.runes',{
    columns:'rune_id,rune_name,group_name,positive_keywords,negative_keywords,extra_rules',
    orders:[{column:'rune_id',ascending:true}]
  });
  const output=[];
  for(const row of result.rows||[]){
    const runeNumber=Number(row.rune_id);
    const base={
      rune_number:runeNumber,
      style_label:String(row.rune_name||'').trim(),
      style_group:String(row.group_name||'').trim(),
      order:runeNumber
    };
    for(const keyword of runeKeywordEntries(row.positive_keywords))output.push({...base,keyword,keyword_group:'positive'});
    for(const keyword of runeKeywordEntries(row.negative_keywords))output.push({...base,keyword,keyword_group:'negative'});
    for(const keyword of runeKeywordEntries(row.extra_rules))output.push({...base,keyword,keyword_group:'rules'});
  }
  return output;
}

export function keywordTextOf(row={}){
  return [
    row.title,row.content,row.meta_tags,row.description,row.media_metadata_text
  ].filter(Boolean).join(' ');
}

function compileCatalog(catalog=[]){
  const runes=new Map();
  for(const item of Array.isArray(catalog)?catalog:[]){
    const runeNumber=Number(item.rune_number);
    if(!Number.isInteger(runeNumber))continue;
    const rune=runes.get(runeNumber)||{
      rune_number:runeNumber,
      style_label:String(item.style_label||'').trim(),
      style_group:String(item.style_group||'').trim(),
      order:Number(item.order)||runeNumber,
      globalRules:[],
      groups:new Map()
    };
    const keywordGroup=String(item.keyword_group||'').trim()||'default';
    const parsed=splitRuneKeywordEntries([item.keyword]);
    if(parsed.rules.length){
      if(keywordGroup==='rules')rune.globalRules.push(...parsed.rules);
      else{
        const group=rune.groups.get(keywordGroup)||{keywords:[],rules:[]};
        group.rules.push(...parsed.rules);
        rune.groups.set(keywordGroup,group);
      }
    }else{
      const group=rune.groups.get(keywordGroup)||{keywords:[],rules:[]};
      group.keywords.push(...parsed.keywords);
      rune.groups.set(keywordGroup,group);
    }
    runes.set(runeNumber,rune);
  }
  return [...runes.values()].sort((a,b)=>a.order-b.order||a.rune_number-b.rune_number);
}

function buildEngine(rows=[]){
  const engine=createTextIndex();
  rows.forEach((row,index)=>engine.add(String(index),keywordTextOf(row),row));
  return engine;
}

export function countKeywordHitsWithCatalog(rows=[],catalog=[]){
  const source=Array.isArray(rows)?rows:[];
  const compiled=compileCatalog(catalog);
  if(!source.length||!compiled.length)return [];
  const engine=buildEngine(source);
  const output=[];

  for(const rune of compiled){
    for(const [keywordGroup,group] of rune.groups){
      if(!group.keywords.length)continue;
      const rules=[...rune.globalRules,...group.rules];
      const and=rules.filter(rule=>rule.operator==='AND').map(rule=>rule.keyword);
      const nor=rules.filter(rule=>rule.operator==='NOR').map(rule=>rule.keyword);
      const seenKeywords=new Set();
      for(const rawKeyword of group.keywords){
        const keyword=String(rawKeyword||'').trim();
        if(!keyword||seenKeywords.has(keyword))continue;
        seenKeywords.add(keyword);
        const match=searchTextIndex(engine,keyword,{and,nor,limit:engine.size,offset:0});
        output.push({
          keyword,
          keyword_group:keywordGroup,
          rune_number:rune.rune_number,
          style_label:rune.style_label,
          style_group:rune.style_group,
          item_count:match.totalCount,
          rank_value:match.totalCount
        });
      }
    }
  }
  return output;
}

export function observeKeywordHitsWithCatalog(rows=[],catalog=[]){
  const source=Array.isArray(rows)?rows:[];
  const compiled=compileCatalog(catalog);
  if(!source.length)return [];
  if(!compiled.length)return source.map(row=>({...row,keyword_hits:[],keyword_hit_count:0}));
  const engine=buildEngine(source);
  const states=source.map(()=>new Map());

  for(const rune of compiled){
    for(const [keywordGroup,group] of rune.groups){
      if(!group.keywords.length)continue;
      const rules=[...rune.globalRules,...group.rules];
      const and=rules.filter(rule=>rule.operator==='AND').map(rule=>rule.keyword);
      const nor=rules.filter(rule=>rule.operator==='NOR').map(rule=>rule.keyword);
      const seenKeywords=new Set();
      for(const rawKeyword of group.keywords){
        const keyword=String(rawKeyword||'').trim();
        if(!keyword||seenKeywords.has(keyword))continue;
        seenKeywords.add(keyword);
        const match=searchTextIndex(engine,keyword,{and,nor,limit:engine.size,offset:0});
        for(const id of match.ids){
          const index=Number(id);
          const state=states[index];
          if(!state)continue;
          const key=[rune.rune_number,keywordGroup,keyword].join('\u0000');
          state.set(key,{
            keyword,
            keyword_group:keywordGroup,
            rune_number:rune.rune_number,
            style_label:rune.style_label,
            style_group:rune.style_group
          });
        }
      }
    }
  }

  return source.map((row,index)=>({
    ...row,
    keyword_hits:[...states[index].values()],
    keyword_hit_count:states[index].size
  }));
}

export async function countKeywordHits(rows=[],scopeId=''){
  const catalog=await selectKeywordCatalog(scopeId);
  return countKeywordHitsWithCatalog(rows,catalog);
}

export async function processKeywordTableRows(table,{
  columns,filters=[],orFilter='',orders=[],scopeId='',rowFilter=null,onCounts
}={}){
  if(typeof onCounts!=='function')throw new TypeError('Keyword processing requires onCounts');
  const catalog=await selectKeywordCatalog(scopeId);
  if(!catalog.length)return {processed:0,stopped:false,nextOffset:0};
  return processNeonHeavyRows(table,{
    columns,filters,orFilter,orders,
    onBatch:async rows=>{
      const selected=typeof rowFilter==='function'?rows.filter(rowFilter):rows;
      return onCounts(countKeywordHitsWithCatalog(selected,catalog));
    }
  });
}

export async function observeKeywordHits(rows=[],scopeId=''){
  const catalog=await selectKeywordCatalog(scopeId);
  return observeKeywordHitsWithCatalog(rows,catalog);
}

export async function processKeywordObservationRows(table,{
  columns,filters=[],orFilter='',orders=[],scopeId='',rowFilter=null,onObserved
}={}){
  if(typeof onObserved!=='function')throw new TypeError('Keyword observation processing requires onObserved');
  const catalog=await selectKeywordCatalog(scopeId);
  if(!catalog.length)return {processed:0,stopped:false,nextOffset:0};
  return processNeonHeavyRows(table,{
    columns,filters,orFilter,orders,
    onBatch:async rows=>{
      const selected=typeof rowFilter==='function'?rows.filter(rowFilter):rows;
      return onObserved(observeKeywordHitsWithCatalog(selected,catalog));
    }
  });
}
