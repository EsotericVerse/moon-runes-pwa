import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSpaceGraph} from '../app/modular/features/trace/space-graph.mjs';
import {spaceGraphGeojson} from '../app/modular/features/trace/space-graph-geojson.mjs';
import {traceArticleIds} from '../app/modular/features/trace/trace-article-ids.mjs';

const scope='lo3rwang';
const anchors=['A001','B002','C003','E005','Z026','K011'].map((uid,i)=>({
  uid,source_scope:scope,trace_type:'space_anchor',title:uid,address:[120+i*.1,23+i*.1]
}));
test('road Queue connects only adjacent ordered stops',()=>{
  const road={uid:'R001',source_scope:scope,trace_type:'space_period',
    anchor_list:['A001','B002','C003']};
  const graph=resolveSpaceGraph(road,anchors,{scopeId:scope});
  assert.deepEqual(graph.lines.map(edge=>[edge.from,edge.to]),
    [['A001','B002'],['B002','C003']]);
  assert.deepEqual(traceArticleIds(road,anchors),['A001','B002','C003']);
});
test('disjoint trace segments are independent and share endpoints',()=>{
  const trace={uid:'T001',source_scope:scope,trace_type:'space_trace',
    anchor_list:[['A001','B002'],['B002','C003'],['A001','E005'],['Z026','K011']]};
  const graph=resolveSpaceGraph(trace,anchors,{scopeId:scope});
  assert.deepEqual(graph.lines.map(edge=>[edge.from,edge.to]),trace.anchor_list);
  assert.equal(graph.missing.length,0);
  assert.equal(graph.points.length,6);
  assert.deepEqual(traceArticleIds(trace,anchors),
    ['A001','B002','C003','E005','Z026','K011']);
  const geojson=spaceGraphGeojson(trace,anchors,{scopeId:scope});
  assert.equal(geojson.features.filter(feature=>feature.geometry.type==='LineString').length,4);
  assert.equal(geojson.features.filter(feature=>feature.geometry.type==='Point').length,6);
});
test('missing coordinates do not invent lines and never erase semantic points',()=>{
  const trace={uid:'T001',source_scope:scope,trace_type:'space_trace',
    anchor_list:[['A001','B002'],['Z026','K011']]};
  const places=anchors.map(row=>row.uid==='K011'?{...row,address:null}:row);
  const graph=resolveSpaceGraph(trace,places,{scopeId:scope});
  assert.equal(graph.lines.length,2);
  assert.equal(graph.points.length,4);
  assert.equal(spaceGraphGeojson(trace,places,{scopeId:scope}).features
    .filter(feature=>feature.geometry.type==='LineString').length,1);
});
test('cross-scope anchors cannot be implicitly linked',()=>{
  const trace={uid:'T001',source_scope:scope,trace_type:'space_trace',
    anchor_list:[['A001','B002'],['Z026','K011']]};
  const places=anchors.map(row=>row.uid==='K011'?{...row,source_scope:'lrunes'}:row);
  const graph=resolveSpaceGraph(trace,places,{scopeId:scope});
  assert.deepEqual(graph.lines.map(e=>[e.from,e.to]),[['A001','B002']]);
  assert.deepEqual(graph.missing,['K011']);
});

test('article IDs preserve case-sensitive four-character identity',()=>{
  const selected={uid:'R009',source_scope:scope,trace_type:'space_period',
    anchor_list:['A001','a001']};
  const rows=[...anchors,{uid:'a001',source_scope:scope,trace_type:'space_anchor'}];
  assert.deepEqual(traceArticleIds(selected,rows),['A001','a001']);
});
