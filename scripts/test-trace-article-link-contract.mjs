import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const links=read('supabase/migrations/20261026191000_article_links_single_trace_uid.sql');
const identity=read('supabase/migrations/20261026190000_single_trace_uid_cutover.sql');

test('all existing historical anchors survive article-place linking; no 100-place cutoff',()=>{
  assert.doesNotMatch(links,/IF\s+affected\s*>=\s*100/);
  assert.doesNotMatch(links,/請先整理現有空間定錨點至 100 筆以下/);
  assert.match(links,/WHEN names\.n=1 THEN names\.id/);
  assert.match(links,/WHERE g\.place_id IS NULL/);
});
test('automatic match is Scope-constrained and approved alias requires real Scope anchor',()=>{
  assert.match(links,/silver\.can_manage_scope\(p_scope_id\)/);
  assert.match(links,/approved\.trace_type='anchor'/);
  assert.match(links,/approved\.uid=alias\.anchor_uid/);
  assert.match(links,/alias\.scope_id=\$1/);
});
test('new four-character identities accept case-sensitive Base62 while old snapshot is protected',()=>{
  assert.equal((identity.match(/CHECK\(uid ~ '\^\[A-Za-z0-9\]\{4\}\$'\)/g)||[]).length,3);
  assert.match(identity,/trace_uid_migration_backup/);
  assert.match(identity,/original_record jsonb/);
});
