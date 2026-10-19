// One shared page-size contract for all database read adapters.
// Article headings and bodies are deliberately kept in small pages;
// metadata-only SELECTs can use the larger page size.
export const DB_QUERY_BATCH_SIZE=65535;
export const DB_QUERY_TEXT_BATCH_SIZE=1000;

const LONG_TEXT_COLUMNS=new Set(['*','title','content','block_title','block_text']);
export function queryBatchSize(columns='*'){
  const selected=Array.isArray(columns)?columns:String(columns||'*').split(',');
  return selected.some(column=>LONG_TEXT_COLUMNS.has(String(column||'').trim().toLowerCase()))
    ?DB_QUERY_TEXT_BATCH_SIZE:DB_QUERY_BATCH_SIZE;
}
