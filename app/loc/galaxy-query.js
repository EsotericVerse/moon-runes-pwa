'use client';

import {DB_QUERY_BATCH_SIZE} from './query-contract.mjs';
import {DEFAULT_LIST_BATCH_SIZE} from './list-loading-contract.mjs';
import {publicContentFilters} from './content-policy';
import {applyFilters,applyOrders,dbPublicRelation,selectAllRows,selectRows} from './db-query.mjs';

function unique(values=[]){
  return [...new Set(values.map(value=>String(value||'').trim()).filter(Boolean))];
}
function scopeOf(scope){
  if(!scope?.id||!scope?.galaxy||!scope?.galaxyMedia||!scope?.time)throw new Error('Scope data 未解析');
  return scope;
}
function timeFilters(column,startDate,endDate){
  const filters=[];
  if(startDate)filters.push({column,operator:'gte',value:String(startDate).slice(0,10)+'T00:00:00+08:00'});
  if(endDate)filters.push({column,operator:'lte',value:String(endDate).slice(0,10)+'T23:59:59.999+08:00'});
  return filters;
}
async function selectRowById(table,{idColumn,id,columns}={}){
  const page=await selectRows(table,{columns,filters:[{column:idColumn,operator:'eq',value:String(id)}],limit:1});
  return page.rows[0]||null;
}

export async function selectSourceCatalog(scope,{startDate='',endDate='',limit=20}={}){
  const current=scopeOf(scope);
  const filters=publicContentFilters([
    ...timeFilters('createtime',startDate,endDate),
    {column:'statistics_able',operator:'eq',value:true},
    {column:'source_name',operator:'neq',value:''}
  ]);
  const safeLimit=Math.max(1,Math.min(DB_QUERY_BATCH_SIZE,Math.floor(Number(limit)||20)));
  const {rows}=await selectRows(current.galaxy,{
    columns:'source_name,item_count:count()',
    filters,
    orders:[{column:'source_name',ascending:true}],
    limit:safeLimit,
    offset:0
  });
  const normalized=rows.map(row=>({
    scope_id:current.id,
    source_name:String(row.source_name||'').trim(),
    item_count:Number(row.item_count)||0
  })).filter(row=>row.source_name)
    .sort((a,b)=>b.item_count-a.item_count||a.source_name.localeCompare(b.source_name));
  return {rows:normalized,totalCount:normalized.length};
}

export async function selectSourceDaily(scope,{startDate='',endDate=''}={}){
  const current=scopeOf(scope);
  const filters=publicContentFilters([
    ...timeFilters('createtime',startDate,endDate),
    {column:'statistics_able',operator:'eq',value:true},
    {column:'source_name',operator:'neq',value:''}
  ]);
  const rows=(await selectAllRows(current.galaxy,{
    columns:'source_name,day:createtime::date,item_count:count()',
    filters
  })).rows;
  return rows.map(row=>({
    scope_id:current.id,
    source_name:String(row.source_name||'').trim(),
    day:String(row.day||''),
    item_count:Number(row.item_count)||0
  })).sort((a,b)=>a.day.localeCompare(b.day)||a.source_name.localeCompare(b.source_name));
}

export async function selectDailyCategoryCounts(table,categoryColumn,{startDate='',endDate='',filters=[],includeEmpty=false,includeUndated=false}={}){
  const resolved=[
    ...filters,
    ...timeFilters('createtime',startDate,endDate),
    ...(!includeEmpty?[{column:categoryColumn,operator:'neq',value:''}]:[])
  ];
  const rows=(await selectAllRows(table,{
    columns:`${categoryColumn},day:createtime::date,item_count:count()`,
    filters:resolved
  })).rows;
  return rows.map(row=>({
    category:String(row?.[categoryColumn]||'').trim(),
    day:String(row.day||''),
    item_count:Number(row.item_count)||0
  })).filter(row=>(includeUndated||row.day)&&(includeEmpty||row.category))
    .sort((a,b)=>a.day.localeCompare(b.day)||a.category.localeCompare(b.category));
}

