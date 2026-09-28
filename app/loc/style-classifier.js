'use client';

import {processNeonHeavyRows,selectNeonCatalog,selectNeonRows} from './neon-repository';
import {createTextIndex,searchTextIndex} from './text-engine.mjs';
import {splitRuneKeywordEntries} from './model/rune-keyword-rules.mjs';

let canonicalCatalogPromise=null;
let authorCatalogPromise=null;

function compareRank(a,b){
  return Number(b.count||0)-Number(a.count||0)
    ||Number(a.order||0)-Number(b.order||0)
    ||String(a.label||'').localeCompare(String(b.label||''));
}

function runeKeywordEntries(value){
  return String(value||'').split(/[、,，\n]+/).map(item=>item.trim()).filter(Boolean);
}

async function selectScopeStyleCatalog(scopeId){
  const id=String(scopeId||'').trim()==='lunarunes'?'lrunes':String(scopeId||'').trim();
  if(!['lo3rwang','lrunes'].includes(id))return [];
  const scopeTable='silver.'+id;
  const current=await selectNeonRows(scopeTable,{
    columns:'id,style',
    filters:[{column:'id',operator:'eq',value:id}],
    limit:1
  });
  if(!current.rows[0]?.style)return [];
  const table=id==='lo3rwang'?'silver.lo3rwang_style':'silver.lrunes_style';
  const [styleResult,keywordResult]=await Promise.all([
    selectNeonCatalog(table,{
      columns:'style_no,node_type,representative_name,parent_group_name,order_no',
      filters:[{column:'node_type',operator:'eq',value:'style'}],
      orders:[{column:'order_no',ascending:true},{column:'style_no',ascending:true}]
    }),
    selectNeonCatalog(table,{
      columns:'style_no,node_type,keyword_group,keyword,order_no',
      filters:[{column:'node_type',operator:'eq',value:'keyword'}],
      orders:[{column:'style_no',ascending:true},{column:'order_no',ascending:true}]
    })
  ]);
  const styleMap=new Map((styleResult.rows||[]).map(row=>[Number(row.style_no),{
    catalog_id:Number(row.style_no),
    style_no:Number(row.style_no),
    style_label:String(row.representative_name||'').trim(),
    style_group:String(row.parent_group_name||'').trim(),
    order:Number(row.order_no)||Number(row.style_no)
  }]));
  return (keywordResult.rows||[]).map((row,index)=>{
    const style=styleMap.get(Number(row.style_no));
    const keyword=String(row.keyword||'').trim();
    if(!style||!keyword||!style.style_label)return null;
    return {
      keyword,
      keyword_group:String(row.keyword_group||'').trim(),
      catalog_id:style.catalog_id,
      style_no:style.style_no,
      style_label:style.style_label,
      style_group:style.style_group,
      order:Number(row.order_no)||index
    };
  }).filter(Boolean);
}

export async function selectAuthorStyleCatalog(){
  return selectScopeStyleCatalog('lo3rwang');
}

export async function selectKeywordCatalog(scopeId=''){
  const id=String(scopeId||'').trim();
  if(id==='lo3rwang')return selectAuthorStyleCatalog();
  if(!['lunarunes','lrunes'].includes(id))return [];
  const result=await selectNeonCatalog('silver.runes',{
    columns:'rune_id,rune_name,group_name,positive_keywords,negative_keywords,extra_rules',
    orders:[{column:'rune_id',ascending:true}]
  });
  const output=[];
  for(const row of result.rows||[]){
    const runeId=Number(row.rune_id);
    const base={
      catalog_id:runeId,
      rune_id:runeId,
      style_label:String(row.rune_name||'').trim(),
      style_group:String(row.group_name||'').trim(),
      order:runeId
    };
    for(const keyword of runeKeywordEntries(row.positive_keywords))output.push({...base,keyword,keyword_group:'positive'});
    for(const keyword of runeKeywordEntries(row.negative_keywords))output.push({...base,keyword,keyword_group:'negative'});
    for(const keyword of runeKeywordEntries(row.extra_rules))output.push({...base,keyword,keyword_group:'rules'});
  }
  return output;
}

export function isConfiguredStyleCatalog(rows=[]){
  const source=Array.isArray(rows)?rows:[];
  return source.length>0&&source.every(row=>
    String(row?.style_label||'').trim()&&String(row?.style_group||'').trim()
  );
}

export async function selectStyleCatalog(scopeId=''){
  const id=String(scopeId||'').trim();
  if(id==='lo3rwang')return selectAuthorStyleCatalog();
  if(id==='lunarunes'||id==='lrunes')return selectScopeStyleCatalog('lrunes');
  return [];
}

