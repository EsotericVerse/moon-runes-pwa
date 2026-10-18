'use client';

import {DB_QUERY_BATCH_SIZE} from './query-contract.mjs';
import {mediaFacetDaily,mediaStyleTags} from './statistics-facets.mjs';
import {aggregateOwnScopeStatistics} from './statistics-source-intersection.mjs';
import {DEFAULT_LIST_BATCH_SIZE} from './list-loading-contract.mjs';
import {publicContentFilters} from './content-policy';
import {applyFilters,applyOrders,executePublicRead,selectAllRows,selectCount,selectRows} from './db-query.mjs';

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
function countBy(rows,keyOf,{includeEmpty=false}={}){
  const counts=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const key=keyOf(row);
    if(key===null||key===undefined)continue;
    if(!includeEmpty&&!key)continue;
    counts.set(key,(counts.get(key)||0)+1);
  }
  return counts;
}
function categoryCountRows(rows,column,{limit=Infinity,includeEmpty=false}={}){
  return [...countBy(rows,row=>String(row?.[column]||'').trim(),{includeEmpty}).entries()]
    .map(([term,item_count])=>({term,item_count}))
    .sort((a,b)=>b.item_count-a.item_count||a.term.localeCompare(b.term))
    .slice(0,limit);
}
function dailyCountRows(rows,column,{includeEmpty=false,includeUndated=false}={}){
  const counts=countBy(rows,row=>{
    const category=String(row?.[column]||'').trim();
    const day=String(row?.createtime||'').slice(0,10);
    if((!includeEmpty&&!category)||(!includeUndated&&!day))return null;
    return day+'\u0000'+category;
  },{includeEmpty:true});
  return [...counts.entries()].map(([key,item_count])=>{
    const split=key.indexOf('\u0000');
    return {day:key.slice(0,split),category:key.slice(split+1),item_count};
  }).sort((a,b)=>a.day.localeCompare(b.day)||a.category.localeCompare(b.category));
}

export async function selectSourceCatalog(scope,{startDate='',endDate='',limit=20}={}){
  const current=scopeOf(scope);
  const filters=publicContentFilters([
    ...timeFilters('createtime',startDate,endDate),
    {column:'statistics_able',operator:'eq',value:true}
  ]);
  const safeLimit=Math.max(1,Math.min(DB_QUERY_BATCH_SIZE,Math.floor(Number(limit)||20)));
  const rows=(await selectAllRows(current.galaxy,{
    columns:'source_name',
    filters
  })).rows;
  const normalized=categoryCountRows(rows,'source_name',{limit:safeLimit,includeEmpty:true}).map(row=>({
    scope_id:current.id,
    source_name:row.term,
    item_count:row.item_count
  }));
  return {rows:normalized,totalCount:normalized.length};
}

export async function selectSourceDaily(scope,{startDate='',endDate=''}={}){
  const current=scopeOf(scope);
  const filters=publicContentFilters([
    ...timeFilters('createtime',startDate,endDate),
    {column:'statistics_able',operator:'eq',value:true}
  ]);
  const rows=(await selectAllRows(current.galaxy,{
    columns:'source_name,createtime',
    filters
  })).rows;
  return dailyCountRows(rows,'source_name',{includeEmpty:true}).map(row=>({
    scope_id:current.id,
    source_name:row.category,
    day:row.day,
    item_count:row.item_count
  }));
}

export async function selectDailyCategoryCounts(table,categoryColumn,{startDate='',endDate='',filters=[],includeEmpty=false,includeUndated=false}={}){
  const resolved=[
    ...filters,
    ...timeFilters('createtime',startDate,endDate),
    ...(!includeEmpty?[{column:categoryColumn,operator:'neq',value:''}]:[])
  ];
  const rows=(await selectAllRows(table,{
    columns:`${categoryColumn},createtime`,
    filters:resolved
  })).rows;
  return dailyCountRows(rows,categoryColumn,{includeEmpty,includeUndated});
}

