'use client';

import {z} from 'zod';
import {neonClient} from './neon-client';

const TableSchema=z.enum([
  'silver.manage','silver.resource_visibility',
  'silver.lo3rwang','silver.lo3rwang_style','silver.lo3rwang_style_keywords','silver.lo3rwang_style_time',
  'silver.lo3rwang_galaxy','silver.lo3rwang_galaxy_media',
  'silver.lrunes','silver.lrunes_style_context','silver.lrunes_style_time','silver.lrunes_galaxy',
  'silver.lrunes_daily_draws','silver.lrunes_harmony','silver.lrunes_algorithm',
  'silver.faq_entries',
]);
const WritableTableSchema=z.enum([
  'silver.manage','silver.resource_visibility',
  'silver.lo3rwang','silver.lo3rwang_style','silver.lo3rwang_style_keywords','silver.lo3rwang_style_time',
  'silver.lo3rwang_galaxy','silver.lo3rwang_galaxy_media',
  'silver.lrunes_style_context','silver.lrunes_style_time','silver.lrunes_galaxy','silver.lrunes_daily_draws'
]);
const RowSchema=z.record(z.string(),z.unknown());
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
  throw new NeonRepositoryError(`Neon ${operation} ${table}: ${error.message||'query failed'}`,{
    table,code:error.code||'NEON_QUERY_FAILED',cause:error
  });
}

export async function selectNeonRows(table,{
  columns='*',filters=[],orders=[],limit=1000,offset=0,range=null,count=null
}={}){
  let query=relation(table).select(columns,count?{count}:undefined);
  query=applyFilters(query,filters);
  for(const order of orders){
    const item=OrderSchema.parse(order);
    query=query.order(item.column,{ascending:item.ascending??true,nullsFirst:item.nullsFirst});
  }
  if(Array.isArray(range)&&range.length===2)query=query.range(range[0],range[1]);
  else if(Number.isFinite(limit)){
    const size=Math.max(0,Math.min(5000,Math.floor(limit)));
    const start=Math.max(0,Math.floor(Number(offset)||0));
    query=size?query.range(start,start+size-1):query.limit(0);
  }
  const result=await query;
  throwQueryError(result.error,table,'SELECT');
  return {rows:parseRows(result.data,table),count:result.count??null};
}

export async function insertNeonRows(table,records,{returning='*'}={}){
  const rows=z.array(RowSchema).min(1).parse(Array.isArray(records)?records:[records]);
  const result=await writableRelation(table).insert(rows).select(returning);
  throwQueryError(result.error,table,'INSERT');
  return parseRows(result.data,table);
}

export async function upsertNeonRows(table,records,{conflict,returning='*'}={}){
  const rows=z.array(RowSchema).min(1).parse(Array.isArray(records)?records:[records]);
  const options=conflict?{onConflict:z.string().min(1).parse(conflict)}:undefined;
  const result=await writableRelation(table).upsert(rows,options).select(returning);
  throwQueryError(result.error,table,'UPSERT');
  return parseRows(result.data,table);
}

export async function updateNeonRows(table,values,{filters,returning='*'}={}){
  if(!Array.isArray(filters)||filters.length===0)throw new TypeError('Neon UPDATE requires at least one filter');
  const patch=RowSchema.parse(values);
  let query=applyFilters(writableRelation(table).update(patch),filters);
  if(returning)query=query.select(returning);
  const result=await query;
  throwQueryError(result.error,table,'UPDATE');
  return parseRows(result.data,table);
}

export async function deleteNeonRows(table,{filters,returning='*'}={}){
  if(!Array.isArray(filters)||filters.length===0)throw new TypeError('Neon DELETE requires at least one filter');
  let query=applyFilters(writableRelation(table).delete(),filters);
  if(returning)query=query.select(returning);
  const result=await query;
  throwQueryError(result.error,table,'DELETE');
  return parseRows(result.data,table);
}

