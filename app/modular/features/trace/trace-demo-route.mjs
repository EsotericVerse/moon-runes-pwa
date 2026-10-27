import {spaceCoordinates} from './space-graph.mjs';

// Public two-point preview is in-memory only and has no database write path.
export function pickTraceDemoStop(current,anchor,scopeId){
  const ids=Array.isArray(current)?current:[];
  if(ids.length>=2||!anchor||anchor.trace_type!=='space_anchor'||
    anchor.source_scope!==scopeId||!spaceCoordinates(anchor)||
    !/^[A-Za-z0-9]{4}$/.test(String(anchor.uid||''))||
    ids.includes(anchor.uid))return ids;
  return [...ids,anchor.uid];
}
export function traceDemoRoute(ids,anchors,scopeId){
  if(!Array.isArray(ids)||ids.length!==2||ids[0]===ids[1])return null;
  const selected=ids.map(uid=>(anchors||[]).find(anchor=>
    anchor.uid===uid&&anchor.source_scope===scopeId&&anchor.trace_type==='space_anchor'));
  if(selected.some(row=>!row||!spaceCoordinates(row)))return null;
  return {uid:'DEMO',trace_type:'space_period',source_scope:scopeId,
    title:'兩點路線試玩（不儲存）',anchor_list:[...ids]};
}
