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
  const [byName,byAddress]=await Promise.all([query('title'),query('address')]);
  if(byName.error)throw Error('共用地點名稱查詢失敗：'+byName.error.message);
  if(byAddress.error)throw Error('共用地址查詢失敗：'+byAddress.error.message);
  return spatialReferenceCandidates([byName.data||[],byAddress.data||[]]);
}
