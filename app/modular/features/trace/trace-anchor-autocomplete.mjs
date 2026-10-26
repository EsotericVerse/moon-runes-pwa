// Search existing Scope-owned anchors by name, with no county or floor prerequisite.
// Selection is explicit even when one suggestion remains.
export function traceAnchorSuggestions(anchors=[],query='',selectedUids=[],limit=8){
  const terms=String(query||'').trim().normalize('NFKC').toLocaleLowerCase('zh-Hant')
    .split(/\s+/).filter(Boolean);
  if(!terms.length)return [];
  const taken=new Set(selectedUids),output=[];
  for(const item of anchors){
    if(item.trace_type!=='space_anchor'||taken.has(item.uid))continue;
    const note=typeof item.description==='string'?item.description
      :String(item.description?.text||'');
    const address=typeof item.address==='string'?item.address
      :String(item.postal_address||item.description?.address||'');
    const combined=[item.title,item.uid,address,note].join(' ').normalize('NFKC')
      .toLocaleLowerCase('zh-Hant');
    if(!terms.every(word=>combined.includes(word)))continue;
    output.push(item);
    if(output.length>=Math.min(100,Math.max(1,Number(limit)||8)))break;
  }
  return output;
}
export function traceAnchorCompletionUid(matches=[],choiceUid=''){
  return choiceUid&&matches.some(item=>item.uid===choiceUid)?choiceUid:'';
}
