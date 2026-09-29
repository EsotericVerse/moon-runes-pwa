'use client';

import {createTextIndex,literalTextMatches,searchTextIndex} from './text-engine.mjs';
import {splitRuneKeywordEntries} from './model/rune-keyword-rules.mjs';
import {selectNeonCount,selectNeonRows} from './neon-query';


async function processNeonHeavyRows(table,{columns,filters=[],orFilter='',orders=[],onRow,onBatch}={}){
  const total=await selectNeonCount(table,{filters,orFilter});
  let offset=0,processed=0;
  const size=500;
  while(offset<total){
    const page=await selectNeonRows(table,{columns,filters,orFilter,orders,limit:size,offset});
    if(!page.rows.length)break;
    if(typeof onBatch==='function')await onBatch(page.rows);
    else if(typeof onRow==='function')for(const row of page.rows)await onRow(row);
    processed+=page.rows.length;
    offset+=page.rows.length;
  }
  return {processed,stopped:false,nextOffset:offset,total};
}

function runeKeywordEntries(value){
  return String(value||'').split(/[、,，\n]+/).map(item=>item.trim()).filter(Boolean);
}

async function selectAuthorStyleCatalog(){
  const styles=await selectNeonRows('silver.lo3rwang_style',{
    columns:'style_no,representative_name,parent_group_name,order_no',
    filters:[{column:'node_type',operator:'eq',value:'style'}],
    orders:[{column:'style_no',ascending:true}],
    limit:8
  });
  const total=await selectNeonCount('silver.lo3rwang_style',{
    filters:[{column:'node_type',operator:'eq',value:'keyword'}]
  });
  const keywords=[];
  let offset=0;
  const size=500;
  while(offset<total){
    const page=await selectNeonRows('silver.lo3rwang_style',{
      columns:'style_no,keyword_group,keyword,order_no',
      filters:[{column:'node_type',operator:'eq',value:'keyword'}],
      orders:[{column:'style_no',ascending:true},{column:'order_no',ascending:true}],
      limit:Math.min(size,total-offset),
      offset
    });
    if(!page.rows.length)break;
    keywords.push(...page.rows);
    offset+=page.rows.length;
  }
  const styleMap=new Map((styles.rows||[]).map(row=>[Number(row.style_no),{
    rune_number:Number(row.style_no),
    style_label:String(row.representative_name||'').trim(),
    style_group:String(row.parent_group_name||'').trim(),
    order:Number(row.order_no)||Number(row.style_no)
  }]));
  return keywords.map(row=>{
    const style=styleMap.get(Number(row.style_no));
    const keyword=String(row.keyword||'').trim();
    if(!style||!keyword||!style.style_label)return null;
    return {
      ...style,
      keyword,
      keyword_group:String(row.keyword_group||'').trim()
    };
  }).filter(Boolean);
}

async function selectRuneCatalog(){
  const result=await selectNeonRows('silver.runes',{
    columns:'rune_id,rune_name,group_name,positive_keywords,negative_keywords,extra_rules',
    orders:[{column:'rune_id',ascending:true}],
    limit:67
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

export async function selectKeywordCatalog(scopeId=''){
  const id=String(scopeId||'').trim();
  if(id==='lo3rwang')return selectAuthorStyleCatalog();
  if(id==='lunarunes'||id==='lrunes')return selectRuneCatalog();
  return [];
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
  rows.forEach((row,index)=>engine.add(String(index),keywordTextOf(row)));
  return engine;
}

function literalMatchedIds(source,ids,keyword,{and=[],nor=[]}={}){
  return (Array.isArray(ids)?ids:[]).filter(id=>{
    const row=source[Number(id)];
    return row&&literalTextMatches(keywordTextOf(row),keyword,{and,nor});
  });
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
        const matchedIds=literalMatchedIds(source,match.ids,keyword,{and,nor});
        output.push({
          keyword,
          keyword_group:keywordGroup,
          rune_number:rune.rune_number,
          style_label:rune.style_label,
          style_group:rune.style_group,
          item_count:matchedIds.length,
          rank_value:matchedIds.length
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
        const matchedIds=literalMatchedIds(source,match.ids,keyword,{and,nor});
        for(const id of matchedIds){
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
