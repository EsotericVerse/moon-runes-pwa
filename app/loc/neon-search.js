'use client';

import {Index} from 'flexsearch';
import {selectNeonRows} from './neon-repository';

const LRUNES_SOURCES=Object.freeze([
  ['silver.lrunes','月之符文',['record_id','rune_number','rune_name','group_name','english_name','lots_positive','lots_negative','lots_half_positive','lots_half_negative','myth_story','rune_evolution_history','rune_description'],'lrunes',[{column:'record_type',operator:'eq',value:'rune'}]],
  ['silver.lrunes','符文關鍵詞',['record_id','rune_number','keyword_group','keyword'],'lrunes',[{column:'record_type',operator:'eq',value:'keyword'},{column:'active',operator:'eq',value:true}]],
  ['silver.lrunes','符文規則',['record_id','title','rule_text','before_text','after_text','note'],'lrunes',[{column:'record_type',operator:'eq',value:'rule'},{column:'active',operator:'eq',value:true}]],
  ['silver.manage','符文時期',['record_id','record_type','scope_id','label','resource_id','note','time_date','anchor_pair','status','date_status','year_value','visibility'],'lrunes',[{column:'scope_id',operator:'eq',value:'lrunes'},{column:'record_type',operator:'in',value:['anchor','period','event']}]],
  ['silver.lrunes','符文文字',['record_id','galaxy_id','scope_id','category','content_type','source_name','source_role','title','content','meta_tags','created_at','source_ref','source_id','target_id','ref_id','url','searchable','updated_at'],'lrunes',[{column:'record_type',operator:'eq',value:'galaxy'}]],
  ['silver.lrunes','符文多媒體',['record_id','media_id','scope_id','media_link','source_name','source_native_id','media_type','title','url','meta_tags','style_tags','created_at','created_date','playlist','publication_status','play_count','like_count','view_count','is_representative'],'lrunes',[{column:'record_type',operator:'eq',value:'galaxy_media'}]]
]);

const TABLES=Object.freeze({
  all:Object.freeze([
    ['silver.manage','作者脈絡',['record_id','record_type','scope_id','label','resource_id','note','time_date','anchor_pair','status','date_status','year_value','visibility'],'lo3rwang',[{column:'scope_id',operator:'eq',value:'lo3rwang'},{column:'record_type',operator:'in',value:['anchor','period','event']}]],
    ...LRUNES_SOURCES,
    ['silver.lo3rwang_galaxy','作者正文',['galaxy_id','scope_id','title','content','source_name','source_id','target_id','ref_id','url','searchable','created_at','updated_at'],'lo3rwang',[]],
    ['silver.faq_entries','FAQ',['faq_id','category','intent','question','answer','status','source_path'],'loc',[]],
    ['silver.lo3rwang_galaxy_media','音樂與多媒體',['media_id','scope_id','media_link','source_name','source_native_id','media_type','title','url','meta_tags','style_tags','created_at','created_date','playlist','publication_status','play_count','like_count','view_count','is_representative'],'lo3rwang',[]]
  ]),
  '月之符文':LRUNES_SOURCES,
  lo3rwang:Object.freeze([
    ['silver.lo3rwang_galaxy','作者正文',['galaxy_id','scope_id','title','content','source_name','source_id','target_id','ref_id','url','searchable','created_at','updated_at'],'lo3rwang',[]],
    ['silver.lo3rwang_galaxy_media','音樂與多媒體',['media_id','scope_id','media_link','source_name','source_native_id','media_type','title','url','meta_tags','style_tags','created_at','created_date','playlist','publication_status','play_count','like_count','view_count','is_representative'],'lo3rwang',[]]
  ]),
  治理:Object.freeze([
    ['silver.manage','治理脈絡',['record_id','record_type','scope_id','label','resource_id','note','time_date','anchor_pair','status','date_status','year_value','visibility'],'lo3rwang',[{column:'scope_id',operator:'eq',value:'lo3rwang'},{column:'record_type',operator:'in',value:['anchor','period','event']}]],
    ['silver.faq_entries','FAQ',['faq_id','category','intent','question','answer','status','source_path'],'loc',[]]
  ])
});

const SEARCH_PAGE_SIZE=500;
const MAX_INDEX_RESULTS=500;
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
  return String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
}

function rowSearchText(row){
  return normalizeSearchText(Object.values(row||{}).filter(value=>typeof value==='string').join(' '));
}

