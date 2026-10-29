import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Dynamic PL/pgSQL accepts stale columns when created, but fails on query.
test('Keywords SQL readers filter canonical Galaxy site',()=>{
  for(const migration of [
    '20261029223600_keyword_uidlist_fallback_counts.sql',
    '20261029226000_trace_keyword_uid_groups.sql',
    '20261029226100_keyword_tree_readers.sql'
  ]){
    const source=readFileSync(new URL('../supabase/migrations/'+migration,import.meta.url),'utf8');
    assert.doesNotMatch(source,/\bsource_name\b/);
    assert.match(source,/\b(?:article|g)\.site\s*=\s*\$[45]/);
  }
});
