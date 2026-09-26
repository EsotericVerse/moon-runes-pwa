'use client';

import {Index} from 'flexsearch';
import {selectNeonRows} from './neon-repository';

const TABLES=Object.freeze({
  all:Object.freeze([
    ['silver.lo3rwang_style_time','作者脈絡',['entry_key','entry_type','title','summary'],'lo3rwang'],
    ['silver.lrunes','月之符文',['rune_number','rune_name','group_name','english_name','lots_positive','lots_negative','lots_half_positive','lots_half_negative','myth_story','rune_evolution_history','rune_description'],'lrunes'],
    ['silver.lrunes_style_context','符文關鍵詞與關係',['context_id','context_type','rune_number','related_rune_number','keyword_group','keyword','relation_type','title','rule_text','note'],'lrunes'],
    ['silver.lrunes_style_time','符文時期',['entry_key','entry_type','title','summary','period','entry_name','start_date','end_date','note'],'lrunes'],
    ['silver.lrunes_galaxy','符文文字',['galaxy_id','scope_id','category','content_type','source_role','title','content','meta_tags','created_at','source_ref','source_id'],'lrunes'],
    ['silver.lo3rwang_galaxy','作者正文',['galaxy_id','scope_id','title','content','source_platform','source_id','target_id','ref_id','url','searchable','created_at','updated_at'],'lo3rwang'],
    ['silver.faq_entries','FAQ',['faq_id','category','intent','question','answer','status','source_path'],'loc'],
    ['silver.lo3rwang_galaxy_media','音樂與多媒體',['media_id','scope_id','media_link','source_platform','source_native_id','media_type','title','url','meta_tags','style_tags','created_at','created_date','playlist','publication_status','play_count','like_count','view_count','is_representative'],'lo3rwang']
  ]),
  '月之符文':Object.freeze([
    ['silver.lrunes','月之符文',['rune_number','rune_name','group_name','english_name','lots_positive','lots_negative','lots_half_positive','lots_half_negative','myth_story','rune_evolution_history','rune_description'],'lrunes'],
    ['silver.lrunes_style_context','符文關鍵詞與關係',['context_id','context_type','rune_number','related_rune_number','keyword_group','keyword','relation_type','title','rule_text','note'],'lrunes'],
    ['silver.lrunes_style_time','符文時期',['entry_key','entry_type','title','summary','period','entry_name','start_date','end_date','note'],'lrunes'],
    ['silver.lrunes_galaxy','符文文字',['galaxy_id','scope_id','category','content_type','source_role','title','content','meta_tags','created_at','source_ref','source_id'],'lrunes']
  ]),
  lo3rwang:Object.freeze([
    ['silver.lo3rwang_galaxy','作者正文',['galaxy_id','scope_id','title','content','source_platform','source_id','target_id','ref_id','url','searchable','created_at','updated_at'],'lo3rwang'],
    ['silver.lo3rwang_galaxy_media','音樂與多媒體',['media_id','scope_id','media_link','source_platform','source_native_id','media_type','title','url','meta_tags','style_tags','created_at','created_date','playlist','publication_status','play_count','like_count','view_count','is_representative'],'lo3rwang']
  ]),
  治理:Object.freeze([
    ['silver.lo3rwang_style_time','治理脈絡',['entry_key','entry_type','title','summary'],'lo3rwang'],
    ['silver.faq_entries','FAQ',['faq_id','category','intent','question','answer','status','source_path'],'loc']
  ])
});

const SEARCH_PAGE_SIZE=500;
const MAX_INDEX_RESULTS=5000;
const SCOPE_SEARCH_ALIASES=Object.freeze({
  loc:'loc lunacodex luna codex 月典',
  lunarunes:'lunarunes lrunes 月之符文 符文',
  lo3rwang:'lo3rwang 政德 王政德 lucas oscar wang'
});
const SCOPE_SEARCH_TITLES=Object.freeze({
  loc:'LunaCodex／月典',
  lunarunes:'LunaRunes／月之符文',
  lo3rwang:'lo3rwang／政德'
});

