// Trace map default: browser-local preference, never written into anchor or
// route payloads. This is per-source Scope and is not a global public default.
// A future cross-device public default needs its own authorized data contract.
const KEY_PREFIX='loc:trace:default-route:';
export const TRACE_DEFAULT_ROUTE_CHANGED='loc:trace:default-route-changed';
const validScope=scope=>['loc','lo3rwang','lrunes'].includes(String(scope||''));
const validUid=uid=>/^(?:[A-Za-z0-9]{4}|[A-Za-z0-9]{8})$/.test(String(uid||''));
export function readDefaultTraceRoute(scopeId){
  if(!validScope(scopeId)||typeof window==='undefined')return '';
  try{
    const value=window.localStorage.getItem(KEY_PREFIX+scopeId)||'';
    return validUid(value)?value:'';
  }catch{return '';}
}
export function setDefaultTraceRoute(scopeId,uid){
  if(!validScope(scopeId)||!validUid(uid)||typeof window==='undefined')return false;
  try{
    window.localStorage.setItem(KEY_PREFIX+scopeId,String(uid));
    window.dispatchEvent(new Event(TRACE_DEFAULT_ROUTE_CHANGED));
    return true;
  }catch{return false;}
}
export function clearDefaultTraceRoute(scopeId,uid=''){
  if(!validScope(scopeId)||typeof window==='undefined')return false;
  try{
    const current=readDefaultTraceRoute(scopeId);
    if(uid&&uid!==current)return false;
    window.localStorage.removeItem(KEY_PREFIX+scopeId);
    window.dispatchEvent(new Event(TRACE_DEFAULT_ROUTE_CHANGED));
    return true;
  }catch{return false;}
}
export function chooseDefaultTraceRoute(maps,scopeId,preferredUid=''){
  const candidates=(Array.isArray(maps)?maps:[]).filter(row=>
    row?.trace_type==='map'&&row.source_scope===scopeId&&validUid(row.uid));
  return candidates.find(row=>row.uid===preferredUid)||candidates[0]||null;
}
