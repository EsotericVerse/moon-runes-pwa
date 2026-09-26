'use client';

import {Index} from 'flexsearch';
import {selectNeonRows} from './neon-repository';

const TABLES=Object.freeze({
  all:Object.freeze([
    ['silver.lo3rwang_context_entries','作者脈絡',['context_key','context_type','title','summary']],
    ['silver.runes_context_entries','符文脈絡',['context_key','context_type','title','summary']],
    ['api.lo3rwang_galaxy','作者正文',['scope_id','category','content_type','source_role','title','content','meta_tags','created_at','source_ref','in_reply_to_username','source_place','work_id']],
    ['silver.lrunes_runes','月之符文',['rune_number','rune_name','group_name','english_name','lots_positive','lots_negative','lots_half_positive','lots_half_negative','myth_story','rune_evolution_history']],
    ['silver.faq_entries','FAQ',['faq_id','category','intent','question','answer','status','source_path']],
    ['silver.lo3rwang_galaxy_media','音樂與多媒體',['media_id','scope_id','media_link','source_platform','source_native_id','media_type','title','url','meta_tags','style_tags','created_at','created_date','playlist','publication_status','play_count','like_count','view_count','is_representative']]
  ]),
  '月之符文':Object.freeze([
    ['silver.runes_context_entries','月之符文脈絡',['context_key','context_type','title','summary']],
    ['silver.lrunes_runes','月之符文',['rune_number','rune_name','group_name','english_name','lots_positive','lots_negative','lots_half_positive','lots_half_negative','myth_story','rune_evolution_history']]
  ]),
  lo3rwang:Object.freeze([
    ['api.lo3rwang_galaxy','作者正文',['scope_id','category','content_type','source_role','title','content','created_at','source_ref','in_reply_to_username','source_place','work_id']],
    ['silver.lo3rwang_galaxy_media','音樂與多媒體',['media_id','scope_id','media_link','source_platform','source_native_id','media_type','title','url','meta_tags','style_tags','created_at','created_date','playlist','publication_status','play_count','like_count','view_count','is_representative']]
  ]),
  治理:Object.freeze([
    ['silver.lo3rwang_context_entries','治理脈絡',['context_key','context_type','title','summary']],
    ['silver.faq_entries','FAQ',['faq_id','category','intent','question','answer','status','source_path']]
  ])
});

const SEARCH_PAGE_SIZE=500;
const MAX_INDEX_RESULTS=5000;
const SCOPE_SEARCH_ROWS=Object.freeze([
  Object.freeze({scope_id:'runes',title:'LunaRunes／月之符文',search_terms:'lunarunes 月之符文 符文',summary:'進入此 Scope 的脈絡頁。',source:'Scope'}),
  Object.freeze({scope_id:'lo3rwang',title:'lo3rwang',search_terms:'lo3rwang 王政德 政德',summary:'進入此 Scope 的脈絡頁。',source:'Scope'})
]);

function normalizeSearchText(value){
  return String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\\s\\u3000]+/g,'');
}

function rowSearchText(row){
  return normalizeSearchText(Object.values(row||{}).filter(value=>typeof value==='string').join(' '));
}

async function selectAllNeonRows(table,source,columns){
  const rows=[];let offset=0;let total=null;
  while(total===null||offset<total){
    const result=await selectNeonRows(table,{columns:columns.join(','),count:'exact',range:[offset,offset+SEARCH_PAGE_SIZE-1]});
    rows.push(...result.rows.map(row=>({row,source})));
    total=Number.isFinite(Number(result.count))?Number(result.count):offset+result.rows.length;
    if(result.rows.length<SEARCH_PAGE_SIZE)break;
    offset+=result.rows.length;
  }
  return rows;
}

export async function selectNeonSearchRows(collectionId){
  const tables=TABLES[collectionId]||TABLES.all;
  const settled=await Promise.all(tables.map(async([table,source,columns])=>{
    try{
      return {table,rows:await selectAllNeonRows(table,source,columns),error:null};
    }catch(error){
      return {table,rows:[],error:new Error(`Neon Search SELECT ${table}: ${error?.message||'query failed'}`)};
    }
  }));
  const rows=[...SCOPE_SEARCH_ROWS.map(row=>({row,source:'Scope'})),...settled.flatMap(item=>item.rows)];
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
  return {...source,rows:ids.map(id=>source.rows[Number(id)]).filter(Boolean)};
}
