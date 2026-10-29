import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {RUNE66_GROUP_ORDER} from '../app/loc/model/rune66-keyword-engine.mjs';

const source=readFileSync(new URL('../app/loc/keyword-analysis.js',import.meta.url),'utf8');
const first=source.indexOf('function buildClassMap(');
const last=source.indexOf('\nfunction groupListsOf(',first);
assert.ok(first>=0&&last>first);
const buildClassMap=new Function('RUNE66_GROUP_ORDER',
  source.slice(first,last)+'\nreturn buildClassMap;')(RUNE66_GROUP_ORDER);

test('all sixteen Pop Groups are available without a Rune66 ceiling',()=>{
  const rows=Array.from({length:16},(_,i)=>({class_name:'Pop',class_group:'Group '+i}));
  const map=buildClassMap(rows);
  assert.equal(map.ordered.length,16);
  assert.equal(new Set(map.ordered.map(row=>row.class_id)).size,16);
  assert.equal(Math.max(...map.ordered.map(row=>row.class_id)),16);
});

test('generic Classes do not inherit Rune66 group ordering',()=>{
  const map=buildClassMap([{class_name:'Other',class_group:'靈魂'},
    {class_name:'Other',class_group:'Alpha'}]);
  assert.deepEqual(map.ordered.map(row=>row.group),['Alpha','靈魂']);
});

test('Rune66 retains its established Group order without imposing a limit',()=>{
  const map=buildClassMap(['特殊','連結','靈魂','自訂群組'].map(class_group=>({
    class_name:'符文66',class_group
  })));
  assert.deepEqual(map.ordered.map(row=>row.group),
    ['靈魂','連結','特殊','自訂群組']);
});

test('zero enabled Groups is invalid but there is no arbitrary upper bound',()=>{
  assert.throws(()=>buildClassMap([{class_name:'Pop',class_group:'A',class_enable:false}]));
  const rows=Array.from({length:130},(_,i)=>({class_name:'Pop',class_group:'G'+i}));
  assert.equal(buildClassMap(rows).ordered.length,130);
});
