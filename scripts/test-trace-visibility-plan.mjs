import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planTraceVisibilityUids} from '../app/loc/trace-visibility-plan.mjs';

const maps=[
  {uid:'T001',trace_type:'trace',anchor_list:[['A001','A002']],route_list:['P001','P002']},
  {uid:'T002',trace_type:'trace',anchor_list:[['A003','A004']],route_list:['P002']},
  {uid:'P001',trace_type:'path',anchor_list:['A002','A005'],route_list:[]},
  {uid:'P002',trace_type:'path',anchor_list:['A003','A006'],route_list:[]}
];

test('only selected Trace or Path is updated with self option',()=>{
  assert.deepEqual(planTraceVisibilityUids({maps,selectedUids:['T001'],mode:'self'}),['T001']);
  assert.deepEqual(planTraceVisibilityUids({maps,selectedUids:['P001'],mode:'self'}),['P001']);
});

test('route cascade follows only selected trace route_list',()=>{
  assert.deepEqual(planTraceVisibilityUids({maps,selectedUids:['T001'],mode:'routes'}),['T001','P001','P002']);
  assert.deepEqual(planTraceVisibilityUids({maps,selectedUids:['P001'],mode:'routes'}),['P001']);
});

test('all cascade includes own anchors and linked paths anchors without duplication',()=>{
  const result=planTraceVisibilityUids({maps,selectedUids:['T001'],mode:'all'});
  assert.deepEqual(result,['T001','P001','P002','A001','A002','A003','A005','A006']);
  assert.deepEqual(planTraceVisibilityUids({maps,selectedUids:['P001'],mode:'all'}),['P001','A002','A005']);
});

test('shared paths are updated only when explicitly part of selected cascade',()=>{
  assert.deepEqual(planTraceVisibilityUids({maps,selectedUids:['T002'],mode:'routes'}),['T002','P002']);
  assert.deepEqual(planTraceVisibilityUids({maps,selectedUids:['T002'],mode:'self'}),['T002']);
});

test('missing paths and foreign/invalid selected UIDs reject before write',()=>{
  assert.throws(()=>planTraceVisibilityUids({maps:[maps[0]],selectedUids:['T001'],mode:'routes'}),/未載入/);
  assert.throws(()=>planTraceVisibilityUids({maps,selectedUids:['F999'],mode:'all'}),/不存在/);
  assert.throws(()=>planTraceVisibilityUids({maps,selectedUids:['T001'],mode:'depth=2'}),/無效/);
});

test('UI offers all three modes but persists only invisible 0/1',()=>{
  const manager=readFileSync(new URL('../app/loc/TraceRouteManager.jsx',import.meta.url),'utf8');
  assert.match(manager,/planTraceVisibilityUids\(\{maps:records,selectedUids:bulkSelected,mode:bulkVisibilityMode\}\)/);
  for(const mode of ['self','routes','all'])assert.match(manager,new RegExp('value="'+mode+'"'));
  assert.doesNotMatch(manager,/hidden_depth|hiddenDepth/);
});
