'use client';

import {processNeonHeavyRows,selectNeonCatalog} from './neon-repository';
import {createTextIndex,searchTextIndex} from './text-engine.mjs';
import {splitRuneKeywordEntries} from './model/rune-keyword-rules.mjs';

let canonicalCatalogPromise=null;
let authorCatalogPromise=null;

function compareRank(a,b){
  return Number(b.count||0)-Number(a.count||0)
    ||Number(a.order||0)-Number(b.order||0)
    ||String(a.label||'').localeCompare(String(b.label||''));
}

export async function selectCanonicalStyleCatalog(){
  if(canonicalCatalogPromise)return canonicalCatalogPromise;
  canonicalCatalogPromise=(async()=>{
    const [runesResult,keywordsResult]=await Promise.all([
      selectNeonCatalog('silver.lrunes',{
        columns:'rune_number,rune_name,group_name,record_type',
        filters:[{column:'record_type',operator:'eq',value:'rune'}]
      }),
      selectNeonCatalog('silver.lrunes',{
        columns:'rune_number,keyword_group,keyword,active,record_type',
        filters:[
          {column:'record_type',operator:'eq',value:'keyword'},
          {column:'active',operator:'eq',value:true}
        ]
      })
    ]);
    const runeMap=new Map((runesResult.rows||[]).map(row=>[Number(row.rune_number),{
      rune_number:Number(row.rune_number),
      style_label:String(row.rune_name||'').trim(),
      style_group:String(row.group_name||'').trim()
    }]));
    return (keywordsResult.rows||[]).map((row,index)=>{
      const rune=runeMap.get(Number(row.rune_number));
      const keyword=String(row.keyword||'').trim();
      if(!rune||!keyword)return null;
      return {
        keyword,
        keyword_group:String(row.keyword_group||'').trim(),
        rune_number:rune.rune_number,
        style_label:rune.style_label,
        style_group:rune.style_group,
        order:index
      };
    }).filter(Boolean);
  })().catch(error=>{
    canonicalCatalogPromise=null;
    throw error;
  });
  return canonicalCatalogPromise;
}

export async function selectAuthorStyleCatalog(){
  if(authorCatalogPromise)return authorCatalogPromise;
  authorCatalogPromise=(async()=>{
    const [styleResult,keywordResult]=await Promise.all([
      selectNeonCatalog('silver.lo3rwang_style',{
        columns:'style_no,node_type,representative_name,parent_group_name,order_no',
        filters:[{column:'node_type',operator:'eq',value:'style'}],
        orders:[{column:'order_no',ascending:true},{column:'style_no',ascending:true}]
      }),
      selectNeonCatalog('silver.lo3rwang_style',{
        columns:'style_no,node_type,keyword_group,keyword,order_no',
        filters:[{column:'node_type',operator:'eq',value:'keyword'}],
        orders:[{column:'style_no',ascending:true},{column:'order_no',ascending:true}]
      })
    ]);
    const styleMap=new Map((styleResult.rows||[]).map(row=>[Number(row.style_no),{
      rune_number:Number(row.style_no),
      style_label:String(row.representative_name||'').trim(),
      style_group:String(row.parent_group_name||'').trim(),
      order:Number(row.order_no)||Number(row.style_no)
    }]));
    return (keywordResult.rows||[]).map((row,index)=>{
      const style=styleMap.get(Number(row.style_no));
      const keyword=String(row.keyword||'').trim();
      if(!style||!keyword)return null;
      return {
        keyword,
        keyword_group:String(row.keyword_group||'').trim(),
        rune_number:style.rune_number,
        style_label:style.style_label,
        style_group:style.style_group,
        order:Number(row.order_no)||index
      };
    }).filter(Boolean);
  })().catch(error=>{
    authorCatalogPromise=null;
    throw error;
  });
  return authorCatalogPromise;
}

export function isConfiguredStyleCatalog(rows=[]){
  const source=Array.isArray(rows)?rows:[];
  return source.length>0&&source.every(row=>
    String(row?.style_label||'').trim()&&String(row?.style_group||'').trim()
  );
}

export async function selectStyleCatalog(scopeId='lunarunes'){
  const id=String(scopeId||'').trim();
  if(id!=='lo3rwang')return selectCanonicalStyleCatalog();
  const author=await selectAuthorStyleCatalog();
  return isConfiguredStyleCatalog(author)?author:selectCanonicalStyleCatalog();
}

