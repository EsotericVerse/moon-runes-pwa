// One physical SQL table per Scope. Never merge query-history or another Scope.
export const SEARCH_TERM_LIMIT=2048;
const SCOPE_ID=/^[a-z][a-z0-9]{0,14}$/;

export function scopeSearchTermsTable(scopeId){
  const id=String(scopeId||'').trim();
  if(!SCOPE_ID.test(id)||id==='admin')throw new Error('Invalid Search Scope');
  return 'silver.'+id+'_search_terms';
}

export function rankScopeSearchSuggestions(index,terms,query,limit=8){
  const q=String(query||'').normalize('NFKC').trim();
  if(!q||!index||!Array.isArray(terms))return [];
  const matched=index.search(q,{suggest:true,limit:Math.max(limit*4,32)});
  const seen=new Set();
  const points={keyword:100,hashtag:75,title:50,media:40,source:10};
  return matched.map(id=>terms[Number(id)]).filter(row=>{
    if(!row?.term||row.term_kind==='place'||seen.has(row.term))return false;
    seen.add(row.term);
    return true;
  }).sort((a,b)=>{
    const aScore=(points[a.term_kind]||0)+Math.log2(1+Math.max(0,Number(a.document_count)||0))*4;
    const bScore=(points[b.term_kind]||0)+Math.log2(1+Math.max(0,Number(b.document_count)||0))*4;
    return bScore-aScore||a.term.length-b.term.length||a.term.localeCompare(b.term);
  }).slice(0,limit).map(row=>row.term);
}
