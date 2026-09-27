'use client';

import {processNeonHeavyRows,selectNeonAllRows} from './neon-repository';
import {getRuntimeTextIndex,searchTextIndex} from './text-engine.mjs';

function unique(values=[]){
  return [...new Set(values.map(value=>String(value||'').trim()).filter(Boolean))];
}
function dateFilters(dateColumn,startDate,endDate){
  const filters=[];
  if(dateColumn&&startDate)filters.push({column:dateColumn,operator:'gte',value:startDate});
  if(dateColumn&&endDate)filters.push({column:dateColumn,operator:'lte',value:endDate});
  return filters;
}
function pick(row,columns){
  const output={};
  for(const column of columns)if(row?.[column]!==undefined)output[column]=row[column];
  return output;
}
function searchableText(row,fields){
  return fields.map(field=>row?.[field]).filter(value=>value!==undefined&&value!==null).join(' ');
}

function makeProvider({id,table,source,scopeId,idColumn,columns,searchFields,filters=[],dateColumn=''}){
  const outputColumns=Object.freeze(unique(columns));
  const indexedColumns=Object.freeze(unique([...columns,...searchFields]));
  const frozenFields=Object.freeze(unique(searchFields));
  const frozenFilters=Object.freeze(filters.map(item=>Object.freeze({...item})));
  const hasHeavyContent=indexedColumns.includes('content');

  async function buildIndex({startDate='',endDate=''}={}){
    const rangeFilters=[...frozenFilters,...dateFilters(dateColumn,startDate,endDate)];
    const cacheKey=['provider',id,startDate||'',endDate||''].join(':');
    return getRuntimeTextIndex(cacheKey,async engine=>{
      const add=row=>{
        const key=String(row?.[idColumn]??'').trim();
        if(!key)return;
        const metadata={
          ...pick(row,outputColumns),
          scope_id:row?.scope_id||scopeId
        };
        engine.add(key,searchableText(row,frozenFields),{
          row:metadata,
          source,
          providerId:id
        });
      };
      if(hasHeavyContent){
        await processNeonHeavyRows(table,{
          columns:indexedColumns.join(','),
          filters:rangeFilters,
          orders:dateColumn?[{column:dateColumn,ascending:false}]:[],
          onBatch:rows=>{for(const row of rows)add(row);}
        });
      }else{
        const result=await selectNeonAllRows(table,{
          columns:indexedColumns.join(','),
          filters:rangeFilters,
          orders:dateColumn?[{column:dateColumn,ascending:false}]:[]
        });
        for(const row of result.rows)add(row);
      }
    });
  }

  return Object.freeze({
    id,table,source,scopeId,idColumn,
    columns:outputColumns,
    searchFields:frozenFields,
    filters:frozenFilters,
    async search(query,{limit=20,offset=0,startDate='',endDate='',and=[],nor=[]}={}){
      const engine=await buildIndex({startDate,endDate});
      return searchTextIndex(engine,query,{limit,offset,and,nor});
    }
  });
}

const authorText=makeProvider({
  id:'author-text',
  table:'silver.lo3rwang_galaxy',
  source:'作者正文',
  scopeId:'lo3rwang',
  idColumn:'galaxy_id',
  columns:['galaxy_id','scope_id','title','source_name','source_id','target_id','ref_id','url','createtime'],
  searchFields:['title','content','source_name'],
  dateColumn:'createtime'
});

const authorMedia=makeProvider({
  id:'author-media',
  table:'silver.lo3rwang_galaxy_media',
  source:'音樂與多媒體',
  scopeId:'lo3rwang',
  idColumn:'media_id',
  columns:['media_id','galaxy_link','source_native_id','media_type','title','url','meta_tags','createtime'],
  searchFields:['title','meta_tags','media_type'],
  dateColumn:'createtime'
});

const authorTimeline=makeProvider({
  id:'author-timeline',
  table:'silver.manage',
  source:'作者脈絡',
  scopeId:'lo3rwang',
  idColumn:'record_id',
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
  idColumn:'record_id',
  columns:['record_id','rune_number','rune_name','group_name','english_name','lots_positive','lots_negative','lots_half_positive','lots_half_negative','myth_story','rune_evolution_history','rune_description'],
  searchFields:['rune_name','group_name','english_name','lots_positive','lots_negative','lots_half_positive','lots_half_negative','myth_story','rune_evolution_history','rune_description'],
  filters:[{column:'record_type',operator:'eq',value:'rune'}]
});

const runeKeywords=makeProvider({
  id:'rune-keywords',
  table:'silver.lrunes',
  source:'符文關鍵詞',
  scopeId:'lrunes',
  idColumn:'record_id',
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
  idColumn:'record_id',
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
  idColumn:'record_id',
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
  idColumn:'record_id',
  columns:['record_id','galaxy_id','scope_id','category','content_type','source_name','source_role','title','meta_tags','created_at','source_ref','source_id','target_id','ref_id','url'],
  searchFields:['title','content','meta_tags','source_name'],
  dateColumn:'created_at',
  filters:[{column:'record_type',operator:'eq',value:'galaxy'}]
});

const runeMedia=makeProvider({
  id:'rune-media',
  table:'silver.lrunes',
  source:'符文多媒體',
  scopeId:'lrunes',
  idColumn:'record_id',
  columns:['record_id','media_id','scope_id','media_link','source_name','source_native_id','media_type','title','url','meta_tags','style_tags','created_at'],
  searchFields:['title','meta_tags','style_tags','source_name'],
  dateColumn:'created_at',
  filters:[{column:'record_type',operator:'eq',value:'galaxy_media'}]
});

const faq=makeProvider({
  id:'faq',
  table:'silver.faq_entries',
  source:'FAQ',
  scopeId:'loc',
  idColumn:'faq_id',
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
