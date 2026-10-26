'use client';

// Read exactly one Scope's precomputed term table; no cross-Scope aggregate,
// history, ISR, SWR, Service Worker or persisted cache.
import {selectRows} from './db-query.mjs';
import {scopeSearchTermsTable,SEARCH_TERM_LIMIT} from './search-terms-model.mjs';

export async function loadScopeSearchTerms(scopeId,{signal}={}){
  const {rows=[]}=await selectRows(scopeSearchTermsTable(scopeId),{
    columns:'term,document_count,term_kind',
    orders:[{column:'document_count',ascending:false}],
    limit:SEARCH_TERM_LIMIT,signal
  });
  return rows.filter(row=>typeof row.term==='string'&&row.term.trim())
    .slice(0,SEARCH_TERM_LIMIT);
}
