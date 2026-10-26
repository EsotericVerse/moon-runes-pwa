import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../app/styles/settings-select.css',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261026180500_galaxy_scope_place_id_nullable.sql',import.meta.url),'utf8');

test('anchor management uses available container space, never a forced desktop sidebar',()=>{
  assert.match(css,/\.scope-management-layout\s*\{\s*container-type:inline-size;/);
  assert.match(css,/@container \(max-width: 62rem\)/);
  assert.match(css,/\.scope-management-layout \.management-workspace\s*\{\s*grid-template-columns:minmax\(0,1fr\);/);
  assert.match(css,/\.scope-management-layout \.management-section-nav__items\s*\{\s*display:flex;/);
  assert.match(css,/@container \(max-width: 39rem\)/);
  assert.match(css,/\.scope-management-layout \.management-workspace-panel \.scope-management-fields,/);
  assert.match(css,/\.scope-management-layout \.management-workspace-panel :is\(input,select,textarea\)/);
  assert.match(css,/overflow-wrap:anywhere/);
});
test('Galaxy place links are nullable, 4-char and scoped with indexes',()=>{
  for(const table of ['lo3rwang','lrunes']){
    assert.match(sql,new RegExp('ALTER TABLE silver\\.'+table+'_galaxy ADD COLUMN IF NOT EXISTS place_id varchar\\(4\\)'));
    assert.match(sql,new RegExp('CREATE INDEX IF NOT EXISTS '+table+'_galaxy_place_id_idx'));
  }
  assert.doesNotMatch(sql,/UPDATE\s+silver\.|DELETE\s+FROM\s+silver\.|LEFT\s*\(\s*uid/i);
  assert.doesNotMatch(sql,/ALTER TABLE [^;]+_trace/);
});