function escapeLike(value){
  return String(value||'').replace(/[\\%_]/g,match=>'\\'+match);
}

function searchableColumns(columns=[]){
  const preferred=['title','content','summary','display_text','meta_tags','style_tags','description','question','answer','rule_text','note','label','rune_name','english_name','keyword','source_name'];
  return preferred.filter(column=>columns.includes(column));
}

async function searchTableRows(table,source,columns,scopeId='',filters=[],query,{limit,offset}){
  const fields=searchableColumns(columns);
  if(!fields.length)return [];
  const pattern='%'+escapeLike(query)+'%';
  const orFilter=fields.map(field=>field+'.ilike.'+pattern).join(',');
  const result=await selectNeonRows(table,{
    columns:columns.join(','),
    filters,
    orFilter,
    limit,
    offset
  });
  return result.rows.map(row=>({row:{...row,scope_id:row.scope_id||scopeId},source}));
}

async function searchScopeCards(query){
  const normalized=normalizeSearchText(query);
  if(!normalized)return [];
  const hits=[];
  for(const scopeId of Object.keys(SCOPE_SEARCH_ALIASES)){
    const haystack=normalizeSearchText(scopeId+' '+(SCOPE_SEARCH_ALIASES[scopeId]||'')+' '+(SCOPE_SEARCH_TITLES[scopeId]||''));
    if(!haystack.includes(normalized))continue;
    hits.push({
      row:{
        scope_card:true,
        scope_id:scopeId,
        title:SCOPE_SEARCH_TITLES[scopeId]||scopeId,
        search_terms:SCOPE_SEARCH_ALIASES[scopeId]||'',
        summary:''
      },
      source:'Scope'
    });
  }
  return hits;
}

export async function selectNeonSearchRows(collectionId,query,{limit=SEARCH_PAGE_SIZE,offset=0}={}){
  const tables=TABLES[collectionId]||TABLES.all;
  const safeLimit=Math.max(1,Math.min(SEARCH_PAGE_SIZE,Number(limit)||SEARCH_PAGE_SIZE));
  const safeOffset=Math.max(0,Number(offset)||0);
  const perTable=Math.max(20,Math.ceil(safeLimit/Math.max(1,tables.length)));
  const settled=await Promise.all(tables.map(async([table,source,columns,scopeId,filters])=>{
    try{
      return {table,rows:await searchTableRows(table,source,columns,scopeId,filters,query,{limit:perTable,offset:safeOffset}),error:null};
    }catch(error){
      return {table,rows:[],error:new Error(`Neon Search SELECT ${table}: ${error?.message||'query failed'}`)};
    }
  }));
  const scopeRows=collectionId==='all'?await searchScopeCards(query):[];
  const rows=[...scopeRows,...settled.flatMap(item=>item.rows)];
  const failures=settled.filter(item=>item.error).map(item=>item.error);
  const successfulTables=settled.length-failures.length;
  if(!successfulTables)throw new AggregateError(failures,'Neon 搜尋資料表全部無法查詢');
  return {rows,failures};
}

export async function searchNeonRows(collectionId,query,{limit=SEARCH_PAGE_SIZE,offset=0}={}){
  const normalized=normalizeSearchText(query);
  if(!normalized)return {rows:[],failures:[]};
  const safeLimit=Math.max(1,Math.min(SEARCH_PAGE_SIZE,Number(limit)||SEARCH_PAGE_SIZE));
  const safeOffset=Math.max(0,Number(offset)||0);
  const source=await selectNeonSearchRows(collectionId,query,{limit:safeLimit,offset:safeOffset});
  const filtered=source.rows.filter(({row})=>row?.scope_card||rowSearchText(row).includes(normalized));
  const index=new Index({tokenize:'full'});
  filtered.forEach(({row},id)=>index.add(id,rowSearchText(row)));
  const ids=index.search(normalized,{limit:safeLimit});
  const matched=ids.map(id=>filtered[Number(id)]).filter(Boolean);
  const scopeHits=matched.filter(item=>item.row?.scope_card);
  const matchedScopeIds=new Set(scopeHits.map(item=>String(item.row?.scope_id||'')));
  const scopedContent=matched.filter(item=>!item.row?.scope_card&&matchedScopeIds.has(String(item.row?.scope_id||'')));
  const otherContent=matched.filter(item=>!item.row?.scope_card&&!matchedScopeIds.has(String(item.row?.scope_id||'')));
  return {...source,rows:[...scopeHits,...scopedContent,...otherContent]};
}
