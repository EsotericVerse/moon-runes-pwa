'use client';

import {dbPublicClient} from '../../../loc/db-client.mjs';
import {spatialReferenceLikePattern,spatialReferenceCandidates,spatialReferenceLabelVariants} from './trace-spatial-references.mjs';

// The LOC union is a read-only lookup for confirmed place data. The caller
// always creates an independent UID under its own Scope on save.
export async function readSharedSpatialReferences(term){
  const patterns=spatialReferenceLabelVariants(term)
    .map(spatialReferenceLikePattern).filter(Boolean);
  if(!patterns.length)return [];
  const query=(column,pattern)=>dbPublicClient.schema('silver').from('loc_trace')
    .select('uid,scope_id,title,address,floor_label,floor_level,longitude,latitude')
    .eq('trace_type','anchor')
    .ilike(column,pattern)
    .order('title',{ascending:true})
    .order('scope_id',{ascending:true})
    .order('uid',{ascending:true})
    .limit(8);
  const columns=['title','address','floor_label'];
  const results=await Promise.all(patterns.flatMap(pattern=>
    columns.map(column=>query(column,pattern))));
  const failed=results.find(row=>row.error);
  if(failed)throw Error('LOC 地點／地址參考查詢失敗：'+failed.error.message);
  return spatialReferenceCandidates(results.map(row=>row.data||[]));
}

/**
 * One bounded public LOC-union read for a batch of Facebook check-in names.
 * Name-only matches are suggestions, not authorization to clone an anchor UID.
 * No remote geocoding and no changes to Galaxy or the source Scope.
 */
export async function readSharedSpatialReferencesByNames(names=[]){
  const unique=[...new Set((Array.isArray(names)?names:[])
    .map(value=>String(value||'').trim()).filter(Boolean))];
  if(!unique.length)return [];
  if(unique.length>20)throw Error('同批地名超過 20 個，請分批查詢。');
  const spellings=[...new Set(unique.flatMap(spatialReferenceLabelVariants))];
  const result=await dbPublicClient.schema('silver').from('loc_trace')
    .select('uid,scope_id,trace_type,title,address,floor_label,floor_level,longitude,latitude')
    .eq('trace_type','anchor')
    .in('title',spellings)
    .order('scope_id',{ascending:true})
    .order('uid',{ascending:true})
    .limit(201);
  if(result.error)throw Error('已有定錨點批次查詢失敗：'+result.error.message);
  if((result.data||[]).length>200)throw Error('同名地點候選過多，請改用逐筆地址搜尋。');
  return spatialReferenceCandidates([result.data||[]],200);
}
