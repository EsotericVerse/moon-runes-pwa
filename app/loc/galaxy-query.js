'use client';

import {DB_QUERY_BATCH_SIZE} from './query-contract.mjs';
import {mediaFacetDaily} from './statistics-facets.mjs';
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
  return selectRowById(current.galaxy,{idColumn:'uid',id,columns:'uid,content,content_blocks'});
}

export async function selectGalaxyIdentity(scope,uid,{includeHidden=false}={}){
  const current=scopeOf(scope);
  const id=String(uid||'').trim();
  if(!id)return null;
  const row=await selectRowById(current.galaxy,{
    idColumn:'uid',
    id,
    columns:'uid,title,source_name,createtime,url,source_id,target_id,media_link,searchable'
  });
  if(!row||(!includeHidden&&row.searchable===false))return null;
  const [contentRow,mediaRows]=await Promise.all([
    selectRowById(current.galaxy,{idColumn:'uid',id,columns:'uid,content,content_blocks'}),
    mediaRowsFor(current,mediaIdsOf(row.media_link))
  ]);
  const mediaById=new Map(mediaRows.map(item=>[String(item.media_id),item]));
  return {...row,scope_id:current.id,__table:current.galaxy,content:contentRow?.content||'',content_blocks:contentRow?.content_blocks||null,links:resolvedLinks(row,mediaById)};
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
    async search(query,{cursor=0,startDate='',endDate='',and=[],nor=[],source='auto'}={}){
      const offset=Math.max(0,Math.floor(Number(cursor)||0));
      const activeTable=table;
      const activeFilters=[...frozenFilters,...dateSearchFilters(dateColumn,startDate,endDate)];
      const orders=dateColumn?[{column:dateColumn,ascending:false},{column:idColumn,ascending:true}]:[{column:idColumn,ascending:true}];

      const countResult=await executePublicRead(activeTable,relation=>{
        let countQuery=relation.select(idColumn,{count:'exact',head:true});
        countQuery=applyFilters(countQuery,activeFilters);
        return applyLiteralTerms(countQuery,frozenFields,query,and,nor);
      },{source});
      const totalCount=Number(countResult.count)||0;
      const dataSource=countResult.__dataSource||source||'auto';
      if(!totalCount||offset>=totalCount)return {rows:[],hasMore:false,nextCursor:null,totalCount,dataSource};

      const dataResult=await executePublicRead(activeTable,relation=>{
        let dataQuery=relation.select(outputColumns.join(','));
        dataQuery=applyFilters(dataQuery,activeFilters);
        dataQuery=applyLiteralTerms(dataQuery,frozenFields,query,and,nor);
        dataQuery=applyOrders(dataQuery,orders);
        return dataQuery.range(offset,offset+pageSize-1);
      },{source:dataSource});
      const rows=(dataResult.data||[]).map(row=>recordFor(row,source,id,scope,activeTable));
      const nextOffset=offset+rows.length;
      const hasMore=nextOffset<totalCount;
      return {rows,hasMore,nextCursor:hasMore?nextOffset:null,totalCount,dataSource};
    }
  });
}

function genericScopeProviders(scope,{mediaOnly=false,includeHiddenText=false}={}){
  const current=scopeOf(scope);
  const text=makeProvider({
    id:current.id+':text',table:current.galaxy,source:current.id+' 文字',scope:current,idColumn:'uid',
    columns:['uid','content_type','title','source_name','source_id','target_id','url','media_link','createtime'],
    searchFields:['title','content','source_name'],dateColumn:'createtime',
    filters:publicContentFilters(includeHiddenText?[]:[{column:'searchable',operator:'eq',value:true}])
  });
  const media=makeProvider({
    id:current.id+':media',table:current.galaxyMedia,source:current.id+' 多媒體',scope:current,idColumn:'media_id',
    columns:['media_id','galaxy_link','source_native_id','media_type','title','url','meta_tags','content_blocks','createtime'],
    searchFields:['title','meta_tags','media_type','url','source_native_id'],dateColumn:'createtime'
  });
  if(mediaOnly)return [media];
  const timeline=makeProvider({
    id:current.id+':timeline',table:current.time,source:current.id+' 時期',scope:current,idColumn:'record_id',
    columns:['record_id','record_type','label','resource_id','note','time_date','anchor_ids','status','date_status','year_value','visibility','style_tags','style_description'],
    searchFields:['label','note','status','style_tags','style_description'],dateColumn:'time_date',
    filters:[{column:'record_type',operator:'in',value:['anchor','period','event']}]
  });
  return [timeline,text];
}

