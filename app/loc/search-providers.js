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
  idColumn:'uid',
  columns:['uid','title','source_name','source_id','target_id','ref_id','url','media_link','createtime'],
  searchFields:['title','content','source_name'],
  dateColumn:'createtime',
  filters:[{column:'searchable',operator:'eq',value:true}]
});

const authorMedia=makeProvider({
  id:'author-media',
  table:'silver.lo3rwang_galaxy_media',
  source:'音樂與多媒體',
  scopeId:'lo3rwang',
  idColumn:'media_id',
  columns:['media_id','galaxy_link','source_native_id','source_place','media_type','title','url','meta_tags','createtime'],
  searchFields:['title','meta_tags','media_type','url','source_native_id','source_place'],
  dateColumn:'createtime',
  filters:[{column:'galaxy_link',operator:'is',value:null}]
});

const authorMediaAll=makeProvider({
  id:'author-media-all',
  table:'silver.lo3rwang_galaxy_media',
  source:'多媒體',
  scopeId:'lo3rwang',
  idColumn:'media_id',
  columns:['media_id','galaxy_link','source_native_id','source_place','media_type','title','url','meta_tags','createtime'],
  searchFields:['title','meta_tags','media_type','url','source_native_id','source_place'],
  dateColumn:'createtime'
});

const authorTimeline=makeProvider({
  id:'author-timeline',
  table:'silver.lo3rwang_time',
  source:'作者脈絡',
  scopeId:'lo3rwang',
  idColumn:'record_id',
  columns:['record_id','record_type','label','resource_id','note','time_date','anchor_pair','status','date_status','year_value','visibility','include_in_time','projection_level','style_tags'],
  searchFields:['label','note','status','style_tags'],
  dateColumn:'time_date',
  filters:[
    {column:'record_type',operator:'in',value:['anchor','period','event']},
    {column:'include_in_time',operator:'eq',value:true}
  ]
});

const runeCore=makeProvider({
  id:'rune-core',
  table:'silver.runes',
  source:'月之符文',
  scopeId:'lrunes',
  idColumn:'rune_id',
  columns:['rune_id','rune_name','group_name','english_name','rune_description','archetype','char_action','positive_keywords','negative_keywords','extra_rules','extra_notes','positive_meaning','half_positive_meaning','half_reverse_meaning','reverse_meaning'],
  searchFields:['rune_name','group_name','english_name','rune_description','archetype','char_action','positive_keywords','negative_keywords','extra_rules','extra_notes','positive_meaning','half_positive_meaning','half_reverse_meaning','reverse_meaning']
});

const runeTimeline=makeProvider({
  id:'rune-timeline',
  table:'silver.lrunes_time',
  source:'符文時期',
  scopeId:'lrunes',
  idColumn:'record_id',
  columns:['record_id','record_type','label','resource_id','note','time_date','anchor_pair','status','date_status','year_value','visibility','include_in_time','projection_level','style_tags'],
  searchFields:['label','note','status','style_tags'],
  dateColumn:'time_date',
  filters:[
    {column:'record_type',operator:'in',value:['anchor','period','event']},
    {column:'include_in_time',operator:'eq',value:true}
  ]
});

const runeText=makeProvider({
  id:'rune-text',
  table:'silver.lrunes_galaxy',
  source:'符文文字',
  scopeId:'lrunes',
  idColumn:'uid',
  columns:['uid','content_type','source_name','title','createtime','source_id','target_id','ref_id','url','media_link'],
  searchFields:['title','content','source_name'],
  dateColumn:'createtime',
  filters:[{column:'searchable',operator:'eq',value:true}]
});

const runeMedia=makeProvider({
  id:'rune-media',
  table:'silver.lrunes_galaxy_media',
  source:'符文多媒體',
  scopeId:'lrunes',
  idColumn:'media_id',
  columns:['media_id','galaxy_link','source_native_id','source_place','media_type','title','url','meta_tags','createtime'],
  searchFields:['title','meta_tags','media_type','url','source_native_id','source_place'],
  dateColumn:'createtime',
  filters:[{column:'galaxy_link',operator:'is',value:null}]
});

const runeMediaAll=makeProvider({
  id:'rune-media-all',
  table:'silver.lrunes_galaxy_media',
  source:'符文多媒體',
  scopeId:'lrunes',
  idColumn:'media_id',
  columns:['media_id','galaxy_link','source_native_id','source_place','media_type','title','url','meta_tags','createtime'],
  searchFields:['title','meta_tags','media_type','url','source_native_id','source_place'],
  dateColumn:'createtime',
  filters:[]
});

const faq=makeProvider({
  id:'faq',
  table:'silver.faq_entries',
  source:'FAQ',
  scopeId:'loc',
  idColumn:'faq_id',
  columns:['faq_id','category','intent','question','answer','status'],
  searchFields:['category','intent','question','answer','status']
});

const SCOPE_PROVIDERS=Object.freeze({
  lo3rwang:Object.freeze([authorTimeline,authorText,authorMedia]),
  lrunes:Object.freeze([runeCore,runeTimeline,runeText,runeMedia])
});

export const SEARCH_PROVIDERS=Object.freeze({
  lo3rwang:Object.freeze([authorText,authorMedia]),
  '月之符文':Object.freeze([runeCore,runeTimeline,runeText,runeMedia]),
  '治理':Object.freeze([faq])
});

const MEDIA_SCOPE_PROVIDERS=Object.freeze({
  lo3rwang:Object.freeze([authorMediaAll]),
  lrunes:Object.freeze([runeMediaAll])
});

export function getSearchProviders(collectionId,scopeIds=[]){
  if(collectionId==='all'){
    const providers=[];
    for(const id of scopeIds)providers.push(...(SCOPE_PROVIDERS[String(id)]||[]));
    providers.push(faq);
    return [...new Map(providers.map(provider=>[provider.id,provider])).values()];
  }
  return SEARCH_PROVIDERS[collectionId]||[];
}

export function getMediaSearchProviders(collectionId,scopeIds=[]){
  if(collectionId==='all'){
    const providers=[];
    for(const id of scopeIds)providers.push(...(MEDIA_SCOPE_PROVIDERS[String(id)]||[]));
    return [...new Map(providers.map(provider=>[provider.id,provider])).values()];
  }
  if(collectionId==='lo3rwang')return [authorMediaAll];
  if(collectionId==='月之符文')return [runeMediaAll];
  return [];
}
