'use client';

import {z} from 'zod';
import {neonAuthClient,neonPublicClient,resetNeonPublicToken} from './neon-client';
import {
  UI_PAGE_SIZE,
  assertSafeSelect,assertHeavyBatchSelect,assertCatalogSelect,
  safePageSize,safeRange,safeReturning
} from './query-policy';
import {
  chunkRowsByPayload,estimatePayloadBytes,initialBatchSize,mapIoIterable,
  nextAdaptiveBatchSize,reportNeonIoError,runNeonIo
} from './io-controller';
import {clearRuntimeTextIndexes} from './text-engine.mjs';

const FixedCanonicalTableSchema=z.enum([
  'api.user_records','api.user_settings',
  'silver.manage',
  'silver.runes','silver.runes_group','silver.runes_etc',
  'silver.faq_entries',
  'silver.lo3rwang_source_stats','silver.lo3rwang_source_daily'
]);
const ScopeMainTableSchema=z.string().regex(/^silver\.[a-z][a-z0-9]*$/);
const ScopeDataTableSchema=z.string().regex(/^silver\.[a-z][a-z0-9]*_(?:style|galaxy|galaxy_media|daily|time)$/);
const TableSchema=z.union([FixedCanonicalTableSchema,ScopeMainTableSchema,ScopeDataTableSchema]);
const WritableFixedTableSchema=z.enum([
  'api.user_records','api.user_settings',
  'silver.manage'
]);
const WritableScopeTableSchema=z.string().regex(/^silver\.[a-z][a-z0-9]*(?:_(?:style|galaxy|galaxy_media|time))?$/);
const WritableTableSchema=z.union([WritableFixedTableSchema,WritableScopeTableSchema]);
const RowSchema=z.record(z.string(),z.unknown());
function isGalaxyTable(table){return /^silver\.[a-z][a-z0-9]*_galaxy$/.test(String(table||''));}
function isMediaTable(table){return /^silver\.[a-z][a-z0-9]*_galaxy_media$/.test(String(table||''));}
function isScopeMainTable(table){
  const value=String(table||'');
  return /^silver\.[a-z][a-z0-9]*$/.test(value)
    && !['silver.manage','silver.runes','silver.runes_group','silver.runes_etc','silver.faq_entries'].includes(value);
}
function invalidateTextIndexes(table){
  if(String(table||'')==='silver.manage'||isGalaxyTable(table)||isMediaTable(table))clearRuntimeTextIndexes();
}
function isMediaRecord(table,row){
  return isMediaTable(table);
}
function assertMediaMetaTagsOnCreate(table,rows){
  for(const row of rows||[]){
    if(!isMediaRecord(table,row))continue;
    if(!String(row?.meta_tags??'').trim()){
      throw new NeonRepositoryError('Media records require meta_tags supplied by the data source or user; LOC does not auto-classify media.',{
        table:String(table),code:'MEDIA_META_TAGS_REQUIRED'
      });
    }
  }
}
function assertMediaMetaTagsOnUpdate(table,patch){
  if(isMediaTable(table)&&Object.prototype.hasOwnProperty.call(patch,'meta_tags')&&!String(patch.meta_tags??'').trim()){
    throw new NeonRepositoryError('Media meta_tags cannot be cleared; LOC preserves supplied classification and does not replace it automatically.',{
      table:String(table),code:'MEDIA_META_TAGS_REQUIRED'
    });
  }
}
const FilterSchema=z.object({
  column:z.string().regex(/^[a-z][a-z0-9_]*$/),
  operator:z.enum(['eq','neq','gt','gte','lt','lte','like','ilike','is','in']),
  value:z.unknown()
});
const OrderSchema=z.object({
  column:z.string().regex(/^[a-z][a-z0-9_]*$/),
  ascending:z.boolean().optional(),
  nullsFirst:z.boolean().optional()
});

export class NeonRepositoryError extends Error{
  constructor(message,{table='',code='NEON_QUERY_FAILED',cause}={}){
    super(message,{cause});
    this.name='NeonRepositoryError';
    this.code=code;
    this.table=table;
  }
}

function authenticatedClient(table){
  if(!neonAuthClient)throw new NeonRepositoryError('Production Neon Auth is not configured',{
    table:String(table),code:'NEON_AUTH_NOT_CONFIGURED'
  });
  return neonAuthClient;
}

function writableRelation(table){
  const parsed=WritableTableSchema.safeParse(table);
  if(!parsed.success)throw new NeonRepositoryError('Canonical content tables are read-only; write a scope/resource link instead of copying content',{table:String(table),code:'NEON_CONTENT_WRITE_BLOCKED'});
  const [schema,name]=parsed.data.split('.');
  return authenticatedClient(parsed.data).schema(schema).from(name);
}

