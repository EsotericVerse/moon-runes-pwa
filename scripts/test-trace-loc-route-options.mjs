import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicTraceMapChoices} from '../app/modular/features/trace/trace-map-choices.mjs';

const fixture=[
  {uid:'A001',source_scope:'lo3rwang',trace_type:'space_anchor'},
  {uid:'R001',source_scope:'lo3rwang',trace_type:'path',anchor_list:['A001','A002']},
  {uid:'T001',source_scope:'lo3rwang',trace_type:'trace',
    route_list:{routes:['R001'],segments:[['A002','A003']]},anchor_list:['A002','A003']},
  {uid:'R001',source_scope:'lrunes',trace_type:'path',anchor_list:['B001','B002']},
  {uid:'X001',source_scope:'lrunes',trace_type:'space_anchor'}
];

test('LOC shows exactly one read-only trace union per populated source, never raw route choices',()=>{
  const choices=publicTraceMapChoices(fixture,'loc');
  assert.deepEqual(choices.map(row=>row.source_scope+':'+row.uid),[
    'lo3rwang:LOC_UNION','lrunes:LOC_UNION'
  ]);
  assert.ok(choices.every(row=>row.trace_type==='trace'&&row.read_only));
  assert.deepEqual(choices[0].route_list.routes,['R001']);
  assert.deepEqual(choices[0].route_list.segments,[['A002','A003']]);
  assert.deepEqual(choices[1].route_list.routes,['R001']);
});

test('a saved route appears in LOC even when no standalone trace group is stored',()=>{
  const rows=publicTraceMapChoices(fixture.filter(row=>row.trace_type!=='trace'),'loc');
  assert.equal(rows.length,2);
  assert.deepEqual(rows[0].route_list.routes,['R001']);
  assert.deepEqual(publicTraceMapChoices([], 'loc'),[]);
});

test('individual scopes retain their actual saved route and trace choices',()=>{
  assert.deepEqual(publicTraceMapChoices(fixture,'lo3rwang').map(row=>row.uid),['R001','T001']);
  assert.deepEqual(publicTraceMapChoices(fixture,'lrunes').map(row=>row.uid),['R001']);
});

test('LOC public selector lists only trace unions, while map loads referenced real routes',()=>{
  const source=readFileSync(new URL('../app/modular/features/Trace.jsx',import.meta.url),'utf8');
  assert.match(source,/const maps=publicTraceMapChoices\(allMaps,scopeId\)/);
  assert.match(source,/目前顯示（痕跡圖聯集）/);
  assert.doesNotMatch(source,/\['trace','path'\]\.map\(type=>/);
  assert.match(source,/readCurrentTraceAnchors\(periodScopeId,members,/);
  assert.match(source,/maps:showingAll\?maps:\[currentMap,\.\.\.linkedRoutes\]/);
  assert.match(source,/selectedRouteUid=\{twoPointDemo\?/);
});
