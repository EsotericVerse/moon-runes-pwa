'use client';

import {selectNeonRows} from './neon-repository';

function escapeLike(value){
  return String(value||'').replace(/[\\%_]/g,match=>'\\'+match);
}

function makeProvider({id,table,source,scopeId,columns,searchFields,filters=[],dateColumn=''}){
  const frozenColumns=Object.freeze([...columns]);
  const frozenFields=Object.freeze([...searchFields]);
  const frozenFilters=Object.freeze(filters.map(item=>Object.freeze({...item})));

  function orFilter(query){
    const pattern='%'+escapeLike(query)+'%';
    return frozenFields.map(field=>field+'.ilike.'+pattern).join(',');
  }

  return Object.freeze({
    id,table,source,scopeId,
    columns:frozenColumns,
    searchFields:frozenFields,
    filters:frozenFilters,
    async count(query,{startDate='',endDate=''}={}){
      const rangeFilters=[...frozenFilters];
      if(dateColumn&&startDate)rangeFilters.push({column:dateColumn,operator:'gte',value:startDate});
      if(dateColumn&&endDate)rangeFilters.push({column:dateColumn,operator:'lte',value:endDate});
      const result=await selectNeonRows(table,{
        columns:frozenColumns[0]||'*',
        filters:rangeFilters,
        orFilter:orFilter(query),
        count:'exact',
        limit:0
      });
      return Math.max(0,Number(result.count)||0);
    },
    async search(query,{limit=20,offset=0,startDate='',endDate=''}={}){
      const rangeFilters=[...frozenFilters];
      if(dateColumn&&startDate)rangeFilters.push({column:dateColumn,operator:'gte',value:startDate});
      if(dateColumn&&endDate)rangeFilters.push({column:dateColumn,operator:'lte',value:endDate});
      const result=await selectNeonRows(table,{
        columns:frozenColumns.join(','),
        filters:rangeFilters,
        orFilter:orFilter(query),
        orders:dateColumn?[{column:dateColumn,ascending:false}]:[],
        limit,
        offset
      });
      return result.rows.map(row=>({
        row:{...row,scope_id:row.scope_id||scopeId},
        source,
        providerId:id
      }));
    }
  });
}

const authorText=makeProvider({
  id:'author-text',
  table:'silver.lo3rwang_galaxy',
  source:'作者正文',
  scopeId:'lo3rwang',
  columns:['galaxy_id','scope_id','title','content','source_name','source_id','target_id','ref_id','url','searchable','created_at','updated_at'],
  searchFields:['title','content','source_name'],
  dateColumn:'created_at'
});

const authorMedia=makeProvider({
  id:'author-media',
  table:'silver.lo3rwang_galaxy_media',
  source:'音樂與多媒體',
  scopeId:'lo3rwang',
  columns:['media_id','scope_id','media_link','source_name','source_native_id','media_type','title','url','meta_tags','style_tags','created_at','created_date','playlist','publication_status','play_count','like_count','view_count','is_representative'],
  searchFields:['title','meta_tags','style_tags','source_name'],
  dateColumn:'created_at'
});

const authorTimeline=makeProvider({
  id:'author-timeline',
  table:'silver.manage',
  source:'作者脈絡',
  scopeId:'lo3rwang',
  columns:['record_id','record_type','scope_id','label','resource_id','note','time_date','anchor_pair','status','date_status','year_value','visibility'],
  searchFields:['label','note','status'],
  dateColumn:'time_date',
  filters:[
    {column:'scope_id',operator:'eq',value:'lo3rwang'},
    {column:'record_type',operator:'in',value:['anchor','period','event']}
  ]
});

const runeCore=makeProvider({
  id:'rune-core',
  table:'silver.lrunes',
  source:'月之符文',
  scopeId:'lrunes',
  columns:['record_id','rune_number','rune_name','group_name','english_name','lots_positive','lots_negative','lots_half_positive','lots_half_negative','myth_story','rune_evolution_history','rune_description'],
  searchFields:['rune_name','group_name','english_name','lots_positive','lots_negative','lots_half_positive','lots_half_negative','myth_story','rune_evolution_history','rune_description'],
  filters:[{column:'record_type',operator:'eq',value:'rune'}]
});

const runeKeywords=makeProvider({
  id:'rune-keywords',
  table:'silver.lrunes',
  source:'符文關鍵詞',
  scopeId:'lrunes',
  columns:['record_id','rune_number','keyword_group','keyword'],
  searchFields:['keyword_group','keyword'],
  filters:[
    {column:'record_type',operator:'eq',value:'keyword'},
    {column:'active',operator:'eq',value:true}
  ]
});

const runeRules=makeProvider({
  id:'rune-rules',
  table:'silver.lrunes',
  source:'符文規則',
  scopeId:'lrunes',
  columns:['record_id','title','rule_text','before_text','after_text','note'],
  searchFields:['title','rule_text','before_text','after_text','note'],
  filters:[
    {column:'record_type',operator:'eq',value:'rule'},
    {column:'active',operator:'eq',value:true}
  ]
});

const runeTimeline=makeProvider({
  id:'rune-timeline',
  table:'silver.manage',
  source:'符文時期',
  scopeId:'lrunes',
  columns:['record_id','record_type','scope_id','label','resource_id','note','time_date','anchor_pair','status','date_status','year_value','visibility'],
  searchFields:['label','note','status'],
  dateColumn:'time_date',
  filters:[
    {column:'scope_id',operator:'eq',value:'lrunes'},
    {column:'record_type',operator:'in',value:['anchor','period','event']}
  ]
});

const runeText=makeProvider({
  id:'rune-text',
  table:'silver.lrunes',
  source:'符文文字',
  scopeId:'lrunes',
  columns:['record_id','galaxy_id','scope_id','category','content_type','source_name','source_role','title','content','meta_tags','created_at','source_ref','source_id','target_id','ref_id','url','searchable','updated_at'],
  searchFields:['title','content','meta_tags','source_name'],
  dateColumn:'created_at',
  filters:[{column:'record_type',operator:'eq',value:'galaxy'}]
});

const runeMedia=makeProvider({
  id:'rune-media',
  table:'silver.lrunes',
  source:'符文多媒體',
  scopeId:'lrunes',
  columns:['record_id','media_id','scope_id','media_link','source_name','source_native_id','media_type','title','url','meta_tags','style_tags','created_at','created_date','playlist','publication_status','play_count','like_count','view_count','is_representative'],
  searchFields:['title','meta_tags','style_tags','source_name'],
  dateColumn:'created_at',
  filters:[{column:'record_type',operator:'eq',value:'galaxy_media'}]
});

const faq=makeProvider({
  id:'faq',
  table:'silver.faq_entries',
  source:'FAQ',
  scopeId:'loc',
  columns:['faq_id','category','intent','question','answer','status','source_path'],
  searchFields:['category','intent','question','answer','status']
});

export const SEARCH_PROVIDERS=Object.freeze({
  all:Object.freeze([authorTimeline,runeCore,runeKeywords,runeRules,runeTimeline,runeText,runeMedia,authorText,faq,authorMedia]),
  lo3rwang:Object.freeze([authorText,authorMedia]),
  '月之符文':Object.freeze([runeCore,runeKeywords,runeRules,runeTimeline,runeText,runeMedia]),
  '治理':Object.freeze([authorTimeline,faq])
});

export function getSearchProviders(collectionId){
  return SEARCH_PROVIDERS[collectionId]||SEARCH_PROVIDERS.all;
}
