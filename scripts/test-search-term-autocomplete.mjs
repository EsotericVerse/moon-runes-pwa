import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scopeSearchTermsTable,rankScopeSearchSuggestions,SEARCH_TERM_LIMIT} from '../app/loc/search-terms-model.mjs';
import {Index,Charset} from 'flexsearch';

const terms=[
  {term:'板橋車站',term_kind:'place',document_count:120},
  {term:'板橋旅行',term_kind:'title',document_count:18},
  {term:'台北散步',term_kind:'title',document_count:200},
  {term:'北部旅行',term_kind:'hashtag',document_count:11},
  {term:'Hip-Hop',term_kind:'keyword',document_count:3},
  {term:'京都旅行',term_kind:'title',document_count:2},
];
test('per-Scope physical term tables cannot alias or traverse another scope',()=>{
  assert.equal(scopeSearchTermsTable('lo3rwang'),'silver.lo3rwang_search_terms');
  assert.equal(scopeSearchTermsTable('lrunes'),'silver.lrunes_search_terms');
  assert.equal(scopeSearchTermsTable('loc'),'silver.loc_search_terms');
  assert.notEqual(scopeSearchTermsTable('loc'),scopeSearchTermsTable('lo3rwang'));
  for(const bad of ['', 'admin','lo3rwang;DROP','../lo3rwang','x'.repeat(30)])
    assert.throws(()=>scopeSearchTermsTable(bad),/Invalid Search Scope/);
  assert.equal(SEARCH_TERM_LIMIT,2048);
});
test('FlexSearch provides bounded local Chinese/English completions without SQL',()=>{
  const idx=new Index({tokenize:'forward',encoder:Charset.CJK});
  terms.forEach((row,id)=>idx.add(id,row.term));
  assert.deepEqual(rankScopeSearchSuggestions(idx,terms,'板橋',8),['板橋旅行']);
  assert.ok(!rankScopeSearchSuggestions(idx,terms,'板橋',8).includes('板橋車站'),'stale check-in places cannot be suggested');
  assert.deepEqual(rankScopeSearchSuggestions(idx,terms,'',8),[]);
  assert.ok(rankScopeSearchSuggestions(idx,terms,'Hip',8).includes('Hip-Hop'));
  assert.ok(rankScopeSearchSuggestions(idx,terms,'京都',8).includes('京都旅行'));
  assert.equal(rankScopeSearchSuggestions(idx,terms,'板橋',1).length,1);
});
test('the UI does not subscribe to keystroke database queries or history tables',()=>{
  const ui=readFileSync(new URL('../app/modular/features/SearchTermAutocomplete.jsx',import.meta.url),'utf8');
  const data=readFileSync(new URL('../app/loc/search-terms-client.mjs',import.meta.url),'utf8');
  assert.match(ui,/loadScopeSearchTerms\(scopeId/);
  assert.match(ui,/\[scopeId\]/);
  assert.doesNotMatch(ui,/loc_search_keywords|localStorage|indexedDB|isr|searchGalaxyRows/i);
  assert.match(data,/_search_terms/);
  assert.doesNotMatch(data,/loc_search_keywords|source_place|\.galaxy|union all/i);
});

test('offline rebuild and runtime autocomplete exclude spatial check-in candidates',()=>{
  const rebuild=readFileSync(new URL('../scripts/sql/rebuild-scope-search-terms.sql',import.meta.url),'utf8');
  const client=readFileSync(new URL('../app/loc/search-terms-client.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(rebuild,/btrim\(source_place\)|'place'::text kind/);
  assert.match(client,/row\.term_kind!==['"]place['"]/);
});

test('batch rebuilding canonicalizes title families and rejects platform activity templates',()=>{
  const rebuild=readFileSync(new URL('../scripts/sql/rebuild-scope-search-terms.sql',import.meta.url),'utf8');
  assert.match(rebuild,/having count\(distinct uid\)>=3/i);
  assert.match(rebuild,/Wang Oscar/);
  assert.match(rebuild,/split_part\(regexp_replace\(btrim\(title\)/);
  assert.match(rebuild,/group by regexp_replace\(lower\(btrim\(term\)\)/);
  assert.match(rebuild,/count\(distinct g\.uid\)/);
  assert.match(rebuild,/0::integer n,'keyword'/);
  assert.doesNotMatch(rebuild,/'place'::text kind|btrim\(source_place\)/);
});