function relation(table,authenticated=false){
  const parsed=TableSchema.safeParse(table);
  if(!parsed.success)throw new NeonRepositoryError('Neon table is not in the shared repository allowlist',{table:String(table),code:'NEON_TABLE_NOT_ALLOWED'});
  const [schema,name]=parsed.data.split('.');
  const client=authenticated||parsed.data.startsWith('api.user_')?authenticatedClient(parsed.data):neonPublicClient;
  return client.schema(schema).from(name);
}

function applyFilters(query,filters=[]){
  for(const raw of filters){
    const filter=FilterSchema.parse(raw);
    if(filter.operator==='in'){
      if(!Array.isArray(filter.value))throw new TypeError('Neon in filter requires an array');
      query=query.in(filter.column,filter.value);
    }else query=query[filter.operator](filter.column,filter.value);
  }
  return query;
}

function readKeysFor(table){
  if(isGalaxyTable(table))return ['uid'];
  if(isMediaTable(table))return ['media_id'];
  if(/_daily$/.test(String(table||'')))return ['record_id'];
  if(/_time$/.test(String(table||'')))return ['record_id'];
  if(isScopeMainTable(table))return ['id'];
  if(table==='silver.runes')return ['rune_id'];
  if(table==='silver.runes_group')return ['group_id'];
  if(table==='silver.runes_etc')return ['rune_id','dir','type'];
  if(table==='silver.manage')return ['id'];
  return [];
}

function parseRows(rows,table){
  const parsed=z.array(RowSchema).safeParse(rows??[]);
  if(!parsed.success)throw new NeonRepositoryError('Neon returned an invalid row shape',{table,code:'NEON_INVALID_RESPONSE',cause:parsed.error});
  return parsed.data;
}

function throwQueryError(error,table,operation){
  if(!error)return;
  reportNeonIoError(error);
  throw new NeonRepositoryError(`Neon ${operation} ${table}: ${error.message||'query failed'}`,{
    table,code:error.code||'NEON_QUERY_FAILED',cause:error
  });
}

async function executeSelectOnce(table,{
  columns='*',filters=[],orFilter='',orders=[],limit=UI_PAGE_SIZE,offset=0,range=null,count=null,authenticated=false
}={},allowHeavyBatch=false){
  if(['silver.runes','silver.runes_group','silver.runes_etc'].includes(table)&&(!columns||String(columns).trim()==='*'))throw new NeonRepositoryError(`${table} requires explicit columns`,{table,code:'RUNE_COLUMNS_REQUIRED'});
  if(!allowHeavyBatch)assertSafeSelect({table,columns,filters,limit,range});
  let query=relation(table,authenticated).select(columns,count?{count}:undefined);
  query=applyFilters(query,filters);
  if(orFilter){
    const expression=z.string().min(1).max(12000).parse(orFilter);
    query=query.or(expression);
  }
  const stableOrders=[...orders];
  for(const column of readKeysFor(table)){
    if(!stableOrders.some(order=>order.column===column))stableOrders.push({column,ascending:true});
  }
  for(const order of stableOrders){
    const item=OrderSchema.parse(order);
    query=query.order(item.column,{ascending:item.ascending??true,nullsFirst:item.nullsFirst});
  }
  if(Array.isArray(range)&&range.length===2){
    const [start,end]=safeRange(range);
    query=query.range(start,end);
  }else if(Number.isFinite(limit)){
    const size=safePageSize(limit);
    const start=Math.max(0,Math.floor(Number(offset)||0));
    query=size?query.range(start,start+size-1):query.limit(0);
  }
  const result=await runNeonIo(()=>query);
  // PostgREST reports an exhausted offset as 416, not always an empty page.
  if(result.status===416&&result.error?.code==='PGRST103')return {rows:[],count:result.count??null};
  if(result.error)result.error.status=result.status;
  throwQueryError(result.error,table,'SELECT');
  return {rows:parseRows(result.data,table),count:result.count??null};
}

