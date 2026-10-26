'use client';

import {dbPublicClient} from '../../../loc/db-client.mjs';
import {spatialReferenceLikePattern,spatialReferenceCandidates} from './trace-spatial-references.mjs';

// The LOC union is a read-only lookup for confirmed place data. The caller
// always creates an independent UID under its own Scope on save.
export async function readSharedSpatialReferences(term){
  const pattern=spatialReferenceLikePattern(term);
  if(!pattern)return [];
  const query=column=>dbPublicClient.schema('silver').from('loc_trace')
    .select('uid,scope_id,title,address,floor_label,floor_level,longitude,latitude')
    .eq('trace_type','anchor')
    .ilike(column,pattern)
    .order('title',{ascending:true})
    .order('scope_id',{ascending:true})
    .order('uid',{ascending:true})
    .limit(8);
  const [byName,byAddress,byFloor]=await Promise.all([
    query('title'),query('address'),query('floor_label')
  ]);
  if(byName.error)throw Error('共用地點名稱查詢失敗：'+byName.error.message);
  if(byAddress.error)throw Error('共用地址查詢失敗：'+byAddress.error.message);
  if(byFloor.error)throw Error('共用樓層查詢失敗：'+byFloor.error.message);
  return spatialReferenceCandidates([byName.data||[],byAddress.data||[],byFloor.data||[]]);
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
  const result=await dbPublicClient.schema('silver').from('loc_trace')
    .select('uid,scope_id,trace_type,title,address,floor_label,floor_level,longitude,latitude')
    .eq('trace_type','anchor')
    .in('title',unique)
    .order('scope_id',{ascending:true})
    .order('uid',{ascending:true})
    .limit(201);
  if(result.error)throw Error('已有定錨點批次查詢失敗：'+result.error.message);
  if((result.data||[]).length>200)throw Error('同名地點候選過多，請改用逐筆地址搜尋。');
  return spatialReferenceCandidates([result.data||[]],200);
}
