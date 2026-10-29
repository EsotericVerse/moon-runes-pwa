import {classifyKeywordDocuments} from './keyword-engine.mjs';

// Boundary adapter: temporary ordinal numbers are private to the scoring call.
// Persisted Item identity is always the original keyword_id (BIGINT).
export function classifyKeywordDocumentsById(documents=[],catalogRows=[]){
  const ids=new Set();
  const mapping=new Map();
  const temporaryCatalog=catalogRows.map((row,index)=>{
    const keywordId=String(row?.keyword_id??'');
    if(!/^[1-9][0-9]*$/.test(keywordId)
      ||BigInt(keywordId)>9223372036854775807n||ids.has(keywordId))
      throw new Error('Missing, duplicate, or invalid keyword_id');
    ids.add(keywordId);
    const slot=index+1;
    mapping.set(slot,keywordId);
    return {...row,item_no:slot};
  });
  const result=classifyKeywordDocuments(documents,temporaryCatalog);
  return {
    documentCount:result.documentCount,
    classifiedCount:result.classifiedCount,
    unclassifiedCount:result.unclassifiedCount,
    classifications:(result.classifications||[]).map(row=>({
      uid:row.uid,classification_group:row.classification_group,status:row.status,
      hits:(row.rune_counts||[]).map(hit=>({
        keyword_id:mapping.get(hit.rune_id),times:hit.count
      }))
    }))
  };
}