export async function selectCategoryCounts(table,categoryColumn,{startDate='',endDate='',filters=[],limit=20}={}){
  const resolved=[
    ...filters,
    ...timeFilters('createtime',startDate,endDate),
    {column:categoryColumn,operator:'neq',value:''}
  ];
  const safeLimit=Math.max(1,Math.min(DB_QUERY_BATCH_SIZE,Math.floor(Number(limit)||20)));
  const rows=(await selectAllRows(table,{
    columns:categoryColumn,
    filters:resolved
  })).rows;
  return categoryCountRows(rows,categoryColumn,{limit:safeLimit});
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

export async function selectGalaxyIdentity(scope,uid,{includeHidden=false}={}){
  const current=scopeOf(scope);
  const id=String(uid||'').trim();
  if(!id)return null;
  const row=await selectRowById(current.galaxy,{
    idColumn:'uid',
    id,
    columns:'uid,title,source_name,createtime,url,source_id,target_id,ref_id,media_link,searchable'
  });
  if(!row||(!includeHidden&&row.searchable===false))return null;
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
  // Treat whitespace separated words as independent required terms. Each
  // term may occur in any searchable column; chaining PostgREST OR groups
  // makes the groups intersect instead of requiring one exact whole phrase.
  const terms=unique([...String(queryText||'').trim().split(/[\s\u3000]+/g),...and]);
  for(const term of terms)query=query.or(orExpression(fields,term));
  for(const term of unique(nor)){
    const pattern=literalPattern(term);
    for(const field of fields)query=query.not(field,'ilike',pattern);
  }
  return query;
}
function dateSearchFilters(dateColumn,startDate,endDate){
  const filters=[];
  if(dateColumn&&startDate)filters.push({column:dateColumn,operator:'gte',value:dateColumn==='createtime'?startDate+'T00:00:00+08:00':startDate});
  if(dateColumn&&endDate)filters.push({column:dateColumn,operator:'lte',value:dateColumn==='createtime'?endDate+'T23:59:59.999+08:00':endDate});
  return filters;
}
function recordFor(row,source,providerId,scope,table){
  return {row:{...row,scope_id:row?.scope_id||scope.id,__table:table,__galaxy_media_table:scope.galaxyMedia},source,providerId};
}

function makeProvider({id,table,source,scope,idColumn,columns,searchFields,filters=[],dateColumn='',exactColumn='',batchSize=DEFAULT_LIST_BATCH_SIZE,sourceClause=''}){
  const outputColumns=Object.freeze(unique(columns));
  const frozenFields=Object.freeze(unique(searchFields));
  const frozenFilters=Object.freeze(filters.map(item=>Object.freeze({...item})));
  const pageSize=Math.max(1,Math.floor(Number(batchSize)||DEFAULT_LIST_BATCH_SIZE));
  return Object.freeze({
    id,table,source,scope,idColumn,columns:outputColumns,searchFields:frozenFields,filters:frozenFilters,
    async search(query,{cursor=0,startDate='',endDate='',and=[],nor=[],source='auto',browse=false}={}){
      const offset=Math.max(0,Math.floor(Number(cursor)||0));
      const activeTable=table;
      const activeFilters=[...frozenFilters,...dateSearchFilters(dateColumn,startDate,endDate)];
      const orders=[
        ...(dateColumn?[{column:dateColumn,ascending:true}]:[]),
        ...(outputColumns.includes('title')?[{column:'title',ascending:true}]:[]),
        ...(idColumn?[{column:idColumn,ascending:true}]:[])
      ];

      // The exact COUNT(*) query can time out on ILIKE against article content.
      // Fetch one extra row instead; ordinary searching never needs a total count.
      const dataResult=await executePublicRead(activeTable,relation=>{
        let dataQuery=relation.select(outputColumns.join(','));
        dataQuery=applyFilters(dataQuery,activeFilters);
        if(sourceClause)dataQuery=dataQuery.or(sourceClause);
        if(!browse&&exactColumn){
          const exact=literalPattern(query).slice(1,-1);
          dataQuery=dataQuery.ilike(exactColumn,exact);
        }else if(!browse)dataQuery=applyLiteralTerms(dataQuery,frozenFields,query,and,nor);
        dataQuery=applyOrders(dataQuery,orders);
        return dataQuery.range(offset,offset+pageSize);
      },{source});
      const dataSource=dataResult.__dataSource||source||'auto';
      const found=dataResult.data||[];
      const hasMore=found.length>pageSize;
      const rows=found.slice(0,pageSize).map(row=>recordFor(row,source,id,scope,activeTable));
      const nextOffset=offset+rows.length;
      return {rows,hasMore,nextCursor:hasMore?nextOffset:null,totalCount:null,dataSource};
    }
  });
}

function genericScopeProviders(scope,{mediaOnly=false,includeHiddenText=false,contentType='',sourceFilter=''}={}){
  // These filters are applied by the existing Supabase provider, not to a
  // truncated page of client-side search results.
  const textKindFilters=[
    ...(sourceFilter?[{column:'source_name',operator:'ilike',value:sourceFilter}]:[]),
    ...(contentType==='lyrics_work'?[{column:'source_name',operator:'ilike',value:'suno'}]:[]),
    ...(contentType==='text_work'?[{column:'source_name',operator:'neq',value:'suno'}]:[])
  ];
  const mediaDomain={suno:'suno.com',threads:'threads.com',instagram:'instagram.com',facebook:'facebook.com',vocus:'vocus.cc',x:'x.com'};
  const sourceClause=sourceFilter&&mediaDomain[sourceFilter]
    ?'media_type.ilike.*'+sourceFilter+'*,url.ilike.*'+mediaDomain[sourceFilter]+'*'
    :'';

  const current=scopeOf(scope);
  const textFilters=publicContentFilters([...(includeHiddenText?[]:[{column:'searchable',operator:'eq',value:true}]),...textKindFilters]);
  const textColumns=['uid','title','content','createtime','source_native_id','source_place','searchable','UpdateTime','url','source_id','target_id','ref_id','source_name','media_link','statistics_able','class_id','group_lists'];
  const titleExact=makeProvider({
    id:current.id+':text-title-exact',table:current.galaxy,source:current.id+' 文字',scope:current,idColumn:'uid',
    columns:textColumns,searchFields:['title'],dateColumn:'createtime',filters:textFilters,exactColumn:'title'
  });
  const title=makeProvider({
    id:current.id+':text-title',table:current.galaxy,source:current.id+' 文字',scope:current,idColumn:'uid',
    columns:textColumns,
    searchFields:['title'],dateColumn:'createtime',filters:textFilters
  });
  const contentExact=makeProvider({
    id:current.id+':text-content-exact',table:current.galaxy,source:current.id+' 文字',scope:current,idColumn:'uid',
    columns:textColumns,searchFields:['content'],dateColumn:'createtime',filters:textFilters,exactColumn:'content'
  });
  const content=makeProvider({
    id:current.id+':text-content',table:current.galaxy,source:current.id+' 文字',scope:current,idColumn:'uid',
    columns:textColumns,
    searchFields:['content','source_name'],dateColumn:'createtime',filters:textFilters
  });
  const media=makeProvider({
    id:current.id+':media',table:current.galaxyMedia,source:current.id+' 多媒體',scope:current,idColumn:'media_id',
    columns:['media_id','galaxy_link','source_native_id','media_type','title','url','meta_tags','createtime'],
    searchFields:['title','meta_tags','media_type','url','source_native_id'],dateColumn:'createtime',sourceClause
  });
  if(mediaOnly||contentType==='multimedia')return [media];
  const timeline=makeProvider({
    id:current.id+':timeline',table:current.time,source:current.id+' 時期',scope:current,idColumn:'record_id',
    columns:['record_id','record_type','label','resource_id','note','time_date','anchor_ids','status','date_status','year_value','visibility','style_description'],
    searchFields:['label','note','status','style_description'],dateColumn:'time_date',
    filters:[{column:'record_type',operator:'in',value:['anchor','period','event']}]
  });
  // A single ordinary search includes multimedia: no duplicate search mode.
  if(contentType==='timeline')return sourceFilter?[]:[timeline];
  if(contentType==='lyrics_work'||contentType==='text_work')return [titleExact,title,contentExact,content];
  return [titleExact,title,contentExact,content,media,timeline];
}

function normalizeSearch(value){
  return String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
}
export async function selectStyleKeywordMatches(scopes,query){
  const key=normalizeSearch(query);
  if(!key)return [];
  const found=await Promise.all((Array.isArray(scopes)?scopes:[]).filter(scope=>scope?.id&&scope?.time).map(async scope=>{
    const current=scopeOf(scope);
    const {rows=[]}=await selectRows(current.time,{
      columns:'record_id,record_type,label,style_description,status',
      filters:[
        {column:'record_type',operator:'eq',value:'style_comment'},
        {column:'label',operator:'eq',value:String(query||'').normalize('NFKC').trim()}
      ],
      limit:DEFAULT_LIST_BATCH_SIZE
    });
    return rows
      .filter(row=>row.status!=='needs_anchor'&&String(row.label||'').trim()&&normalizeSearch(row.label)===key)
      .map(row=>({
        row:{
          id:'style-keyword:'+current.id+':'+row.record_id,
          scope_id:current.id,
          style_keyword_tag:true,
          title:String(row.label).trim(),
          style_description:String(row.style_description||'')
        },
        source:'風格標籤',
        providerId:current.id+':style-keyword'
      }));
  }));
  return found.flat();
}

export async function searchGalaxyRows(scopes,query,{
  limit=DEFAULT_LIST_BATCH_SIZE,cursor=null,startDate='',endDate='',and=[],nor=[],mediaOnly=false,hiddenScopeIds=[],contentType='',sourceFilter='',browse=false
}={}){
  const q=String(query||'').trim();
  if(!q&&!browse)return {rows:[],failures:[],hasMore:false,nextCursor:null};
  const safeLimit=Math.max(1,Math.min(DEFAULT_LIST_BATCH_SIZE,Math.floor(Number(limit)||DEFAULT_LIST_BATCH_SIZE)));
  const scopeList=(Array.isArray(scopes)?scopes:[]).filter(scope=>scope?.id);
  const hiddenScopes=new Set((Array.isArray(hiddenScopeIds)?hiddenScopeIds:[]).map(value=>String(value||'').trim()).filter(Boolean));
  const scopeProviders=scopeList.map(scope=>genericScopeProviders(scope,{mediaOnly,includeHiddenText:hiddenScopes.has(scope.id),contentType,sourceFilter}));
  // Every Scope's title hits are paged before any body matches.
  const providers=mediaOnly||contentType==='multimedia'||contentType==='timeline'
    ?scopeProviders.flat()
    :Array.from({length:6},(_,index)=>scopeProviders.map(group=>group[index]).filter(Boolean)).flat();
  const failures=[];

  let stage=Number.isInteger(cursor?.stage)?cursor.stage:1;
  const sourceOffset=Math.max(0,Math.floor(Number(cursor?.offset)||0));
  const provider=providers[stage-1];
  if(!provider)return {rows:[],failures,hasMore:false,nextCursor:null};
  try{
    const result=await provider.search(q,{cursor:sourceOffset,startDate,endDate,and,nor,limit:safeLimit,source:cursor?.source||'auto',browse});
    if(result.hasMore)return {rows:result.rows||[],failures,hasMore:true,nextCursor:{stage,offset:result.nextCursor,source:result.dataSource||cursor?.source||'auto'}};
    const hasMore=stage<providers.length;
    return {rows:result.rows||[],failures,hasMore,nextCursor:hasMore?{stage:stage+1,offset:0,source:'auto'}:null};
  }catch(error){
    failures.push(new Error(`${provider.id}: ${error?.message||'search failed'}`));
    const hasMore=stage<providers.length;
    if(!hasMore)throw new AggregateError(failures,'資料搜尋 Provider 無法查詢');
    return {rows:[],failures,hasMore:true,nextCursor:{stage:stage+1,offset:0,source:'auto'}};
  }
}


/**
 * Media facet aggregation reads only the selected Scope's narrow metadata columns,
 * in bounded DB pages. It never fetches media binary or Galaxy body content.
 * For large installations, a DB-side GROUP BY/RPC can replace this adapter
 * without changing the facet response contract.
 */

/**
 * Suggested search terms are taken from currently searchable Galaxy and Media
 * rows instead of a month-old handwritten example list. Purely read-only.
 */
export async function selectSearchReferenceSuggestions(scopes,{contentType='',sourceFilter='',limit=6}={}){
  const targets=(Array.isArray(scopes)?scopes:[]).filter(scope=>scope?.galaxy&&scope?.galaxyMedia).slice(0,2);
  const onlyMedia=contentType==='multimedia';
  const onlyTimeline=contentType==='timeline';
  if(!targets.length)return [];
  if(onlyTimeline){
    const responses=await Promise.all(targets.map(scope=>selectRows(scope.time,{
      columns:'record_id,record_type,label,time_date',
      filters:[{column:'record_type',operator:'in',value:['anchor','period','event']}],
      orders:[{column:'time_date',ascending:false}],limit:16
    }).then(result=>result.rows||[]).catch(()=>[])));
    const seen=new Set(),found=[];
    for(const row of responses.flat().sort((a,b)=>String(b.time_date||'').localeCompare(String(a.time_date||'')))){
      const query=String(row.label||'').trim();
      const key=query.normalize('NFKC').toLowerCase();
      if(!query||seen.has(key))continue;
      seen.add(key);
      found.push({query,description:row.record_type||'時期',date:String(row.time_date||'').slice(0,10)});
      if(found.length>=limit)break;
    }
    return found;
  }
  const textFilters=[
    {column:'searchable',operator:'eq',value:true},
    ...(sourceFilter?[{column:'source_name',operator:'ilike',value:sourceFilter}]:[]),
    ...(contentType==='lyrics_work'?[{column:'source_name',operator:'ilike',value:'suno'}]:[]),
    ...(contentType==='text_work'?[{column:'source_name',operator:'neq',value:'suno'}]:[])
  ];
  const mediaDomain={suno:'suno.com',threads:'threads.com',instagram:'instagram.com',facebook:'facebook.com',vocus:'vocus.cc',x:'x.com'};
  const tasks=targets.flatMap(scope=>[
    ...(onlyMedia?[]:[selectRows(scope.galaxy,{
      columns:'uid,title,createtime,source_name',filters:textFilters,
      orders:[{column:'createtime',ascending:false}],limit:16
    }).then(result=>(result.rows||[]).map(row=>({...row,kind:'text'}))).catch(()=>[])]),
    ...(contentType==='lyrics_work'||contentType==='text_work'?[]:[selectRows(scope.galaxyMedia,{
      columns:'media_id,title,createtime,media_type,url,meta_tags',
      orders:[{column:'createtime',ascending:false}],limit:16
    }).then(result=>(result.rows||[]).filter(row=>{
      if(!sourceFilter)return true;
      const src=String(row.media_type||'').toLowerCase();
      const url=String(row.url||'').toLowerCase();
      return src.includes(sourceFilter)||url.includes(mediaDomain[sourceFilter]||sourceFilter);
    }).map(row=>({...row,kind:'media'}))).catch(()=>[])])
  ]);
  const rows=(await Promise.all(tasks)).flat().sort((a,b)=>
    String(b.createtime||'').localeCompare(String(a.createtime||'')));
  const seen=new Set(),result=[];
  for(const row of rows){
    const title=String(row.title||'').trim();
    if(!title||title.length>70||/｜Suno Style|[|]Suno Style/iu.test(title))continue;
    const key=title.normalize('NFKC').toLowerCase();
    if(seen.has(key))continue;
    seen.add(key);
    result.push({query:title,description:row.kind==='media'
      ?(row.media_type||'多媒體'):(row.source_name||'文字作品'),date:String(row.createtime||'').slice(0,10)});
    if(result.length>=limit)break;
  }
  return result;
}

export async function selectMediaStatisticsFacetRows(scope,dimension,{startDate='',endDate=''}={}){
  const current=scopeOf(scope);
  if(!['media_type','media_platform','media_style'].includes(dimension)){
    throw new Error('Unknown media statistics dimension');
  }
  const filters=timeFilters('createtime',startDate,endDate);
  const columns='media_id,media_type,url,source_native_id,source_place,meta_tags,createtime';
  const orders=[{column:'media_id',ascending:true}];
  const aggregates=new Map();
  let offset=0,total=null,source='auto';
  while(total===null||offset<total){
    const page=await selectRows(current.galaxyMedia,{
      columns,filters,orders,limit:DB_QUERY_BATCH_SIZE,offset,
      count:offset===0?'exact':null,source
    });
    if(offset===0)total=Number.isFinite(Number(page.count))?Number(page.count):page.rows.length;
    source=page.dataSource||source;
    for(const row of mediaFacetDaily(page.rows,dimension)){
      const key=row.day+'\u0000'+row.category.normalize('NFKC').toLocaleLowerCase();
      const existing=aggregates.get(key);
      if(existing)existing.item_count+=row.item_count;
      else aggregates.set(key,{...row});
    }
    if(!page.rows.length)break;
    offset+=page.rows.length;
  }
  return [...aggregates.values()].sort((a,b)=>
    a.day.localeCompare(b.day)||a.category.localeCompare(b.category)
  );
}

// Cross-tag comparisons must retain each media item's own metadata.
// Daily facet aggregates cannot reconstruct which tags belonged to the same item.
export async function selectMediaCrossTagRows(scope,{startDate='',endDate=''}={}){
  const current=scopeOf(scope);
  const filters=timeFilters('createtime',startDate,endDate);
  const orders=[{column:'media_id',ascending:true}];
  const rows=[];
  let offset=0,total=null,source='auto';
  while(total===null||offset<total){
    const page=await selectRows(current.galaxyMedia,{
      columns:'media_id,meta_tags,createtime',
      filters,orders,limit:DB_QUERY_BATCH_SIZE,offset,
      count:offset===0?'exact':null,source
    });
    if(offset===0)total=Number.isFinite(Number(page.count))?Number(page.count):page.rows.length;
    source=page.dataSource||source;
    for(const row of page.rows)if(String(row.meta_tags||'').trim())rows.push(row);
    if(!page.rows.length)break;
    offset+=page.rows.length;
  }
  return rows;
}


export async function selectMediaCrossPairWorks(scope,pair,{
  startDate='',endDate='',offset=0,limit=10
}={}){
  const current=scopeOf(scope);
  if(!pair?.leftLabel||!pair?.rightLabel)return {rows:[],nextOffset:0,hasMore:false};
  const safeLimit=Math.max(1,Math.min(50,Math.floor(Number(limit)||10)));
  const batchSize=Math.max(20,safeLimit*2);
  const escapeLike=value=>String(value).replace(/[\\%_]/g,'\\$&');
  const filters=[
    ...timeFilters('createtime',startDate,endDate),
    {column:'meta_tags',operator:'ilike',value:'%'+escapeLike(pair.leftLabel)+'%'},
    {column:'meta_tags',operator:'ilike',value:'%'+escapeLike(pair.rightLabel)+'%'}
  ];
  const left=String(pair.left||'').normalize('NFKC').toLocaleLowerCase();
  const right=String(pair.right||'').normalize('NFKC').toLocaleLowerCase();
  const rows=[];
  let cursor=Math.max(0,Math.floor(Number(offset)||0));
  let source='auto';
  while(true){
    const page=await selectRows(current.galaxyMedia,{
      columns:'media_id,title,url,meta_tags,createtime',
      filters,orders:[{column:'media_id',ascending:true}],
      limit:batchSize,offset:cursor,source
    });
    source=page.dataSource||source;
    if(!page.rows.length)return {rows,nextOffset:cursor,hasMore:false};
    for(const row of page.rows){
      const rowOffset=cursor++;
      const tags=new Set(mediaStyleTags(row.meta_tags).map(tag=>tag.normalize('NFKC').toLocaleLowerCase()));
      if(!tags.has(left)||!tags.has(right))continue;
      rows.push({id:String(row.media_id),title:String(row.title||''),url:String(row.url||''),day:mediaDay(row.createtime)});
      if(rows.length>safeLimit){
        return {rows:rows.slice(0,safeLimit),nextOffset:rowOffset,hasMore:true};
      }
    }
    if(page.rows.length<batchSize)return {rows,nextOffset:cursor,hasMore:false};
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

async function scopeDensityRows(scope,{startDate='',endDate=''}={}){
  const current=scopeOf(scope);
  const [textDaily,mediaDaily]=await Promise.all([
    selectSourceDaily(current,{startDate,endDate}),
    selectDailyCategoryCounts(current.galaxyMedia,'media_type',{startDate,endDate})
  ]);
  const daily=new Map();
  for(const row of [...textDaily,...mediaDaily]){
    const day=dateOnly(row.day);
    if(!day)continue;
    daily.set(day,(daily.get(day)||0)+(Number(row.item_count)||0));
  }
  return [...daily.entries()]
    .map(([day,item_count])=>({scope_id:current.id,day,item_count}))
    .sort((a,b)=>a.day.localeCompare(b.day));
}

export async function selectScopeDensityRows(scopes,{startDate='',endDate=''}={}){
  const range={startDate:dateOnly(startDate),endDate:dateOnly(endDate)};
  return (await Promise.all((Array.isArray(scopes)?scopes:[]).map(scope=>scopeDensityRows(scope,range))))
    .flat()
    .sort((a,b)=>a.day.localeCompare(b.day)||a.scope_id.localeCompare(b.scope_id));
}

// Single-row ordered probes: determine the first *actual* statistic item
// without loading the full corpus or inventing a historical year ceiling.
export async function selectFirstScopeStatisticsDate(scope){
  const current=scopeOf(scope);
  const [text,media]=await Promise.all([
    selectRows(current.galaxy,{
      columns:'createtime',
      filters:publicContentFilters([{column:'statistics_able',operator:'eq',value:true}]),
      orders:[{column:'createtime',ascending:true,nullsFirst:false}],
      limit:1
    }),
    selectRows(current.galaxyMedia,{
      columns:'createtime',
      orders:[{column:'createtime',ascending:true,nullsFirst:false}],
      limit:1
    })
  ]);
  const dates=[...(text.rows||[]),...(media.rows||[])].map(row=>String(row.createtime||'').slice(0,10))
    .filter(day=>/^\d{4}-\d{2}-\d{2}$/.test(day)).sort();
  return dates[0]||'';
}

// Separate source and media breakdowns. These are independently
// chosen within the current Scope; no cross-Scope read or merged corpus.
export async function selectScopeSourceBreakdownRows(scope,{startDate='',endDate=''}={}){
  const current=scopeOf(scope);
  const [texts,media]=await Promise.all([
    selectAllRows(current.galaxy,{
      columns:'source_name,createtime',
      filters:publicContentFilters([
        ...timeFilters('createtime',startDate,endDate),
        {column:'statistics_able',operator:'eq',value:true}
      ])
    }),
    selectAllRows(current.galaxyMedia,{
      columns:'media_type,createtime',
      filters:timeFilters('createtime',startDate,endDate)
    })
  ]);
  return aggregateOwnScopeStatistics(texts.rows,media.rows);
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