function normalizeSearch(value){
  return String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
}
function styleTagList(value){
  return [...new Set(String(value||'').split(/[,，]/g).map(item=>String(item||'').trim()).filter(Boolean))];
}
// This is a count of distinct searchable/statistics-enabled documents containing
// the keyword in title or body. It is NOT a Rune/Class hit count.
export async function selectStyleKeywordDocumentCount(galaxyTable,keyword){
  const term=String(keyword||'').trim();
  if(!galaxyTable||!term)return 0;
  return selectCount(galaxyTable,{
    idColumn:'uid',
    filters:[
      {column:'searchable',operator:'eq',value:true},
      {column:'statistics_able',operator:'eq',value:true},
      {column:'content',operator:'neq',value:''}
    ],
    orFilter:orExpression(['title','content'],term)
  });
}
export async function selectStyleKeywordCounts(galaxyTable,tags){
  const words=Array.isArray(tags)?tags:styleTagList(tags);
  return Promise.all(words.map(tag=>selectStyleKeywordDocumentCount(galaxyTable,tag)));
}
function styleAnchorDate(row){
  return String(row?.time_date||(Number.isInteger(row?.year_value)?String(row.year_value)+'-01-01':'')).slice(0,10);
}
// The canonical Time column is TEXT. Historical rows with several styles may
// contain clearly titled paragraphs: prefer the matching paragraph when present.
function styleDescriptionForTag(description,tag,tags){
  const text=String(description||'').trim();
  const parts=text.split(/\n\s*\n/).map(part=>part.trim()).filter(Boolean);
  const headings=new Map(tags.map(item=>[normalizeSearch(item),item]));
  const match=parts.find(part=>{
    const pos=part.indexOf('：');
    return pos>0&&headings.has(normalizeSearch(part.slice(0,pos)))&&normalizeSearch(part.slice(0,pos))===normalizeSearch(tag);
  });
  return match?match.slice(match.indexOf('：')+1).trim():text;
}
export async function selectStyleKeywordIntroductions(scopes,query){
  const token=normalizeSearch(query);
  if(!token)return [];
  const scopeList=(Array.isArray(scopes)?scopes:[]).filter(scope=>scope?.id&&scope?.time);
  const grouped=await Promise.all(scopeList.map(async scope=>{
    const current=scopeOf(scope);
    const result=await selectAllRows(current.time,{
      columns:'record_id,record_type,label,resource_id,display_order,time_date,year_value,anchor_ids,style_tags,style_description',
      filters:[{column:'record_type',operator:'in',value:['anchor','period','event']}],
      orders:[{column:'display_order',ascending:true},{column:'record_id',ascending:true}]
    });
    const anchorMap=new Map((result.rows||[])
      .filter(row=>row.record_type==='anchor'&&row.resource_id)
      .map(row=>[String(row.resource_id),row]));
    const styleRows=(result.rows||[]).filter(row=>['period','event'].includes(row.record_type)&&styleTagList(row.style_tags).length>0);
    const allStyles=[...new Map(styleRows.flatMap(row=>styleTagList(row.style_tags).map(tag=>[normalizeSearch(tag),tag]))).values()];
    const matches=styleRows.flatMap(row=>{
      const tags=styleTagList(row.style_tags);
      const matched=tags.find(tag=>normalizeSearch(tag)===token);
      if(!matched||!String(row.style_description||'').trim())return [];
      const ids=Array.isArray(row.anchor_ids)?row.anchor_ids.map(String):[];
      const start=ids[0]==='0'?'':styleAnchorDate(anchorMap.get(ids[0]));
      const end=ids.at(-1)==='0'?'':styleAnchorDate(anchorMap.get(ids.at(-1)));
      return [{row,matched,tags,start,end,description:styleDescriptionForTag(row.style_description,matched,tags)}];
    });
    // Reuse one count promise per keyword within the current Scope/search.
    const countCache=new Map();
    function countOf(tag){
      const key=normalizeSearch(tag);
      if(!countCache.has(key))countCache.set(key,selectStyleKeywordDocumentCount(current.galaxy,tag).catch(()=>null));
      return countCache.get(key);
    }
    return Promise.all(matches.map(async({row,matched,tags,start,end,description})=>{
      const samePeriod=tags.filter(tag=>normalizeSearch(tag)!==token);
      const otherPeriods=allStyles.filter(tag=>
        normalizeSearch(tag)!==token&&!samePeriod.some(item=>normalizeSearch(item)===normalizeSearch(tag)));
      const related=await Promise.all([...samePeriod,...otherPeriods].map(async tag=>({
        name:tag,
        work_count:await countOf(tag),
        same_period:samePeriod.some(item=>normalizeSearch(item)===normalizeSearch(tag))
      })));
      return {
        row:{
          id:'style-keyword:'+current.id+':'+String(row.record_id||row.resource_id||matched),
          scope_id:current.id,
          style_keyword_intro:true,
          title:matched,
          summary:description,
          period_label:String(row.label||'').trim(),
          related_style_tags:related,
          style_anchor_start:start,
          style_anchor_end:end
        },
        source:String(row.label||'').trim()?('風格介紹 · '+String(row.label).trim()):'風格介紹',
        providerId:current.id+':style-keyword'
      };
    }));
  }));
  const seen=new Set();
  return grouped.flat(2).filter(entry=>{
    const key=entry.row.scope_id+'|'+normalizeSearch(entry.row.title)+'|'+entry.row.summary;
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
}

export async function searchGalaxyRows(scopes,query,{
  limit=DEFAULT_LIST_BATCH_SIZE,cursor=null,startDate='',endDate='',and=[],nor=[],mediaOnly=false,hiddenScopeIds=[]
}={}){
  const q=String(query||'').trim();
  if(!q)return {rows:[],failures:[],hasMore:false,nextCursor:null};
  const safeLimit=Math.max(1,Math.min(DEFAULT_LIST_BATCH_SIZE,Math.floor(Number(limit)||DEFAULT_LIST_BATCH_SIZE)));
  const scopeList=(Array.isArray(scopes)?scopes:[]).filter(scope=>scope?.id);
  const hiddenScopes=new Set((Array.isArray(hiddenScopeIds)?hiddenScopeIds:[]).map(value=>String(value||'').trim()).filter(Boolean));
  const providers=scopeList.flatMap(scope=>genericScopeProviders(scope,{mediaOnly,includeHiddenText:hiddenScopes.has(scope.id)}));
  const failures=[];

  let stage=Number.isInteger(cursor?.stage)?cursor.stage:1;
  const sourceOffset=Math.max(0,Math.floor(Number(cursor?.offset)||0));
  const provider=providers[stage-1];
  if(!provider)return {rows:[],failures,hasMore:false,nextCursor:null};
  try{
    const result=await provider.search(q,{cursor:sourceOffset,startDate,endDate,and,nor,limit:safeLimit,source:cursor?.source||'auto'});
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
