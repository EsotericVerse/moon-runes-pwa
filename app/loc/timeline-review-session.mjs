import {gzipSync,gunzipSync,strToU8,strFromU8} from 'fflate';

// Opt-in, per-tab review cache: contains article previews, never the raw Timeline JSON.
// The stored owner ID prevents another signed-in account from restoring this review.
const TTL_MS=6*60*60*1000;
const MAX_REVIEW_JSON_CHARS=8*1024*1024;
const MAX_REVIEW_CACHE_CHARS=3*1024*1024;
const key=scopeId=>'loc-timeline-review:'+scopeId;
export function timelineReviewCacheOversized(storage,scopeId){
  const cached=storage.getItem(key(scopeId));
  return Boolean(cached&&cached.length>MAX_REVIEW_CACHE_CHARS);
}
function base64(bytes){
  let binary='';
  for(let i=0;i<bytes.length;i+=16384)
    binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
  return btoa(binary);
}
function unbase64(value){
  const binary=atob(value),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return bytes;
}
export function saveTimelineReviewSession(storage,{scopeId,owner,analysis,groupChoices,itemChoices,excluded,completedCount}){
  if(!owner||!analysis)return false;
  // Only the resolved review metadata belongs in browser session storage.
  // Never save raw Timeline coordinate evidence or full archive objects.
  const withoutCoordinates=rows=>(rows||[]).map(({coordinates,commonAnchors,...row})=>row);
  const snapshot={owner,savedAt:Date.now(),analysis:{...analysis,
    ready:withoutCoordinates(analysis.ready),
    disputes:withoutCoordinates(analysis.disputes),unchanged:[]},
    groupChoices,itemChoices,excluded,completedCount};
  const json=JSON.stringify(snapshot);
  if(json.length>MAX_REVIEW_JSON_CHARS)return false;
  const encoded=base64(gzipSync(strToU8(json),{level:4}));
  if(encoded.length>MAX_REVIEW_CACHE_CHARS)return false;
  storage.setItem(key(scopeId),encoded);
  return true;
}
export function loadTimelineReviewSession(storage,{scopeId,owner}){
  if(!owner)return null;
  const cached=storage.getItem(key(scopeId));
  if(!cached||cached.length>MAX_REVIEW_CACHE_CHARS)return null;
  try{
    const snapshot=JSON.parse(strFromU8(gunzipSync(unbase64(cached))));
    if(snapshot.owner!==owner||!Number.isFinite(snapshot.savedAt)||Date.now()-snapshot.savedAt>TTL_MS
      ||!snapshot.analysis||!Array.isArray(snapshot.analysis.ready)
      ||!Array.isArray(snapshot.analysis.disputes)){
      storage.removeItem(key(scopeId));
      return null;
    }
    return snapshot;
  }catch{
    storage.removeItem(key(scopeId));
    return null;
  }
}
export function clearTimelineReviewSession(storage,scopeId){
  storage.removeItem(key(scopeId));
}
