'use client';

import {dbAuthClient,dbAuthRelation} from './db-client.mjs';

const CACHE_SCOPE='lo3rwang';
const CACHE_COLUMN='keyword_suggestions';
const MAX_CACHE_ROWS=120;

// One private JSONB array column in silver.lo3rwang; the first entry is
// summary metadata, subsequent entries are suggestion records.
export function decodeKeywordSuggestionCache(value){
  if(!Array.isArray(value))return null;
  const [header,...items]=value;
  if(!header||header.kind!=='summary'||header.version!==1
      ||!Array.isArray(items))return null;
  return {
    read:Number(header.read)||0,
    withContent:Number(header.withContent)||0,
    limited:Boolean(header.limited),
    scannedAt:String(header.scannedAt||''),
    dense:header.dense||null,
    sparse:header.sparse||null,
    candidates:items.filter(item=>
      item&&item.kind==='suggestion'&&typeof item.word==='string'
    ).slice(0,MAX_CACHE_ROWS).map(({kind,...item})=>item)
  };
}
export function encodeKeywordSuggestionCache(result,now=new Date().toISOString()){
  return [
    {kind:'summary',version:1,scannedAt:now,
      read:Number(result.read)||0,withContent:Number(result.withContent)||0,
      limited:Boolean(result.limited),dense:result.dense||null,
      sparse:result.sparse||null},
    ...(Array.isArray(result.candidates)?result.candidates:[])
      .slice(0,MAX_CACHE_ROWS)
      .map(item=>({kind:'suggestion',
        word:String(item.word||''),documents:Number(item.documents)||0,
        occurrences:Number(item.occurrences)||0,
        denseDocuments:Number(item.denseDocuments)||0,
        trendChanges:Number(item.trendChanges)||0,
        language:String(item.language||''),
        sample:String(item.sample||'').slice(0,160)
      }))
  ];
}
export async function readKeywordSuggestionCache(scopeId){
  if(scopeId!==CACHE_SCOPE)return null;
  const {data,error}=await dbAuthClient.schema('silver')
    .rpc('read_scope_keyword_suggestions',{p_scope_id:scopeId});
  if(error)throw new Error(error.message||'無法讀取關鍵詞暫存');
  return decodeKeywordSuggestionCache(data);
}
export async function writeKeywordSuggestionCache(scopeId,table,result){
  if(scopeId!==CACHE_SCOPE)return null;
  if(table!=='silver.lo3rwang')throw new Error('關鍵詞暫存 Scope 不一致');
  const payload=encodeKeywordSuggestionCache(result);
  const {data,error}=await dbAuthRelation(table)
    .update({[CACHE_COLUMN]:payload})
    .eq('id',scopeId).select('id');
  if(error||data?.length!==1)
    throw new Error(error?.message||'建議結果未能暫存');
  return decodeKeywordSuggestionCache(payload);
}