export async function selectCategoryCounts(table,categoryColumn,{startDate='',endDate='',filters=[],limit=20}={}){
  const resolved=[
    ...filters,
    ...timeFilters('createtime',startDate,endDate),
    {column:categoryColumn,operator:'neq',value:''}
  ];
  const safeLimit=Math.max(1,Math.min(DB_QUERY_BATCH_SIZE,Math.floor(Number(limit)||20)));
  const {rows}=await selectRows(table,{
    columns:`${categoryColumn},item_count:count()`,
    filters:resolved,
    orders:[{column:categoryColumn,ascending:true}],
    limit:safeLimit,
    offset:0
  });
  return rows.map(row=>({
    term:String(row?.[categoryColumn]||'').trim(),
    item_count:Number(row.item_count)||0
  })).filter(row=>row.term)
    .sort((a,b)=>b.item_count-a.item_count||a.term.localeCompare(b.term));
}

function mediaIdsOf(value){
  return [...new Set((Array.isArray(value)?value:[]).map(item=>String(item||'').trim()).filter(Boolean))];
}
async function mediaRowsFor(scope,mediaIds=[]){
  const current=scopeOf(scope);
  const ids=[...new Set(mediaIds.map(String).filter(Boolean))];
  if(!ids.length)return [];
  return (await selectRows(current.galaxyMedia,{
    columns:'media_id,title,url,media_type',
    filters:[{column:'media_id',operator:'in',value:ids}],
    limit:ids.length
  })).rows;
}
function resolvedLinks(row,mediaById){
  const links=[];
  if(row?.url&&/^https?:\/\//i.test(String(row.url)))links.push({id:'url:'+row.uid,href:row.url,label:'外部連結'});
  for(const id of mediaIdsOf(row?.media_link)){
    const media=mediaById.get(id);
    if(media?.url&&/^https?:\/\//i.test(String(media.url))){
      links.push({id:'media:'+id,href:media.url,label:media.title||media.media_type||'媒體連結'});
    }
  }
  return links;
}

export async function resolveGalaxyExternalLinks(scope,rows=[]){
  const current=scopeOf(scope);
  const source=Array.isArray(rows)?rows:[];
  if(!source.length)return [];
  const ids=[...new Set(source.flatMap(row=>mediaIdsOf(row?.media_link)))];
  const mediaRows=await mediaRowsFor(current,ids);
  const mediaById=new Map(mediaRows.map(item=>[String(item.media_id),item]));
  return source.map(row=>({...row,resolved_links:resolvedLinks(row,mediaById)}));
}

export async function selectGalaxyContent(scope,uid){
  const current=scopeOf(scope);
  const id=String(uid||'').trim();
  if(!id)return null;
  return selectRowById(current.galaxy,{idColumn:'uid',id,columns:'uid,content'});
}

export async function selectGalaxyIdentity(scope,uid){
  const current=scopeOf(scope);
  const id=String(uid||'').trim();
  if(!id)return null;
  const row=await selectRowById(current.galaxy,{
    idColumn:'uid',
    id,
    columns:'uid,title,source_name,createtime,url,source_id,target_id,media_link'
  });
  if(!row)return null;
  const [contentRow,mediaRows]=await Promise.all([
    selectRowById(current.galaxy,{idColumn:'uid',id,columns:'uid,content'}),
    mediaRowsFor(current,mediaIdsOf(row.media_link))
  ]);
  const mediaById=new Map(mediaRows.map(item=>[String(item.media_id),item]));
  return {...row,scope_id:current.id,__table:current.galaxy,content:contentRow?.content||'',links:resolvedLinks(row,mediaById)};
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
function dateSearchFilters(dateColumn,startDate,endDate){
  const filters=[];
  if(dateColumn&&startDate)filters.push({column:dateColumn,operator:'gte',value:startDate});
  if(dateColumn&&endDate)filters.push({column:dateColumn,operator:'lte',value:endDate});
  return filters;
}
function recordFor(row,source,providerId,scope,table){
  return {row:{...row,scope_id:row?.scope_id||scope.id,__table:table,__galaxy_media_table:scope.galaxyMedia},source,providerId};
}

function makeProvider({id,table,source,scope,idColumn,columns,searchFields,filters=[],dateColumn='',batchSize=DEFAULT_LIST_BATCH_SIZE}){
  const outputColumns=Object.freeze(unique(columns));
  const frozenFields=Object.freeze(unique(searchFields));
  const frozenFilters=Object.freeze(filters.map(item=>Object.freeze({...item})));
  const pageSize=Math.max(1,Math.floor(Number(batchSize)||DEFAULT_LIST_BATCH_SIZE));
  return Object.freeze({
    id,table,source,scope,idColumn,columns:outputColumns,searchFields:frozenFields,filters:frozenFilters,
    async search(query,{cursor=0,startDate='',endDate='',and=[],nor=[]}={}){
      const offset=Math.max(0,Math.floor(Number(cursor)||0));
      const activeTable=table;
      const activeFilters=[...frozenFilters,...dateSearchFilters(dateColumn,startDate,endDate)];
      const orders=dateColumn?[{column:dateColumn,ascending:false},{column:idColumn,ascending:true}]:[{column:idColumn,ascending:true}];

      let countQuery=dbPublicRelation(activeTable).select(idColumn,{count:'exact',head:true});
      countQuery=applyFilters(countQuery,activeFilters);
      countQuery=applyLiteralTerms(countQuery,frozenFields,query,and,nor);
      const {error:countError,count}=await countQuery;
      if(countError)throw new Error(countError.message||('DB COUNT '+activeTable+' failed'));
      const totalCount=Number(count)||0;
      if(!totalCount||offset>=totalCount)return {rows:[],hasMore:false,nextCursor:null,totalCount};

      let dataQuery=dbPublicRelation(activeTable).select(outputColumns.join(','));
      dataQuery=applyFilters(dataQuery,activeFilters);
      dataQuery=applyLiteralTerms(dataQuery,frozenFields,query,and,nor);
      dataQuery=applyOrders(dataQuery,orders);
      dataQuery=dataQuery.range(offset,offset+pageSize-1);
      const {data,error}=await dataQuery;
      if(error)throw new Error(error.message||('DB SELECT '+activeTable+' failed'));
      const rows=(data||[]).map(row=>recordFor(row,source,id,scope,activeTable));
      const nextOffset=offset+rows.length;
      const hasMore=nextOffset<totalCount;
      return {rows,hasMore,nextCursor:hasMore?nextOffset:null,totalCount};
    }
  });
}

function genericScopeProviders(scope,{mediaOnly=false}={}){
  const current=scopeOf(scope);
  const text=makeProvider({
    id:current.id+':text',table:current.galaxy,source:current.id+' 文字',scope:current,idColumn:'uid',
    columns:['uid','content_type','title','source_name','source_id','target_id','url','media_link','createtime'],
    searchFields:['title','content','source_name'],dateColumn:'createtime',
    filters:publicContentFilters([{column:'searchable',operator:'eq',value:true}])
  });
  const media=makeProvider({
    id:current.id+':media',table:current.galaxyMedia,source:current.id+' 多媒體',scope:current,idColumn:'media_id',
    columns:['media_id','galaxy_link','source_native_id','media_type','title','url','meta_tags','createtime'],
    searchFields:['title','meta_tags','media_type','url','source_native_id'],dateColumn:'createtime'
  });
  if(mediaOnly)return [media];
  const timeline=makeProvider({
    id:current.id+':timeline',table:current.time,source:current.id+' 時期',scope:current,idColumn:'record_id',
    columns:['record_id','record_type','label','resource_id','note','time_date','anchor_pair','status','date_status','year_value','visibility','style_tags'],
    searchFields:['label','note','status','style_tags'],dateColumn:'time_date',
    filters:[{column:'record_type',operator:'in',value:['anchor','period','event']}]
  });
  return [timeline,text];
}

function normalizeSearch(value){
  return String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
}
function scopeCards(query,scopes=[]){
  const q=normalizeSearch(query);
  if(!q)return [];
  return scopes.flatMap(scope=>{
    const id=String(scope?.id||'').trim();
    if(!id||!normalizeSearch(id).includes(q))return [];
    return [{row:{scope_card:true,scope_id:id,title:id,search_terms:id,summary:''},source:'Scope',providerId:'scope-card'}];
  });
}

export async function searchGalaxyRows(scopes,query,{
  limit=DEFAULT_LIST_BATCH_SIZE,cursor=null,startDate='',endDate='',and=[],nor=[],mediaOnly=false
}={}){
  const q=String(query||'').trim();
  if(!q)return {rows:[],failures:[],hasMore:false,nextCursor:null};
  const safeLimit=Math.max(1,Math.min(DEFAULT_LIST_BATCH_SIZE,Math.floor(Number(limit)||DEFAULT_LIST_BATCH_SIZE)));
  const scopeList=(Array.isArray(scopes)?scopes:[]).filter(scope=>scope?.id);
  const providers=scopeList.flatMap(scope=>genericScopeProviders(scope,{mediaOnly}));
  const cards=mediaOnly?[]:scopeCards(q,scopeList);
  const failures=[];

  let stage=Number.isInteger(cursor?.stage)?cursor.stage:(cards.length?0:1);
  const sourceOffset=Math.max(0,Math.floor(Number(cursor?.offset)||0));
  if(stage===0){
    return {rows:cards,failures,hasMore:providers.length>0,nextCursor:providers.length?{stage:1,offset:0}:null};
  }
  const provider=providers[stage-1];
  if(!provider)return {rows:[],failures,hasMore:false,nextCursor:null};
  try{
    const result=await provider.search(q,{cursor:sourceOffset,startDate,endDate,and,nor,limit:safeLimit});
    if(result.hasMore)return {rows:result.rows||[],failures,hasMore:true,nextCursor:{stage,offset:result.nextCursor}};
    const hasMore=stage<providers.length;
    return {rows:result.rows||[],failures,hasMore,nextCursor:hasMore?{stage:stage+1,offset:0}:null};
  }catch(error){
    failures.push(new Error(`${provider.id}: ${error?.message||'search failed'}`));
    const hasMore=stage<providers.length;
    if(!hasMore)throw new AggregateError(failures,'資料搜尋 Provider 無法查詢');
    return {rows:[],failures,hasMore:true,nextCursor:{stage:stage+1,offset:0}};
  }
}

const SOURCE_BUCKET_ORDER=['Facebook','Threads','IG','Others'];
function dateOnly(value){return String(value||'').slice(0,10);}
function sourceBucket(value=''){
  const source=String(value||'').trim().toLowerCase();
  if(source.includes('facebook')||source==='fb')return 'Facebook';
  if(source.includes('threads'))return 'Threads';
  if(source.includes('instagram')||source.includes('reels')||source==='ig')return 'IG';
  return 'Others';
}
async function scopeSourceTrendRows(scope,{startDate='',endDate=''}={}){
  const current=scopeOf(scope);
  const [textDaily,mediaDaily]=await Promise.all([
    selectSourceDaily(current,{startDate,endDate}),
    selectDailyCategoryCounts(current.galaxyMedia,'media_type',{startDate,endDate})
  ]);
  const combined=new Map();
  for(const row of textDaily){
    const day=dateOnly(row.day); if(!day)continue;
    const bucket=sourceBucket(row.source_name),key=day+'|'+bucket;
    combined.set(key,(combined.get(key)||0)+(Number(row.item_count)||0));
  }
  for(const row of mediaDaily){
    const day=dateOnly(row.day); if(!day)continue;
    const bucket=sourceBucket(row.category),key=day+'|'+bucket;
    combined.set(key,(combined.get(key)||0)+(Number(row.item_count)||0));
  }
  return [...combined.entries()].map(([key,item_count])=>{
    const split=key.indexOf('|');
    return {day:key.slice(0,split),source:key.slice(split+1),item_count:Number(item_count)||0};
  }).sort((a,b)=>a.day.localeCompare(b.day)||SOURCE_BUCKET_ORDER.indexOf(a.source)-SOURCE_BUCKET_ORDER.indexOf(b.source));
}

export async function selectSourceTrendRows(scopes,{startDate='',endDate=''}={}){
  const range={startDate:dateOnly(startDate),endDate:dateOnly(endDate)};
  const rows=(await Promise.all((Array.isArray(scopes)?scopes:[]).map(scope=>scopeSourceTrendRows(scope,range)))).flat();
  const merged=new Map();
  for(const row of rows){
    const key=row.day+'|'+row.source;
    merged.set(key,(merged.get(key)||0)+(Number(row.item_count)||0));
  }
  return [...merged.entries()].map(([key,item_count])=>{
    const split=key.indexOf('|');
    return {day:key.slice(0,split),source:key.slice(split+1),item_count:Number(item_count)||0};
  }).sort((a,b)=>a.day.localeCompare(b.day)||SOURCE_BUCKET_ORDER.indexOf(a.source)-SOURCE_BUCKET_ORDER.indexOf(b.source));
}
