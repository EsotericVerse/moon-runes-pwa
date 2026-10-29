import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('six-column migration preserves Scope delete and music tree readers',()=>{
  const sql=readFileSync(new URL('../supabase/migrations/20261029226200_keyword_legacy_catalog_cleanup.sql',import.meta.url),'utf8');
  assert.match(sql,/CREATE OR REPLACE FUNCTION api\.delete_scope\(p_scope_id text\)/);
  assert.match(sql,/CREATE OR REPLACE FUNCTION silver\.read_music_style_tree\(\)/);
  assert.match(sql,/jsonb_array_elements_text\(c\.lists\)/);
  assert.match(sql,/jsonb_array_elements_text\(g\.lists\)/);
  assert.match(sql,/DROP TABLE IF EXISTS silver\.keyword_classes;/);
  assert.doesNotMatch(sql,/DELETE FROM silver\.keyword_classes/);
  assert.doesNotMatch(sql,/\bCASCADE\b\s*;/i);
});

test('portable Postgres/Kysely RPC allowlist follows the six-column cutover',()=>{
  const code=readFileSync(new URL('../app/loc/providers/kysely-runtime.mjs',import.meta.url),'utf8');
  assert.match(code,/'silver\.read_keyword_tree_catalog':\[/);
  assert.match(code,/'silver\.read_keyword_tree_summary':\[/);
  assert.match(code,/'silver\.read_trace_keyword_group_totals':\[/);
  assert.match(code,/'silver\.read_music_style_tree':\[\]/);
  for(const name of [
    'apply_keyword_classification','read_keyword_class_by_uid',
    'read_keyword_uidlist_summary','read_keyword_item_catalog',
    'copy_rune66_keyword_class'
  ])assert.doesNotMatch(code,new RegExp("'silver\\."+name+"'"));
});