export function styleTextOf(row={}){
  return [
    row.title,row.content,row.meta_tags,row.style_tags,row.description,row.media_metadata_text
  ].filter(Boolean).join(' ');
}

function compileCatalog(catalog=[]){
  const catalogItems=new Map();
  for(const item of Array.isArray(catalog)?catalog:[]){
    const catalogId=Number(item.catalog_id);
    if(!Number.isInteger(catalogId))continue;
    const catalogItem=catalogItems.get(catalogId)||{
      catalog_id:catalogId,
      style_label:String(item.style_label||'').trim(),
      style_group:String(item.style_group||'').trim(),
      order:Number(item.order)||catalogId,
      globalRules:[],
      groups:new Map()
    };
    const keywordGroup=String(item.keyword_group||'').trim()||'default';
    const parsed=splitRuneKeywordEntries([item.keyword]);
    if(parsed.rules.length){
      if(keywordGroup==='rules')catalogItem.globalRules.push(...parsed.rules);
      else{
        const group=catalogItem.groups.get(keywordGroup)||{keywords:[],rules:[]};
        group.rules.push(...parsed.rules);
        catalogItem.groups.set(keywordGroup,group);
      }
    }else{
      const group=catalogItem.groups.get(keywordGroup)||{keywords:[],rules:[]};
      group.keywords.push(...parsed.keywords);
      catalogItem.groups.set(keywordGroup,group);
    }
    catalogItems.set(catalogId,catalogItem);
  }
  return [...catalogItems.values()].sort((a,b)=>a.order-b.order||a.catalog_id-b.catalog_id);
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

  for(const catalogItem of compiled){
    for(const [keywordGroup,group] of catalogItem.groups){
      if(!group.keywords.length)continue;
      const rules=[...catalogItem.globalRules,...group.rules];
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
          const catalogKey=String(catalogItem.catalog_id);
          const catalogCount=state.runeCounts.get(catalogKey)||{
            key:catalogKey,
            label:catalogItem.style_label,
            group:catalogItem.style_group,
            keyword_group:keywordGroup,
            order:catalogItem.order,
            count:0
          };
          catalogCount.count+=1;
          state.runeCounts.set(catalogKey,catalogCount);
          if(catalogItem.style_group){
            const groupCount=state.groupCounts.get(catalogItem.style_group)||{
              key:catalogItem.style_group,
              label:catalogItem.style_group,
              order:catalogItem.order,
              count:0
            };
            groupCount.count+=1;
            state.groupCounts.set(catalogItem.style_group,groupCount);
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
      catalog_counts:rankedRunes,
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

  for(const catalogItem of compiled){
    for(const [keywordGroup,group] of catalogItem.groups){
      if(!group.keywords.length)continue;
      const rules=[...catalogItem.globalRules,...group.rules];
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
          catalog_id:catalogItem.catalog_id,
          style_label:catalogItem.style_label,
          style_group:catalogItem.style_group,
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

  for(const catalogItem of compiled){
    for(const [keywordGroup,group] of catalogItem.groups){
      if(!group.keywords.length)continue;
      const rules=[...catalogItem.globalRules,...group.rules];
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
          const key=[catalogItem.catalog_id,keywordGroup,keyword].join('\u0000');
          state.set(key,{
            keyword,
            keyword_group:keywordGroup,
            catalog_id:catalogItem.catalog_id,
            style_label:catalogItem.style_label,
            style_group:catalogItem.style_group
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

export async function classifyStyleRows(rows=[],scopeId=''){
  const catalog=await selectStyleCatalog(scopeId);
  return classifyStyleRowsWithCatalog(rows,catalog);
}

export async function countStyleKeywordHits(rows=[],scopeId=''){
  const catalog=await selectKeywordCatalog(scopeId);
  return countKeywordHitsWithCatalog(rows,catalog);
}

export async function processStyleTableRows(table,{
  columns,filters=[],orFilter='',orders=[],scopeId='',rowFilter=null,onClassified
}={}){
  if(typeof onClassified!=='function')throw new TypeError('Style processing requires onClassified');
  const catalog=await selectStyleCatalog(scopeId);
  if(!catalog.length)return {processed:0,stopped:false,nextOffset:0};
  return processNeonHeavyRows(table,{
    columns,filters,orFilter,orders,
    onBatch:async rows=>{
      const selected=typeof rowFilter==='function'?rows.filter(rowFilter):rows;
      const classified=classifyStyleRowsWithCatalog(selected,catalog);
      for(const row of classified)await onClassified(row);
    }
  });
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

export async function observeStyleKeywordHits(rows=[],scopeId=''){
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

export function clearStyleCatalogCache(){
  canonicalCatalogPromise=null;
  authorCatalogPromise=null;
}
