import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {traceArticleIds,traceArticleLabels} from '../app/modular/features/trace/trace-article-ids.mjs';
import {traceArticleIdFilters,groupedTraceDays} from '../app/modular/features/trace/trace-panel-filters.mjs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const css=read('app/styles/settings-select.css');
const sql=read('supabase/migrations/20261026190000_single_trace_uid_cutover.sql');
const cleanup=read('supabase/migrations/20261026191000_article_links_single_trace_uid.sql');

test('anchor responsive changes do not overwrite shared management tabs',()=>{
  assert.ok(css.includes('container:scope-anchor-form / inline-size'));
  assert.ok(css.includes('@container scope-anchor-form (max-width: 39rem)'));
  assert.ok(css.includes('.scope-management-layout--anchor .management-workspace-panel .scope-management-fields'));
  assert.ok(css.includes('overflow-wrap:anywhere'));
  assert.doesNotMatch(css,/@container \(max-width: 62rem\)/);
});
test('one four-character UID per Trace row; exact lossless archive and Frame Queues',()=>{
  assert.ok(sql.includes('ALTER TABLE silver.lo3rwang_galaxy ADD COLUMN IF NOT EXISTS place_id varchar(4)'));
  assert.ok(sql.includes('ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS place_id varchar(4)'));
  assert.ok(sql.includes('trace_uid_migration_backup'));
  assert.ok(sql.includes('ALTER TABLE silver.lo3rwang_trace ALTER COLUMN uid TYPE varchar(4)'));
  assert.ok(sql.includes('ALTER TABLE silver.lrunes_trace ALTER COLUMN uid TYPE varchar(4)'));
  assert.ok(sql.includes('ALTER TABLE silver.loc_trace ALTER COLUMN uid TYPE varchar(4)'));
  assert.ok(sql.includes('unnest(m.anchor_uids) WITH ORDINALITY'));
  assert.ok(sql.includes('COUNT')||sql.includes('count(*)'));
  assert.doesNotMatch(sql,/UPDATE\s+silver\.(?:lo3rwang|lrunes)_galaxy/i);
  assert.ok(cleanup.includes('ALTER TABLE silver.lo3rwang_trace DROP COLUMN trace_id'));
  assert.ok(cleanup.includes('matched_uid varchar(4)'));
});
test('selected anchor or Frame Queue resolves Galaxy place_id from anchor uid only',()=>{
  const stops=[
    {uid:'0001',source_scope:'lo3rwang',trace_type:'anchor',title:'一樓'},
    {uid:'0002',source_scope:'lo3rwang',trace_type:'anchor',title:'二樓'},
    {uid:'0003',source_scope:'lrunes',trace_type:'anchor',title:'其他 Scope'}
  ];
  assert.deepEqual(traceArticleIds(stops[0],stops),['0001']);
  const frame={uid:'0100',source_scope:'lo3rwang',
    trace_type:'map',anchor_uids:['0002','0001','0003']};
  assert.deepEqual(traceArticleIds(frame,stops),['0002','0001']);
  assert.equal(traceArticleLabels(stops[0]).get('0001'),'一樓');
  assert.deepEqual(traceArticleIdFilters(['0001']),[
    {column:'place_id',operator:'eq',value:'0001'},
    {column:'searchable',operator:'eq',value:true}
  ]);
  assert.deepEqual(traceArticleIdFilters(['0001','0002'])[0],
    {column:'place_id',operator:'in',value:['0001','0002']});
  assert.deepEqual(groupedTraceDays([
    {createtime:'2026-01-01T09:00:00+08:00',place_id:'0001',source_place:'舊名稱'},
    {createtime:'2026-01-01T10:00:00+08:00',place_id:'0001',source_place:'新名稱'}
  ],{key:'place_id'}),[{day:'2026-01-01',category:'0001',item_count:2}]);
});
test('Trace report queries indexed place_id in all views, not a place-text OR',()=>{
  const s=read('app/modular/features/trace/TracePlaceResults.jsx');
  assert.ok(s.includes('traceArticleIdFilters(placeIds'));
  assert.ok(s.includes('read_trace_place_density'));
  assert.ok(s.includes("columns:'uid,title,createtime,source_name,source_place,place_id,url'"));
  assert.ok(!s.includes('traceArticlePlaces('));
  assert.ok(!s.includes('traceArticleFilters(sourcePlaces'));
});
