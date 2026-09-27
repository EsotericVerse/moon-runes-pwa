'use client';

import {z} from 'zod';
import {neonClient} from './neon-client';
import {
  UI_PAGE_SIZE,
  assertSafeSelect,assertHeavyBatchSelect,assertCatalogSelect,
  safePageSize,safeRange,safeReturning
} from './query-policy';
import {
  chunkRowsByPayload,estimatePayloadBytes,initialBatchSize,mapIoIterable,
  nextAdaptiveBatchSize,reportNeonIoError,runNeonIo
} from './io-controller';
import {clearRuntimeTextIndexes} from './text-engine';

const TableSchema=z.enum([
  'api.user_records','api.user_settings',
  'silver.manage','silver.resource_visibility',
  'silver.lo3rwang','silver.lo3rwang_style','silver.lo3rwang_style_keywords',
  'silver.lo3rwang_galaxy','silver.lo3rwang_galaxy_media',
  'silver.lrunes',
  'silver.faq_entries',
  'silver.v_lo3rwang_canonical_works','silver.v_lo3rwang_source_catalog','silver.v_lo3rwang_source_weekly',
]);
const WritableTableSchema=z.enum([
  'api.user_records','api.user_settings',
  'silver.manage','silver.resource_visibility',
  'silver.lo3rwang','silver.lo3rwang_style','silver.lo3rwang_style_keywords',
  'silver.lo3rwang_galaxy','silver.lo3rwang_galaxy_media',
  'silver.lrunes'
]);
const RowSchema=z.record(z.string(),z.unknown());
const TEXT_INDEX_TABLES=new Set([
  'silver.manage','silver.lo3rwang_galaxy','silver.lo3rwang_galaxy_media','silver.lrunes'
]);
function invalidateTextIndexes(table){
  if(TEXT_INDEX_TABLES.has(String(table||'')))clearRuntimeTextIndexes();
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

function writableRelation(table){
  const parsed=WritableTableSchema.safeParse(table);
  if(!parsed.success)throw new NeonRepositoryError('Canonical content tables are read-only; write a scope/resource link instead of copying content',{table:String(table),code:'NEON_CONTENT_WRITE_BLOCKED'});
  return relation(parsed.data);
}

function relation(table){
  const parsed=TableSchema.safeParse(table);
  if(!parsed.success)throw new NeonRepositoryError('Neon table is not in the shared repository allowlist',{table:String(table),code:'NEON_TABLE_NOT_ALLOWED'});
  const [schema,name]=parsed.data.split('.');
  return neonClient.schema(schema).from(name);
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

async function executeSelect(table,{
  columns='*',filters=[],orFilter='',orders=[],limit=UI_PAGE_SIZE,offset=0,range=null,count=null
}={},allowHeavyBatch=false){
  if(!allowHeavyBatch)assertSafeSelect({table,columns,filters,limit,range});
  let query=relation(table).select(columns,count?{count}:undefined);
  query=applyFilters(query,filters);
  if(orFilter){
    const expression=z.string().min(1).max(12000).parse(orFilter);
    query=query.or(expression);
  }
  for(const order of orders){
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
  throwQueryError(result.error,table,'SELECT');
  return {rows:parseRows(result.data,table),count:result.count??null};
}

export async function selectNeonRows(table,options={}){
  return executeSelect(table,options,false);
}

export async function selectNeonWindow(table,{
  columns='*',filters=[],orFilter='',orders=[],
  limit=UI_PAGE_SIZE,offset=0,count=null
}={}){
  const requested=Math.max(0,Math.floor(Number(limit)||0));
  const start=Math.max(0,Math.floor(Number(offset)||0));
  if(requested===0)return selectNeonRows(table,{columns,filters,orFilter,orders,limit:0,offset:start,count});
  assertSafeSelect({table,columns,filters,limit:1});
  const rows=[];
  let cursor=start;
  let batchSize=Math.min(requested,initialBatchSize('metadata'));
  let resultCount=null;
  while(rows.length<requested){
    const size=Math.max(1,Math.min(batchSize,requested-rows.length));
    const started=globalThis.performance?.now?.()??Date.now();
    const page=await executeSelect(table,{
      columns,filters,orFilter,orders,limit:size,offset:cursor,count:resultCount===null?count:null
    },false);
    const elapsed=(globalThis.performance?.now?.()??Date.now())-started;
    if(resultCount===null)resultCount=page.count??null;
    if(!page.rows.length)break;
    rows.push(...page.rows);
    cursor+=page.rows.length;
    batchSize=nextAdaptiveBatchSize({
      current:size,
      payloadBytes:estimatePayloadBytes(page.rows),
      requestMs:elapsed,
      profile:'metadata'
    });
  }
  return {rows:rows.slice(0,requested),count:resultCount};
}

export async function selectNeonAllRows(table,{
  columns,filters=[],orFilter='',orders=[]
}={}){
  assertSafeSelect({table,columns,filters,limit:1});
  const rows=[];
  let cursor=0;
  let batchSize=initialBatchSize('metadata');
  let total=null;
  while(total===null||rows.length<total){
    const started=globalThis.performance?.now?.()??Date.now();
    const page=await executeSelect(table,{
      columns,filters,orFilter,orders,limit:batchSize,offset:cursor,count:total===null?'exact':null
    },false);
    const elapsed=(globalThis.performance?.now?.()??Date.now())-started;
    if(total===null)total=Math.max(0,Number(page.count??0)||0);
    if(!page.rows.length)break;
    rows.push(...page.rows);
    cursor+=page.rows.length;
    batchSize=nextAdaptiveBatchSize({
      current:batchSize,
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
      current:batchSize,payloadBytes:bytes,requestMs,consumerMs,profile:'heavy'
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