async function executeSelect(table,options={},allowHeavyBatch=false){
  let size=safePageSize(options.limit??UI_PAGE_SIZE);
  let authRetried=false;
  for(let attempt=0;;attempt++){
    try{return await executeSelectOnce(table,{...options,limit:size},allowHeavyBatch);}
    catch(error){
      const cause=error.cause||error;
      const message=String(cause.message||'');
      const oversized=cause.status===413||cause.code==='54000'||cause.code==='53200'||cause.code==='57014'||/response.*(too large|size.*limit)|payload too large|statement timeout/i.test(message);
      const transient=[502,503,504].includes(cause.status)||/failed to fetch|fetch failed|network error/i.test(message);
      const authFailure=[401,403].includes(cause.status)||/jwk not found|jwt|authentication|authorization|bearer token/i.test(message);
      const publicRead=!options.authenticated&&!String(table||'').startsWith('api.user_');
      if(authFailure&&publicRead&&!authRetried){
        authRetried=true;
        resetNeonPublicToken();
        continue;
      }
      if(oversized&&size>1){size=Math.max(1,Math.floor(size/2));continue;}
      if(transient&&attempt<3){reportNeonIoError(cause);continue;}
      throw error;
    }
  }
}

export async function selectNeonRows(table,options={}){
  const {range,...rest}=options;
  if(range!==undefined&&range!==null){
    if(!Array.isArray(range)||range.length!==2||!range.every(Number.isSafeInteger)||range[0]<0||range[1]<range[0])throw new TypeError('SELECT range must contain finite nonnegative start/end offsets');
    return selectNeonWindow(table,{...rest,offset:range[0],limit:range[1]-range[0]+1});
  }
  return selectNeonWindow(table,rest);
}

export async function selectNeonWindow(table,{
  columns='*',filters=[],orFilter='',orders=[],
  limit=UI_PAGE_SIZE,offset=0,count=null,authenticated=false
}={}){
  if(!Number.isSafeInteger(limit)||limit<0||!Number.isSafeInteger(offset)||offset<0)throw new TypeError('SELECT limit and offset must be finite nonnegative integers');
  const requested=limit;
  const start=offset;
  if(requested===0)return executeSelect(table,{columns,filters,orFilter,orders,limit:0,offset:start,count,authenticated});
  assertSafeSelect({table,columns,filters,limit:requested});
  const rows=[];
  let cursor=start;
  let batchSize=Math.min(requested,initialBatchSize('metadata'));
  let resultCount=null;
  while(rows.length<requested){
    const size=Math.max(1,Math.min(batchSize,requested-rows.length));
    const started=globalThis.performance?.now?.()??Date.now();
    const page=await executeSelect(table,{
      columns,filters,orFilter,orders,limit:size,offset:cursor,count:resultCount===null?count:null,authenticated
    },false);
    const elapsed=(globalThis.performance?.now?.()??Date.now())-started;
    if(resultCount===null)resultCount=page.count??null;
    if(!page.rows.length)break;
    rows.push(...page.rows);
    cursor+=page.rows.length;
    if(resultCount!==null&&cursor>=resultCount)break;
    batchSize=nextAdaptiveBatchSize({
      current:page.rows.length,
      payloadBytes:estimatePayloadBytes(page.rows),
      requestMs:elapsed,
      profile:'metadata'
    });
  }
  return {rows:rows.slice(0,requested),count:resultCount};
}

export async function selectNeonAllRows(table,{
  columns,filters=[],orFilter='',orders=[],authenticated=false
}={}){
  assertSafeSelect({table,columns,filters,limit:1});
  const rows=[];
  let cursor=0;
  let batchSize=initialBatchSize('metadata');
  let total=null;
  while(total===null||rows.length<total){
    const started=globalThis.performance?.now?.()??Date.now();
    const page=await executeSelect(table,{
      columns,filters,orFilter,orders,limit:batchSize,offset:cursor,count:total===null?'exact':null,authenticated
    },false);
    const elapsed=(globalThis.performance?.now?.()??Date.now())-started;
    if(total===null&&page.count!==null)total=Math.max(0,Number(page.count)||0);
    if(!page.rows.length)break;
    rows.push(...page.rows);
    cursor+=page.rows.length;
    batchSize=nextAdaptiveBatchSize({
      current:page.rows.length,
      payloadBytes:estimatePayloadBytes(page.rows),
      requestMs:elapsed,
      profile:'metadata'
    });
  }
  return {rows,count:total??rows.length};
}

