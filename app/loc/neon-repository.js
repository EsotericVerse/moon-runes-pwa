'use client';

import {z} from 'zod';
import {neonClient} from './neon-client';

const TableSchema=z.enum([
  'gold.public_works','gold.public_song_versions',
  'api.user_records','api.user_settings','api.scope_contacts','api.scope_theme_defaults',
  'api.scope_access_grants','api.scope_relations','api.scope_relation_requests','api.site_theme_styles',
  'api.loc_context_entries','api.runes_context_entries','api.lo3rwang_context_entries',
  'api.lo3rwang_period_context_entries','api.loc_rankings','api.runes_rankings',
  'api.lo3rwang_rankings','api.lrunes_runes','api.lrunes_evolution_history','api.lrunes_harmony','api.lrunes_algorithm',
  'api.loc_works','api.runes_works','api.lo3rwang_works',
  'silver.works','silver.song_versions','silver.knowledge_assets','silver.content_relations','silver.work_scope_affiliations',
  'silver.runes_context_entries','silver.lo3rwang_context_entries',
  'silver.lo3rwang_period_context_entries','silver.runes_rankings',
  'silver.lo3rwang_rankings','silver.lrunes_runes','silver.lrunes_evolution_history','silver.lrunes_harmony','silver.lrunes_algorithm',
  'silver.lo3rwang_works','silver.runes_works',
  'vault.work_texts','vault.song_version_texts'
]);
const WritableTableSchema=z.enum([
  'api.user_records','api.user_settings','api.scope_access_grants','api.scope_relations',
  'api.scope_relation_requests','api.site_theme_styles','silver.work_scope_affiliations'
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
  columns='*',filters=[],orders=[],limit=1000,range=null,count=null
}={}){
  let query=relation(table).select(columns,count?{count}:undefined);
  query=applyFilters(query,filters);
  for(const order of orders){
    const item=OrderSchema.parse(order);
    query=query.order(item.column,{ascending:item.ascending??true,nullsFirst:item.nullsFirst});
  }
  if(Array.isArray(range)&&range.length===2)query=query.range(range[0],range[1]);
  else if(Number.isFinite(limit))query=query.limit(Math.max(0,Math.min(5000,Math.floor(limit))));
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

const RpcSchema=z.enum(['decide_scope_relation_request']);
export async function callNeonRpc(name,args){
  const rpc=RpcSchema.parse(name);
  const result=await neonClient.rpc(rpc,z.record(z.string(),z.unknown()).parse(args||{}));
  throwQueryError(result.error,`rpc:${rpc}`,'RPC');
  return result.data;
}
