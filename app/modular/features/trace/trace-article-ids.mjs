// Trace public article linkage is purely Scope-local by a stable four-character ID.
// The same four-character trace.uid identifies anchors and Frames by trace_type.
const shortId=value=>{
  const id=String(value||'').trim().toUpperCase();
  return /^[A-Z0-9]{4}$/.test(id)?id:'';
};
function selectedAnchors(selection,anchors=[]){
  if(!selection?.uid)return [];
  if(selection.trace_type!=='map')return [selection];
  const byKey=new Map((anchors||[]).map(row=>
    [String(row.source_scope||'')+':'+String(row.uid||''),row]));
  return (selection.anchor_uids||[]).map(uid=>
    byKey.get(String(selection.source_scope||'')+':'+String(uid))).filter(Boolean);
}
export function traceArticleIds(selection,anchors=[]){
  return [...new Set(selectedAnchors(selection,anchors)
    .map(row=>shortId(row.uid)).filter(Boolean))].slice(0,80);
}
export function traceArticleLabels(selection,anchors=[]){
  return new Map(selectedAnchors(selection,anchors)
    .filter(row=>shortId(row.uid))
    .map(row=>[shortId(row.trace_id),String(row.title||row.uid)]));
}