export async function processNeonHeavyRows(table,{
  columns,filters=[],orFilter='',orders=[],onRow,onBatch
}={}){
  assertHeavyBatchSelect({table,columns});
  if(typeof onRow!=='function'&&typeof onBatch!=='function')throw new TypeError('Adaptive heavy processing requires onRow or onBatch');
  let batchSize=initialBatchSize('heavy');
  let offset=0;
  let processed=0;
  let stopped=false;
  while(!stopped){
    const requestStarted=globalThis.performance?.now?.()??Date.now();
    const page=await executeSelect(table,{columns,filters,orFilter,orders,limit:batchSize,offset},true);
    const requestMs=(globalThis.performance?.now?.()??Date.now())-requestStarted;
    if(!page.rows.length)break;
    const bytes=estimatePayloadBytes(page.rows);
    const consumeStarted=globalThis.performance?.now?.()??Date.now();
    if(typeof onBatch==='function'){
      const outcome=await onBatch(page.rows);
      processed+=page.rows.length;
      if(outcome&&typeof outcome==='object'&&outcome.stop===true)stopped=true;
    }else{
      const iterable=mapIoIterable(page.rows,async row=>onRow(row));
      for await(const outcome of iterable){
        processed+=1;
        if(outcome&&typeof outcome==='object'&&outcome.stop===true){
          stopped=true;
          break;
        }
      }
    }
    const consumerMs=(globalThis.performance?.now?.()??Date.now())-consumeStarted;
    offset+=page.rows.length;
    if(stopped)break;
    batchSize=nextAdaptiveBatchSize({
      current:page.rows.length,payloadBytes:bytes,requestMs,consumerMs,profile:'heavy'
    });
  }
  return {processed,stopped,nextOffset:offset};
}

export async function selectNeonCatalog(table,{
  columns,filters=[],orFilter='',orders=[]
}={}){
  assertCatalogSelect({table,columns,filters});
  return selectNeonAllRows(table,{columns,filters,orFilter,orders});
}

export async function selectNeonRowById(table,{
  idColumn,id,columns
}={}){
  const value=String(id??'').trim();
  if(!value)throw new TypeError('Exact ID is required');
  const result=await selectNeonRows(table,{
    columns,
    filters:[{column:String(idColumn||''),operator:'eq',value}],
    limit:1
  });
  return result.rows[0]||null;
}

export async function insertNeonRows(table,records,{returning='*'}={}){
  const rows=z.array(RowSchema).min(1).parse(Array.isArray(records)?records:[records]);
  assertMediaMetaTagsOnCreate(table,rows);
  const output=[];
  const selectColumns=safeReturning(table,returning);
  for(const batch of chunkRowsByPayload(rows)){
    let query=writableRelation(table).insert(batch);
    if(selectColumns)query=query.select(selectColumns);
    const result=await runNeonIo(()=>query);
    throwQueryError(result.error,table,'INSERT');
    if(selectColumns)output.push(...parseRows(result.data,table));
  }
  invalidateTextIndexes(table);
  return output;
}

export async function upsertNeonRows(table,records,{conflict,returning='*'}={}){
  const rows=z.array(RowSchema).min(1).parse(Array.isArray(records)?records:[records]);
  assertMediaMetaTagsOnCreate(table,rows);
  const options=conflict?{onConflict:z.string().min(1).parse(conflict)}:undefined;
  const output=[];
  const selectColumns=safeReturning(table,returning);
  for(const batch of chunkRowsByPayload(rows)){
    let query=writableRelation(table).upsert(batch,options);
    if(selectColumns)query=query.select(selectColumns);
    const result=await runNeonIo(()=>query);
    throwQueryError(result.error,table,'UPSERT');
    if(selectColumns)output.push(...parseRows(result.data,table));
  }
  invalidateTextIndexes(table);
  return output;
}

export async function updateNeonRows(table,values,{filters,returning='*'}={}){
  if(!Array.isArray(filters)||filters.length===0)throw new TypeError('Neon UPDATE requires at least one filter');
  const patch=RowSchema.parse(values);
  assertMediaMetaTagsOnUpdate(table,patch);
  let query=applyFilters(writableRelation(table).update(patch),filters);
  const selectColumns=safeReturning(table,returning);
  if(selectColumns)query=query.select(selectColumns);
  const result=await runNeonIo(()=>query);
  throwQueryError(result.error,table,'UPDATE');
  const rows=parseRows(result.data,table);
  invalidateTextIndexes(table);
  return rows;
}

export async function deleteNeonRows(table,{filters,returning='*'}={}){
  if(!Array.isArray(filters)||filters.length===0)throw new TypeError('Neon DELETE requires at least one filter');
  let query=applyFilters(writableRelation(table).delete(),filters);
  const selectColumns=safeReturning(table,returning);
  if(selectColumns)query=query.select(selectColumns);
  const result=await runNeonIo(()=>query);
  throwQueryError(result.error,table,'DELETE');
  const rows=parseRows(result.data,table);
  invalidateTextIndexes(table);
  return rows;
}
