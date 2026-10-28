import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicTraceMapChoices} from '../app/modular/features/trace/trace-map-choices.mjs';

const fixture=[
  {uid:'A001',source_scope:'lo3rwang',trace_type:'space_anchor'},
  {uid:'R001',source_scope:'lo3rwang',trace_type:'space_period',anchor_list:['A001','A002']},
  {uid:'T001',source_scope:'lo3rwang',trace_type:'space_trace',anchor_list:[['A001','A002']]},
  {uid:'R001',source_scope:'lrunes',trace_type:'space_period',anchor_list:['B001','B002']},
  {uid:'X001',source_scope:'lrunes',trace_type:'space_anchor'}
];

test('LOC public trace index exposes saved routes and traces from both scopes, not anchors',()=>{
  const choices=publicTraceMapChoices(fixture,'loc');
  assert.deepEqual(choices.map(row=>row.source_scope+':'+row.uid),[
    'lo3rwang:R001','lo3rwang:T001','lrunes:R001'
  ]);
  assert.equal(choices.filter(row=>row.trace_type==='space_period').length,2);
});

test('individual scope selection retains its scope and both map types',()=>{
  assert.deepEqual(publicTraceMapChoices(fixture,'lo3rwang').map(row=>row.uid),['R001','T001']);
  assert.deepEqual(publicTraceMapChoices(fixture,'lrunes').map(row=>row.uid),['R001']);
});

test('public LOC Trace shows separate route / trace choices and selects route map by scope',()=>{
  const source=readFileSync(new URL('../app/modular/features/Trace.jsx',import.meta.url),'utf8');
  assert.match(source,/const maps=publicTraceMapChoices\(allMaps,scopeId\)/);
  assert.match(source,/\['space_trace','space_period'\]\.map\(type=>/);
  assert.match(source,/type==='space_trace'\?'痕跡圖':'路線圖'/);
  assert.match(source,/const mapChoiceKey=row=>isLoc\?row\.source_scope\+':'\+row\.uid:row\.uid/);
  assert.match(source,/readCurrentTraceAnchors\(periodScopeId,members,/);
  assert.match(source,/maps:showingAll\?maps:\[currentMap,\.\.\.linkedRoutes\]/);
  assert.match(source,/selectedRouteUid=\{twoPointDemo\?/);
});
