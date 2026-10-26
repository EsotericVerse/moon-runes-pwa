// Galaxy article membership depends only on the selected anchor UID spool.
const shortId=value=>{
  const id=String(value||'').trim().toUpperCase();
  return /^[A-Z0-9]{4}$/.test(id)?id:'';
};
function selectedAnchors(selection,anchors=[]){
  if(!selection?.uid)return [];
  if(selection.trace_type==='space_anchor')return [selection];
  if(!['space_road','space_trace'].includes(selection.trace_type))return [];
  const scope=String(selection.source_scope||selection.scope_id||'');
  const ids=[...new Set((selection.anchor_list||[]).flat(Infinity).map(shortId).filter(Boolean))];
  const byId=new Map(anchors.filter(row=>
    String(row.source_scope||row.scope_id||'')===scope).map(row=>[shortId(row.uid),row]));
  return ids.map(id=>byId.get(id)).filter(Boolean);
}
export function traceArticleIds(selection,anchors=[]){
  return [...new Set(selectedAnchors(selection,anchors).map(row=>shortId(row.uid)).filter(Boolean))];
}
export function traceArticleLabels(selection,anchors=[]){
  return new Map(selectedAnchors(selection,anchors)
    .filter(row=>shortId(row.uid)).map(row=>[shortId(row.uid),String(row.title||row.uid)]));
}
