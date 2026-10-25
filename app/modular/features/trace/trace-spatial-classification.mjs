// Shared spatial navigation model for Trace management and the public map.
// Geographic county grouping is a UI projection, never a write to the source
// anchor; missing / overseas coordinates must remain navigable as names.
export const TRACE_OTHER_REGION='未判定／其他地區';
export function locatableTraceAnchor(anchor){
  if(anchor?.trace_type!=='anchor')return false;
  if(anchor.longitude==null||anchor.latitude==null
    ||String(anchor.longitude).trim()===''||String(anchor.latitude).trim()==='')return false;
  const lng=Number(anchor.longitude),lat=Number(anchor.latitude);
  return Number.isFinite(lng)&&Number.isFinite(lat)
    &&Math.abs(lng)<=180&&Math.abs(lat)<=90;
}
export function classifyTraceAnchors(anchors=[],countyForCoordinates=null){
  const regions=new Map();
  for(const anchor of Array.isArray(anchors)?anchors:[]){
    if(anchor?.trace_type!=='anchor')continue;
    const region=locatableTraceAnchor(anchor)&&typeof countyForCoordinates==='function'
      ?String(countyForCoordinates(anchor.longitude,anchor.latitude)||TRACE_OTHER_REGION)
      :TRACE_OTHER_REGION;
    if(!regions.has(region))regions.set(region,[]);
    regions.get(region).push(anchor);
  }
  for(const entries of regions.values())entries.sort((a,b)=>
    String(a.title||'').localeCompare(String(b.title||''),'zh-Hant')
    ||String(a.uid||'').localeCompare(String(b.uid||'')));
  return new Map([...regions].sort(([a],[b])=>
    a===TRACE_OTHER_REGION?1:b===TRACE_OTHER_REGION?-1:a.localeCompare(b,'zh-Hant')));
}
