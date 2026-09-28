'use client';

import {createTextIndex,searchTextIndex} from './text-engine.mjs';
import {publicContentFilters} from './content-policy';
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

function makeProvider({id,table,source,scopeId,idColumn,columns,searchFields,filters=[],dateColumn=''}) {
  const outputColumns=Object.freeze(unique(columns));
  const indexedColumns=Object.freeze(unique([...columns,...searchFields]));
  const frozenFields=Object.freeze(unique(searchFields));
  const frozenFilters=Object.freeze(filters.map(item=>Object.freeze({...item})));

  function recordFor(row){
    const metadata={
      ...pick(row,outputColumns),
      ...(row?.content&&!row?.title?{excerpt:String(row.content).slice(0,220)}:{}),
      scope_id:row?.scope_id||scopeId
    };
    return {row:metadata,source,providerId:id};
  }

  return Object.freeze({
    id,table,source,scopeId,idColumn,
    columns:outputColumns,
    searchFields:frozenFields,
    filters:frozenFilters,
    async search(query,{limit=10,cursor=0,startDate='',endDate='',and=[],nor=[]}={}){
      const safeLimit=Math.max(1,Math.floor(Number(limit)||10));
      let sourceOffset=Math.max(0,Math.floor(Number(cursor)||0));
      let scanSize=128;
      const maxScanSize=1024;
      const rangeFilters=[...frozenFilters,...dateFilters(dateColumn,startDate,endDate)];
      const orders=dateColumn
        ?[{column:dateColumn,ascending:false},{column:idColumn,ascending:true}]
        :[{column:idColumn,ascending:true}];
      const matched=[];

      while(matched.length<safeLimit){
        const page=await selectNeonRows(table,{
          columns:indexedColumns.join(','),
          filters:rangeFilters,
          orders,
          limit:scanSize,
          offset:sourceOffset
        });
        const sourceRows=page.rows||[];
        if(!sourceRows.length)return {rows:matched,hasMore:false,nextCursor:null};

        const engine=createTextIndex();
        for(const row of sourceRows){
          const key=String(row?.[idColumn]??'').trim();
          if(!key)continue;
          engine.add(key,searchableText(row,frozenFields),recordFor(row));
        }
        const found=searchTextIndex(engine,query,{
          limit:Math.max(1,sourceRows.length),
          offset:0,
          and,
          nor
        });
        const matchedIds=new Set(found.ids.map(String));

        let consumed=sourceRows.length;
        for(let index=0;index<sourceRows.length;index+=1){
          const row=sourceRows[index];
          const key=String(row?.[idColumn]??'').trim();
          if(key&&matchedIds.has(key)){
            const record=engine.records.get(key);
            if(record)matched.push(record);
            if(matched.length>=safeLimit){
              consumed=index+1;
              break;
            }
          }
        }

        sourceOffset+=consumed;
        const sourceEnded=sourceRows.length<scanSize&&consumed>=sourceRows.length;
        if(matched.length>=safeLimit){
          const hasMore=!sourceEnded&&(consumed<sourceRows.length||sourceRows.length===scanSize);
          return {rows:matched.slice(0,safeLimit),hasMore,nextCursor:hasMore?sourceOffset:null};
        }
        if(sourceEnded)return {rows:matched,hasMore:false,nextCursor:null};
        scanSize=Math.min(maxScanSize,scanSize*2);
      }
      return {rows:matched.slice(0,safeLimit),hasMore:true,nextCursor:sourceOffset};
    }
  });
}

const authorText=makeProvider({
  id:'author-text',
  table:'silver.lo3rwang_galaxy',
  source:'作者正文',
  scopeId:'lo3rwang',
  idColumn:'uid',
  columns:['uid','content_type','title','source_name','source_id','target_id','url','media_link','createtime'],
  searchFields:['title','content','source_name'],
  dateColumn:'createtime',
  filters:publicContentFilters([{column:'searchable',operator:'eq',value:true}])
});

const authorMedia=makeProvider({
  id:'author-media',
  table:'silver.lo3rwang_galaxy_media',
  source:'音樂與多媒體',
  scopeId:'lo3rwang',
  idColumn:'media_id',
  columns:['media_id','galaxy_link','source_native_id','media_type','title','url','meta_tags','createtime'],
  searchFields:['title','meta_tags','media_type','url','source_native_id'],
  dateColumn:'createtime',
  filters:[]
});

const authorMediaAll=makeProvider({
  id:'author-media-all',
  table:'silver.lo3rwang_galaxy_media',
  source:'多媒體',
  scopeId:'lo3rwang',
  idColumn:'media_id',
  columns:['media_id','galaxy_link','source_native_id','media_type','title','url','meta_tags','createtime'],
  searchFields:['title','meta_tags','media_type','url','source_native_id'],
  dateColumn:'createtime'
});

const authorTimeline=makeProvider({
  id:'author-timeline',
  table:'silver.lo3rwang_time',
  source:'作者脈絡',
  scopeId:'lo3rwang',
  idColumn:'record_id',
  columns:['record_id','record_type','label','resource_id','note','time_date','anchor_pair','status','date_status','year_value','visibility','include_in_time'],
  searchFields:['label','note','status'],
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
  columns:['record_id','record_type','label','resource_id','note','time_date','anchor_pair','status','date_status','year_value','visibility','include_in_time'],
  searchFields:['label','note','status'],
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
  columns:['uid','content_type','source_name','title','createtime','source_id','target_id','url','media_link'],
  searchFields:['title','content','source_name'],
  dateColumn:'createtime',
  filters:publicContentFilters([{column:'searchable',operator:'eq',value:true}])
});

const runeMedia=makeProvider({
  id:'rune-media',
  table:'silver.lrunes_galaxy_media',
  source:'符文多媒體',
  scopeId:'lrunes',
  idColumn:'media_id',
  columns:['media_id','galaxy_link','source_native_id','media_type','title','url','meta_tags','createtime'],
  searchFields:['title','meta_tags','media_type','url','source_native_id'],
  dateColumn:'createtime',
  filters:[]
});

const runeMediaAll=makeProvider({
  id:'rune-media-all',
  table:'silver.lrunes_galaxy_media',
  source:'符文多媒體',
  scopeId:'lrunes',
  idColumn:'media_id',
  columns:['media_id','galaxy_link','source_native_id','media_type','title','url','meta_tags','createtime'],
  searchFields:['title','meta_tags','media_type','url','source_native_id'],
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
