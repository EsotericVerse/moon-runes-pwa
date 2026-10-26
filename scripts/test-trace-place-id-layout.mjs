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

import {traceArticleIds,traceArticleLabels} from '../app/modular/features/trace/trace-article-ids.mjs';
import {traceArticleIdFilters,groupedTraceDays} from '../app/modular/features/trace/trace-panel-filters.mjs';

test('Trace article join preserves object UID but reads only four-character place_id',()=>{
  const stops=[
    {uid:'AAAAAAAA',source_scope:'lo3rwang',trace_id:'0001',title:'一樓',source_place:'old'},
    {uid:'BBBBBBBB',source_scope:'lo3rwang',trace_id:'0002',title:'二樓'},
    {uid:'CCCCCCCC',source_scope:'lrunes',trace_id:'0003',title:'別人 Scope'}
  ];
  assert.deepEqual(traceArticleIds(stops[0],stops),['0001']);
  assert.deepEqual(traceArticleIds({uid:'MAP88888',source_scope:'lo3rwang',
    trace_type:'map',anchor_uids:['BBBBBBBB','AAAAAAAA','CCCCCCCC']},stops),['0002','0001']);
  assert.equal(traceArticleLabels(stops[0]).get('0001'),'一樓');
  assert.deepEqual(traceArticleIdFilters(['0001']),[
    {column:'place_id',operator:'eq',value:'0001'},
    {column:'searchable',operator:'eq',value:true}
  ]);
  assert.deepEqual(traceArticleIdFilters(['0001','0002'])[0],
    {column:'place_id',operator:'in',value:['0001','0002']});
  assert.equal(traceArticleIdFilters(['AAAAAAAA'])[0].value,'__NO_PLACE_ID__');
  assert.deepEqual(groupedTraceDays([
    {createtime:'2026-01-01T09:00:00+08:00',place_id:'0001',source_place:'舊名稱'},
    {createtime:'2026-01-01T10:00:00+08:00',place_id:'0001',source_place:'新名稱'}
  ],{key:'place_id'}),[{day:'2026-01-01',category:'0001',item_count:2}]);
});
test('Trace report uses indexed IDs for all three view modes, never fuzzy place matching',()=>{
  const source=readFileSync(new URL('../app/modular/features/trace/TracePlaceResults.jsx',import.meta.url),'utf8');
  assert.match(source,/traceArticleIdFilters\(placeIds/);
  assert.match(source,/read_trace_place_density/);
  assert.match(source,/columns:'uid,title,createtime,source_name,source_place,place_id,url'/);
  assert.doesNotMatch(source,/traceArticlePlaces\(/);
  assert.doesNotMatch(source,/traceArticleFilters\(sourcePlaces/);
});
