// Narrow autocomplete for the existing Trace route editor.
// County is an indexed stored ID; station identity is always the anchor UID.
// A visible label or same coordinates must never act as a key.
export function traceAnchorSuggestions(anchors=[],countyId='',query='',selectedUids=[],limit=8){
  const term=String(query||'').trim().normalize('NFKC').toLocaleLowerCase('zh-Hant');
  if(!countyId||!term)return [];
  const taken=new Set(selectedUids);
  const output=[];
  for(const anchor of anchors){
    if(anchor.trace_type!=='anchor'||anchor.county_id!==countyId||taken.has(anchor.uid))continue;
    if(!String(anchor.title||'').normalize('NFKC').toLocaleLowerCase('zh-Hant').includes(term))continue;
    output.push(anchor);
    if(output.length>=limit)break;
  }
  return output;
}
export function traceAnchorCompletionUid(matches=[],choiceUid=''){
  if(choiceUid&&matches.some(row=>row.uid===choiceUid))return choiceUid;
  // Do not pick the first item when multiple businesses have identical names.
  return matches.length===1?matches[0].uid:'';
}
