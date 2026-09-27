'use client';

export const UI_PAGE_SIZE=20;
export const MAX_ROW_PAGE=64;
export const WRITE_BATCH_SIZE=64;

const HEAVY_COLUMNS=Object.freeze({
  'silver.lo3rwang_galaxy':Object.freeze(new Set(['content'])),
  'silver.lrunes':Object.freeze(new Set(['content']))
});

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

export function safePageSize(value,fallback=UI_PAGE_SIZE){
  const parsed=Math.floor(Number(value)||fallback);
  return Math.max(0,Math.min(MAX_ROW_PAGE,parsed));
}

export function safeRange(range){
  if(!Array.isArray(range)||range.length!==2)return null;
  const start=Math.max(0,Math.floor(Number(range[0])||0));
  const requestedEnd=Math.max(start,Math.floor(Number(range[1])||start));
  return [start,Math.min(requestedEnd,start+MAX_ROW_PAGE-1)];
}

export function assertSafeSelect({table,columns,filters=[],limit=UI_PAGE_SIZE,range=null}){
  const heavy=HEAVY_COLUMNS[table];
  if(!heavy)return;
  const selected=columnList(columns);
  if(selected.includes('*')){
    throw new Error(`SELECT * blocked for large-content table ${table}`);
  }
  if(!selected.some(column=>heavy.has(column)))return;
  const rowCount=Array.isArray(range)
    ?Math.max(0,Number(range[1])-Number(range[0])+1)
    :Number(limit);
  if(rowCount!==1||!hasExactIdFilter(table,filters)){
    throw new Error(`Bulk heavy-column SELECT blocked for ${table}; heavy content requires exact ID and one row`);
  }
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

export function chunkWriteRows(rows){
  const source=Array.isArray(rows)?rows:[rows];
  const chunks=[];
  for(let i=0;i<source.length;i+=WRITE_BATCH_SIZE)chunks.push(source.slice(i,i+WRITE_BATCH_SIZE));
  return chunks;
}