function normalizeSearchText(value){
  return String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\\s\\u3000]+/g,'');
}

function rowSearchText(row){
  return normalizeSearchText(Object.values(row||{}).filter(value=>typeof value==='string').join(' '));
}

async function selectAllNeonRows(table,source,columns,scopeId=''){
  const rows=[];let offset=0;let total=null;
  while(total===null||offset<total){
    const result=await selectNeonRows(table,{columns:columns.join(','),count:'exact',range:[offset,offset+SEARCH_PAGE_SIZE-1]});
    rows.push(...result.rows.map(row=>({row:{...row,scope_id:row.scope_id||scopeId},source})));
    total=Number.isFinite(Number(result.count))?Number(result.count):offset+result.rows.length;
    if(result.rows.length<SEARCH_PAGE_SIZE)break;
    offset+=result.rows.length;
  }
  return rows;
}

export async function selectNeonSearchRows(collectionId){
  const tables=TABLES[collectionId]||TABLES.all;
  const settled=await Promise.all(tables.map(async([table,source,columns,scopeId])=>{
    try{
      return {table,rows:await selectAllNeonRows(table,source,columns,scopeId),error:null};
    }catch(error){
      return {table,rows:[],error:new Error(`Neon Search SELECT ${table}: ${error?.message||'query failed'}`)};
    }
  }));
  let scopeRows=[];
  if(collectionId==='all'){
    try{
      const {rows}=await selectNeonRows('silver.manage',{
        columns:'record_type,group_id,scope_id,active,display_order',
        filters:[
          {column:'record_type',operator:'in',value:['group','scope']},
          {column:'active',operator:'eq',value:true}
        ],
        orders:[{column:'display_order',ascending:true}],
        limit:100
      });
      scopeRows=rows
        .map(row=>({...row,scope_id:row.scope_id||row.group_id||''}))
        .filter(row=>['loc','lrunes','lo3rwang'].includes(String(row.scope_id||'')))
        .map(row=>({
          row:{
            ...row,
            scope_card:true,
            title:SCOPE_SEARCH_TITLES[row.scope_id]||row.scope_id,
            search_terms:[row.scope_id,SCOPE_SEARCH_ALIASES[row.scope_id]].filter(Boolean).join(' '),
            summary:''
          },
          source:'Scope'
        }));
    }catch{}
  }
  const rows=[...scopeRows,...settled.flatMap(item=>item.rows)];
  const failures=settled.filter(item=>item.error).map(item=>item.error);
  const successfulTables=settled.length-failures.length;
  if(!successfulTables)throw new AggregateError(failures,'Neon 搜尋資料表全部無法查詢');
  const index=new Index({tokenize:'full'});
  rows.forEach(({row},id)=>index.add(id,rowSearchText(row)));
  return {index,rows,failures};
}

export async function searchNeonRows(collectionId,query,{limit=MAX_INDEX_RESULTS,offset=0}={}){
  const source=await selectNeonSearchRows(collectionId);
  const normalized=normalizeSearchText(query);
  if(!normalized)return {...source,rows:[]};
  const safeLimit=Math.max(1,Math.min(MAX_INDEX_RESULTS,Number(limit)||MAX_INDEX_RESULTS));
  const safeOffset=Math.max(0,Number(offset)||0);
  const ids=source.index.search(normalized,{limit:safeLimit,offset:safeOffset});
  const matched=ids.map(id=>source.rows[Number(id)]).filter(Boolean);
  const scopeHits=matched.filter(item=>item.row?.scope_card);
  const matchedScopeIds=new Set(scopeHits.map(item=>String(item.row?.scope_id||'')));
  const scopedContent=matched.filter(item=>!item.row?.scope_card&&matchedScopeIds.has(String(item.row?.scope_id||'')));
  const otherContent=matched.filter(item=>!item.row?.scope_card&&!matchedScopeIds.has(String(item.row?.scope_id||'')));
  return {...source,rows:[...scopeHits,...scopedContent,...otherContent]};
}
