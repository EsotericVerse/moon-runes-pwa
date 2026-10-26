// Name-based suggestions. County is never required to select an existing anchor.
// UIDs are independent even for duplicate names and coordinates.
export function traceAnchorSuggestions(anchors=[],query='',selectedUids=[],limit=8){
  const cap=limit;
  const terms=String(query||'').trim().normalize('NFKC')
    .toLocaleLowerCase('zh-Hant').split(/\s+/).filter(Boolean);
  if(!terms.length)return [];
  const taken=new Set(selectedUids);
  const output=[];
  for(const anchor of anchors){
    if(!['space_anchor','anchor'].includes(anchor.trace_type)||taken.has(anchor.uid))continue;
    const haystack=[anchor.title,anchor.uid,anchor.postal_address,
      typeof anchor.address==='string'?anchor.address:'',
      typeof anchor.description==='string'?anchor.description:anchor.description?.text]
      .filter(Boolean).join(' ').normalize('NFKC').toLocaleLowerCase('zh-Hant');
    if(!terms.every(term=>haystack.includes(term)))continue;
    output.push(anchor);
    if(output.length>=Math.min(100,Math.max(1,Number(cap)||8)))break;
  }
  return output;
}
export function traceAnchorCompletionUid(matches=[],choiceUid=''){
  return choiceUid&&matches.some(row=>row.uid===choiceUid)?choiceUid:'';
}