export function styleTextOf(row={}){
  return [
    row.title,row.content,row.meta_tags,row.style_tags,row.description,row.media_metadata_text
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

function emptyClassification(){
  return {style_label:'',style_group:'',hit_count:0,rune_counts:[],group_counts:[]};
}

function buildEngine(rows=[]){
  const engine=createTextIndex();
  rows.forEach((row,index)=>engine.add(String(index),styleTextOf(row),row));
  return engine;
}

export function classifyStyleRowsWithCatalog(rows=[],catalog=[]){
  const source=Array.isArray(rows)?rows:[];
  if(!source.length)return [];
  const compiled=compileCatalog(catalog);
  if(!compiled.length)return source.map(row=>({...row,...emptyClassification()}));

  const engine=buildEngine(source);
  const stats=source.map(()=>({
    hitCount:0,
    runeCounts:new Map(),
    groupCounts:new Map()
  }));

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
          const state=stats[index];
          if(!state)continue;
          state.hitCount+=1;
          const runeKey=String(rune.rune_number);
          const runeCount=state.runeCounts.get(runeKey)||{
            key:runeKey,
            label:rune.style_label,
            group:rune.style_group,
            keyword_group:keywordGroup,
            order:rune.order,
            count:0
          };
          runeCount.count+=1;
          state.runeCounts.set(runeKey,runeCount);
          if(rune.style_group){
            const groupCount=state.groupCounts.get(rune.style_group)||{
              key:rune.style_group,
              label:rune.style_group,
              order:rune.order,
              count:0
            };
            groupCount.count+=1;
            state.groupCounts.set(rune.style_group,groupCount);
          }
        }
      }
    }
  }

  return source.map((row,index)=>{
    const state=stats[index];
    const rankedRunes=[...state.runeCounts.values()].sort(compareRank);
    const rankedGroups=[...state.groupCounts.values()].sort(compareRank);
    return {
      ...row,
      style_label:rankedRunes[0]?.label||'',
      style_group:rankedGroups[0]?.label||'',
      hit_count:state.hitCount,
      rune_counts:rankedRunes,
      group_counts:rankedGroups
    };
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

export function classifyStyleText(value,catalog=[]){
  return classifyStyleRowsWithCatalog([{content:value}],catalog)[0]||emptyClassification();
}

export async function classifyStyleRows(rows=[],scopeId='lunarunes'){
  const catalog=await selectStyleCatalog(scopeId);
  return classifyStyleRowsWithCatalog(rows,catalog);
}

export async function countStyleKeywordHits(rows=[],scopeId='lunarunes'){
  const catalog=await selectStyleCatalog(scopeId);
  return countKeywordHitsWithCatalog(rows,catalog);
}

export async function processStyleTableRows(table,{
  columns,filters=[],orFilter='',orders=[],scopeId='lunarunes',onClassified
}={}){
  if(typeof onClassified!=='function')throw new TypeError('Style processing requires onClassified');
  const catalog=await selectStyleCatalog(scopeId);
  return processNeonHeavyRows(table,{
    columns,filters,orFilter,orders,
    onBatch:async rows=>{
      const classified=classifyStyleRowsWithCatalog(rows,catalog);
      for(const row of classified)await onClassified(row);
    }
  });
}

export async function processKeywordTableRows(table,{
  columns,filters=[],orFilter='',orders=[],scopeId='lunarunes',onCounts
}={}){
  if(typeof onCounts!=='function')throw new TypeError('Keyword processing requires onCounts');
  const catalog=await selectStyleCatalog(scopeId);
  return processNeonHeavyRows(table,{
    columns,filters,orFilter,orders,
    onBatch:async rows=>onCounts(countKeywordHitsWithCatalog(rows,catalog))
  });
}

export async function observeStyleKeywordHits(rows=[],scopeId='lunarunes'){
  const catalog=await selectStyleCatalog(scopeId);
  return observeKeywordHitsWithCatalog(rows,catalog);
}

export async function processKeywordObservationRows(table,{
  columns,filters=[],orFilter='',orders=[],scopeId='lunarunes',onObserved
}={}){
  if(typeof onObserved!=='function')throw new TypeError('Keyword observation processing requires onObserved');
  const catalog=await selectStyleCatalog(scopeId);
  return processNeonHeavyRows(table,{
    columns,filters,orFilter,orders,
    onBatch:async rows=>onObserved(observeKeywordHitsWithCatalog(rows,catalog))
  });
}

export function clearStyleCatalogCache(){
  canonicalCatalogPromise=null;
  authorCatalogPromise=null;
}
