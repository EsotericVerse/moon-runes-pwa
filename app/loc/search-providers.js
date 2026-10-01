'use client';

import {publicContentFilters} from './content-policy';
import {neonPublicClient} from './neon-client';
import {DEFAULT_LIST_BATCH_SIZE,RUNE_LIST_BATCH_SIZE} from './list-loading-contract.mjs';
import {resolveScopeTables} from './scope-table-mapping';

function relation(activeTable){
  const [schema,name]=String(activeTable).split('.');
  return neonPublicClient.schema(schema).from(name);
}
function applyFilters(query,filters=[]){
  for(const filter of filters){
    query=filter.operator==='in'
      ?query.in(filter.column,filter.value)
      :query[filter.operator](filter.column,filter.value);
  }
  return query;
}
function applyOrders(query,orders=[]){
  for(const order of orders){
    query=query.order(order.column,{ascending:order.ascending??true,nullsFirst:order.nullsFirst});
  }
  return query;
}
function unique(values=[]){
  return [...new Set(values.map(value=>String(value||'').trim()).filter(Boolean))];
}
function literalPattern(value){
  return '%'+String(value||'').trim().replace(/\\/g,'\\\\').replace(/%/g,'\\%').replace(/_/g,'\\_')+'%';
}
function orExpression(fields,term){
  const pattern=literalPattern(term).replace(/"/g,'\\"');
  return fields.map(field=>field+'.ilike."'+pattern+'"').join(',');
}
function applyLiteralTerms(query,fields,queryText,and=[],nor=[]){
  const base=String(queryText||'').trim();
  if(base)query=query.or(orExpression(fields,base));
  for(const term of unique(and))query=query.or(orExpression(fields,term));
  for(const term of unique(nor)){
    const pattern=literalPattern(term);
    for(const field of fields)query=query.not(field,'ilike',pattern);
  }
  return query;
}
function dateFilters(dateColumn,startDate,endDate){
  const filters=[];
  if(dateColumn&&startDate)filters.push({column:dateColumn,operator:'gte',value:startDate});
  if(dateColumn&&endDate)filters.push({column:dateColumn,operator:'lte',value:endDate});
  return filters;
}
function recordFor(row,source,providerId,scopeId,table){
  return {row:{...row,scope_id:row?.scope_id||scopeId,__table:table},source,providerId};
}
async function resolvedTable(table){return typeof table==='function'?await table():table;}
const galaxyTable=scopeId=>async()=>(await resolveScopeTables(scopeId)).galaxy;
const mediaTable=scopeId=>async()=>(await resolveScopeTables(scopeId)).galaxyMedia;
const timeTable=scopeId=>async()=>(await resolveScopeTables(scopeId)).time;

function makeProvider({id,table,source,scopeId,idColumn,columns,searchFields,filters=[],dateColumn='',batchSize=DEFAULT_LIST_BATCH_SIZE}) {
  const outputColumns=Object.freeze(unique(columns));
  const frozenFields=Object.freeze(unique(searchFields));
  const frozenFilters=Object.freeze(filters.map(item=>Object.freeze({...item})));
  const pageSize=Math.max(1,Math.floor(Number(batchSize)||DEFAULT_LIST_BATCH_SIZE));

  return Object.freeze({
    id,table,source,scopeId,idColumn,
    columns:outputColumns,
    searchFields:frozenFields,
    filters:frozenFilters,
    async search(query,{cursor=0,startDate='',endDate='',and=[],nor=[]}={}){
      const offset=Math.max(0,Math.floor(Number(cursor)||0));
      const activeTable=await resolvedTable(table);
      const filters=[...frozenFilters,...dateFilters(dateColumn,startDate,endDate)];
      const orders=dateColumn
        ?[{column:dateColumn,ascending:false},{column:idColumn,ascending:true}]
        :[{column:idColumn,ascending:true}];

      let countQuery=relation(activeTable).select(idColumn,{count:'exact',head:true});
      countQuery=applyFilters(countQuery,filters);
      countQuery=applyLiteralTerms(countQuery,frozenFields,query,and,nor);
      const {error:countError,count}=await countQuery;
      if(countError)throw new Error(countError.message||('Neon COUNT '+activeTable+' failed'));
      const totalCount=Number(count)||0;
      if(!totalCount||offset>=totalCount)return {rows:[],hasMore:false,nextCursor:null,totalCount};

      let dataQuery=relation(activeTable).select(outputColumns.join(','));
      dataQuery=applyFilters(dataQuery,filters);
      dataQuery=applyLiteralTerms(dataQuery,frozenFields,query,and,nor);
      dataQuery=applyOrders(dataQuery,orders);
      dataQuery=dataQuery.range(offset,offset+pageSize-1);
      const {data,error}=await dataQuery;
      if(error)throw new Error(error.message||('Neon SELECT '+activeTable+' failed'));
      const rows=(data||[]).map(row=>recordFor(row,source,id,scopeId,activeTable));
      const nextOffset=offset+rows.length;
      const hasMore=nextOffset<totalCount;
      return {rows,hasMore,nextCursor:hasMore?nextOffset:null,totalCount};
    }
  });
}

const runeCore=makeProvider({
  id:'rune-core',
  table:'silver.runes',
  source:'月之符文',
  scopeId:'lrunes',
  idColumn:'rune_id',
  columns:['rune_id','rune_name','group_name','english_name','rune_description','archetype','char_action','positive_keywords','negative_keywords','extra_rules','extra_notes'],
  searchFields:['rune_name','group_name','english_name','rune_description','archetype','char_action','positive_keywords','negative_keywords','extra_rules','extra_notes'],
  batchSize:RUNE_LIST_BATCH_SIZE
});

function genericScopeProviders(scopeId,{mediaOnly=false}={}){
  const id=String(scopeId||'').trim();
  if(!id)return [];
  const text=makeProvider({
    id:id+':text',
    table:galaxyTable(id),
    source:id+' 文字',
    scopeId:id,
    idColumn:'uid',
    columns:['uid','content_type','title','source_name','source_id','target_id','url','media_link','createtime'],
    searchFields:['title','content','source_name'],
    dateColumn:'createtime',
    filters:publicContentFilters([{column:'searchable',operator:'eq',value:true}])
  });
  const media=makeProvider({
    id:id+':media',
    table:mediaTable(id),
    source:id+' 多媒體',
    scopeId:id,
    idColumn:'media_id',
    columns:['media_id','galaxy_link','source_native_id','media_type','title','url','meta_tags','createtime'],
    searchFields:['title','meta_tags','media_type','url','source_native_id'],
    dateColumn:'createtime'
  });
  if(mediaOnly)return [media];
  const timeline=makeProvider({
    id:id+':timeline',
    table:timeTable(id),
    source:id+' 時期',
    scopeId:id,
    idColumn:'record_id',
    columns:['record_id','record_type','label','resource_id','note','time_date','anchor_pair','status','date_status','year_value','visibility','include_in_time'],
    searchFields:['label','note','status'],
    dateColumn:'time_date',
    filters:[
      {column:'record_type',operator:'in',value:['anchor','period','event']},
      {column:'include_in_time',operator:'eq',value:true}
    ]
  });
  return [...(id==='lrunes'?[runeCore]:[]),timeline,text,media];
}

export function getSearchProviders(scopeIds=[]){
  const providers=scopeIds.flatMap(id=>genericScopeProviders(id));
  return [...new Map(providers.map(provider=>[provider.id,provider])).values()];
}

export function getMediaSearchProviders(scopeIds=[]){
  return scopeIds.flatMap(id=>genericScopeProviders(id,{mediaOnly:true}));
}
