import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source=readFileSync(new URL('../app/loc/keyword-analysis.js',import.meta.url),'utf8');
const first=source.indexOf('function buildClassMap(');
const last=source.indexOf('\nasync function keywordFingerprint(',first);
assert.ok(first>=0&&last>first);
const buildClassMap=new Function(source.slice(first,last)+'\nreturn buildClassMap;')();

test('Pop Class has sixteen groups ordered by its own order_no',()=>{
  const rows=Array.from({length:16},(_,i)=>({
    class_name:'Pop',class_group:'Group '+(i+1),
    order_no:i+1,keyword_id:i+1,default_keyword_id:0
  })).reverse();
  const map=buildClassMap(rows);
  assert.deepEqual(map.ordered.map(row=>row.group),
    Array.from({length:16},(_,i)=>'Group '+(i+1)));
});
test('Rune66 retains original eight groups and final special Group from data',()=>{
  const names=['靈魂','連結','生命','自然','礦物','元素','秩序','無序'];
  const rows=[
    {class_name:'符文66',class_group:'特殊',keyword_id:0,order_no:0,default_keyword_id:0},
    ...names.map((class_group,i)=>({
      class_name:'符文66',class_group,keyword_id:1+i*8,order_no:1+i*8,
      default_keyword_id:0
    }))
  ];
  const map=buildClassMap(rows,'0');
  assert.deepEqual(map.ordered.map(row=>row.group),[...names,'特殊']);
  assert.equal(map.groupToClassId.get('特殊'),9);
});
test('Groups with Rune66-like labels do not inherit Rune66 order',()=>{
  const rows=[
    {class_name:'Other',class_group:'靈魂',keyword_id:1,order_no:30},
    {class_name:'Other',class_group:'Alpha',keyword_id:2,order_no:1}
  ];
  assert.deepEqual(buildClassMap(rows).ordered.map(row=>row.group),['Alpha','靈魂']);
});
test('Any configured default Group is last without hardcoded names',()=>{
  const rows=[
    {class_name:'Any',class_group:'Fallback',keyword_id:200,order_no:1,default_keyword_id:200},
    {class_name:'Any',class_group:'First',keyword_id:201,order_no:2,default_keyword_id:200}
  ];
  assert.deepEqual(buildClassMap(rows,'200').ordered.map(row=>row.group),['First','Fallback']);
});
test('No fixed Group or Item count is enforced',()=>{
  const rows=Array.from({length:130},(_,i)=>({
    class_name:'Any',class_group:'G'+i,keyword_id:i*3,order_no:i+1
  }));
  assert.equal(buildClassMap(rows).ordered.length,130);
});
test('Disabled Groups do not affect computed ordering',()=>{
  const rows=[
    {class_name:'Any',class_group:'A',order_no:1,class_enable:false},
    {class_name:'Any',class_group:'B',order_no:2}
  ];
  assert.deepEqual(buildClassMap(rows).ordered.map(row=>row.group),['B']);
});
