// The database may lower runtime I/O limits, never exceed these safe hard ceilings.
const MiB=1048576;
export const IO_LIMIT_CEILINGS=Object.freeze({
  maxRows:10000,archiveMiB:1024,jsonMiB:50,documentMiB:128,timelineMiB:200
});
export let MAX_ROWS=IO_LIMIT_CEILINGS.maxRows;
export let DB_QUERY_BATCH_SIZE=MAX_ROWS;
export let MAX_ARCHIVE_BYTES=IO_LIMIT_CEILINGS.archiveMiB*MiB;
export let MAX_JSON_BYTES=IO_LIMIT_CEILINGS.jsonMiB*MiB;
export let MAX_DOCUMENT_BYTES=IO_LIMIT_CEILINGS.documentMiB*MiB;
export let MAX_TIMELINE_BYTES=IO_LIMIT_CEILINGS.timelineMiB*MiB;
export const MAX_DAILY_TRANSFER_BYTES=24*MiB;
export let TIMELINE_IO=Object.freeze({windowBatch:MAX_ROWS,previewPage:MAX_ROWS,writeBatch:MAX_ROWS});

export function applyRuntimeIoLimits(settings={}){
  const bounded=(key,minimum)=> {
    const value=settings?.[key];
    if(value===undefined||value===null)return IO_LIMIT_CEILINGS[key];
    const number=Number(value);
    if(!Number.isSafeInteger(number)||number<minimum||number>IO_LIMIT_CEILINGS[key])
      throw new Error(key+' 超出允許範圍');
    return number;
  };
  MAX_ROWS=bounded('maxRows',100);
  DB_QUERY_BATCH_SIZE=MAX_ROWS;
  MAX_ARCHIVE_BYTES=bounded('archiveMiB',1)*MiB;
  MAX_JSON_BYTES=bounded('jsonMiB',1)*MiB;
  MAX_DOCUMENT_BYTES=bounded('documentMiB',1)*MiB;
  MAX_TIMELINE_BYTES=bounded('timelineMiB',1)*MiB;
  TIMELINE_IO=Object.freeze({windowBatch:MAX_ROWS,previewPage:MAX_ROWS,writeBatch:MAX_ROWS});
  return {maxRows:MAX_ROWS,archiveMiB:MAX_ARCHIVE_BYTES/MiB,jsonMiB:MAX_JSON_BYTES/MiB,
    documentMiB:MAX_DOCUMENT_BYTES/MiB,timelineMiB:MAX_TIMELINE_BYTES/MiB};
}


// GET .in() filters are URL-encoded, so MaxRows alone cannot bound a request.
// Keep room for the endpoint, selected columns, authentication gateway and other filters.
export const MAX_GET_URL_CHARS=8000;
export function* urlSafeInBatches(values,column){
  const budget=MAX_GET_URL_CHARS-1024;
  const encode=value=>{
    const raw=String(value);
    return /[,()]/.test(raw)?'"'+raw.replace(/"/g,'\\"')+'"':raw;
  };
  const lengthOf=items=>new URLSearchParams({
    [column]:'in.('+items.map(encode).join(',')+')'
  }).toString().length;
  let batch=[];
  for(const value of values||[]){
    const candidate=[...batch,value];
    if(candidate.length>MAX_ROWS||lengthOf(candidate)>budget){
      if(!batch.length)throw Error('單筆查詢值太長，無法放入安全的 GET URL');
      yield batch;
      batch=[value];
      if(lengthOf(batch)>budget)throw Error('單筆查詢值太長，無法放入安全的 GET URL');
    }else batch=candidate;
  }
  if(batch.length)yield batch;
}
