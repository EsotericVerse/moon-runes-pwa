'use client';

export const UI_PAGE_SIZE=20;
export const WRITE_TARGET_BYTES=512*1024;
export const DATA_QUERY_CONCURRENCY=2;
export const DATA_QUERY_BACKPRESSURE=2;
export const IO_INITIAL_BATCH=128;
export const IO_TARGET_BYTES=768*1024;
export const IO_TARGET_MS=500;
export const HEAVY_INITIAL_BATCH=4;
export const HEAVY_TARGET_BYTES=256*1024;
export const HEAVY_TARGET_MS=450;

const HEAVY_COLUMNS=Object.freeze({
  'silver.lo3rwang_galaxy':Object.freeze(new Set(['content'])),
  'silver.lrunes':Object.freeze(new Set(['content']))
});

const CATALOG_TABLES=Object.freeze(new Set([
  'silver.lrunes',
  'silver.lo3rwang_style',
  'silver.lo3rwang_style_keywords',
  'silver.manage'
]));

const EXACT_ID_COLUMNS=Object.freeze({
  'silver.lo3rwang_galaxy':Object.freeze(new Set(['galaxy_id'])),
  'silver.lrunes':Object.freeze(new Set(['record_id','galaxy_id']))
});

function columnList(columns){
  return String(columns||'').split(',').map(value=>value.trim()).filter(Boolean);
}

function hasExactIdFilter(table,filters=[]){
  const ids=EXACT_ID_COLUMNS[table];
  if(!ids)return false;
  return filters.some(filter=>
    ids.has(String(filter?.column||'')) &&
    String(filter?.operator||'')==='eq' &&
    filter?.value!==undefined &&
    filter?.value!==null &&
    String(filter.value).trim()!==''
  );
}

export function selectedHeavyColumns(table,columns){
  const heavy=HEAVY_COLUMNS[table];
  if(!heavy)return [];
  const selected=columnList(columns);
  if(selected.includes('*'))return [...heavy];
  return selected.filter(column=>heavy.has(column));
}

export function safePageSize(value,fallback=UI_PAGE_SIZE){
  const numeric=Number(value);
  const fallbackNumeric=Number(fallback);
  const parsed=Number.isFinite(numeric)
    ?Math.floor(numeric)
    :Math.floor(Number.isFinite(fallbackNumeric)?fallbackNumeric:UI_PAGE_SIZE);
  return Math.max(0,parsed);
}

export function safeRange(range){
  if(!Array.isArray(range)||range.length!==2)return null;
  const start=Math.max(0,Math.floor(Number(range[0])||0));
  const requestedEnd=Math.max(start,Math.floor(Number(range[1])||start));
  return [start,requestedEnd];
}

export function assertSafeSelect({table,columns,filters=[],limit=UI_PAGE_SIZE,range=null}){
  const heavy=HEAVY_COLUMNS[table];
  if(!heavy)return;
  const selected=columnList(columns);
  if(selected.includes('*'))throw new Error(`SELECT * blocked for large-content table ${table}`);
  if(!selected.some(column=>heavy.has(column)))return;
  const rowCount=Array.isArray(range)
    ?Math.max(0,Number(range[1])-Number(range[0])+1)
    :Number(limit);
  if(rowCount!==1||!hasExactIdFilter(table,filters)){
    throw new Error(`Bulk heavy-column SELECT blocked for ${table}; use adaptive IO processing or exact ID`);
  }
}

export function assertHeavyBatchSelect({table,columns}){
  const selected=columnList(columns);
  if(selected.includes('*'))throw new Error(`Adaptive heavy SELECT * blocked for ${table}`);
  if(!selectedHeavyColumns(table,columns).length){
    throw new Error(`Adaptive heavy processing requires an explicit heavy column for ${table}`);
  }
}

export function adaptiveBatchSize({
  current=IO_INITIAL_BATCH,
  payloadBytes=0,
  requestMs=0,
  consumerMs=0,
  targetBytes=IO_TARGET_BYTES,
  targetMs=IO_TARGET_MS
}={}){
  const safeCurrent=Math.max(1,Math.floor(Number(current)||IO_INITIAL_BATCH));
  const byteRatio=payloadBytes>0?targetBytes/payloadBytes:2;
  const elapsed=Math.max(Number(requestMs)||0,Number(consumerMs)||0,1);
  const timeRatio=targetMs/elapsed;
  const factor=Math.max(0.35,Math.min(4,byteRatio,timeRatio));
  return Math.max(1,Math.round(safeCurrent*factor));
}

const SAFE_RETURNING=Object.freeze({
  'silver.lo3rwang_galaxy':'galaxy_id',
  'silver.lo3rwang_galaxy_media':'media_id',
  'silver.lrunes':'record_id'
});

export function safeReturning(table,requested='*'){
  if(requested===null||requested===false)return null;
  const safe=SAFE_RETURNING[table];
  if(!safe)return requested;
  if(!requested||requested==='*')return safe;
  const cols=columnList(requested);
  if(cols.includes('content'))throw new Error(`Returning heavy content is blocked for ${table}`);
  return requested;
}

export function chunkWriteRows(rows,{targetBytes=WRITE_TARGET_BYTES}={}){
  const source=Array.isArray(rows)?rows:[rows];
  const chunks=[];
  let current=[];
  let currentBytes=2;
  const target=Math.max(1024,Math.floor(Number(targetBytes)||WRITE_TARGET_BYTES));
  for(const row of source){
    const rowBytes=new TextEncoder().encode(JSON.stringify(row??{})).byteLength+1;
    if(current.length&&currentBytes+rowBytes>target){
      chunks.push(current);
      current=[];
      currentBytes=2;
    }
    current.push(row);
    currentBytes+=rowBytes;
  }
  if(current.length)chunks.push(current);
  return chunks;
}

export function assertCatalogSelect({table,columns,filters=[]}){
  if(!CATALOG_TABLES.has(table))throw new Error(`Catalog loading is not allowed for ${table}`);
  const selected=columnList(columns);
  if(selected.includes('*'))throw new Error(`Catalog SELECT * blocked for ${table}`);
  const heavy=HEAVY_COLUMNS[table];
  if(heavy&&selected.some(column=>heavy.has(column))){
    throw new Error(`Catalog cannot return heavy columns from ${table}`);
  }
  if(table==='silver.lrunes'){
    const typeFilter=(filters||[]).find(filter=>String(filter?.column||'')==='record_type');
    const allowed=new Set(['rune','keyword','rule']);
    if(!typeFilter)throw new Error('LunaRunes catalog requires record_type filter');
    const values=typeFilter.operator==='eq'?[typeFilter.value]:(typeFilter.operator==='in'&&Array.isArray(typeFilter.value)?typeFilter.value:[]);
    if(!values.length||values.some(value=>!allowed.has(String(value)))){
      throw new Error('LunaRunes catalog only allows rune/keyword/rule records');
    }
  }
}
