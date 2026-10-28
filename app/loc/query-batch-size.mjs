// One versioned JS file for LOC I/O limits. No runtime database settings.
// The administrator views these values in System Management; users cannot edit them.
export const MAX_ROWS=10000;
export const DB_QUERY_BATCH_SIZE=MAX_ROWS;

// Byte limits share this file; file bytes and database rows are different units.
export const MAX_ARCHIVE_BYTES=1024*1024*1024;
export const MAX_JSON_BYTES=50*1024*1024;
export const MAX_DOCUMENT_BYTES=128*1024*1024;
export const MAX_TIMELINE_BYTES=200*1024*1024;
export const MAX_DAILY_TRANSFER_BYTES=24*1024*1024;

// Timeline windows, preview results and writes all use the same MaxRows.
export const TIMELINE_IO=Object.freeze({windowBatch:MAX_ROWS,previewPage:MAX_ROWS,writeBatch:MAX_ROWS});


// GET .in() filters are URL-encoded, so MaxRows alone cannot bound a request.
// Keep room for the endpoint, selected columns, authentication gateway and other filters.
export const MAX_GET_URL_CHARS=8000;
export function* urlSafeInBatches(values,column){
  const budget=MAX_GET_URL_CHARS-1024;
  let batch=[],used=new URLSearchParams({[column]:'in.()'}).toString().length;
  for(const value of values||[]){
    const raw=String(value);
    const quoted=/[,()]/.test(raw)?'"'+raw+'"':raw;
    const cost=new URLSearchParams({v:quoted}).toString().length-2+1;
    if(cost+new URLSearchParams({[column]:'in.()'}).toString().length>budget)
      throw Error('單筆查詢值太長，無法放入安全的 GET URL');
    if(batch.length&&(batch.length>=MAX_ROWS||used+cost>budget)){
      yield batch;batch=[];used=new URLSearchParams({[column]:'in.()'}).toString().length;
    }
    batch.push(value);used+=cost;
  }
  if(batch.length)yield batch;
}
