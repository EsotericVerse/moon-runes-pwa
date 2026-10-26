import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveSpaceGraph} from '../app/modular/features/trace/space-graph.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const manager=()=>read('app/loc/TraceRouteManager.jsx');
function saveHarness({fail=false,miss=false,receipt=null}={}){
 const p=manager(),a=p.indexOf('  const save=async event=>{'),b=p.indexOf('  const remove=async row=>{',a);
 assert.ok(a>0&&b>a);
 const expression=p.slice(a,b).trim().replace(/^const save=/,'').replace(/;\s*$/,'');
 const writes=[],messages=[];let saved=receipt,cleared=0;
 const vars={
  busy:false,own:true,editorOpen:true,setBusy:()=>{},setNotice:x=>messages.push(x),setError:()=>{},
  title:'測試路線',type:'space_period',queue:['A001','B002'],MAX_ROAD:80,
  pairs:[],MAX_LINES:400,validPair:()=>true,chosenIds:['A001','B002'],
  anchorMap:new Map([['A001',{}],['B002',{}]]),owner:'lo3rwang',description:'',
  allAnchors:[{uid:'A001',source_scope:'lo3rwang'},{uid:'B002',source_scope:'lo3rwang'}],
  savedReceipt:receipt,editingUid:'',setSavedReceipt:x=>{saved=x;},
  addTraceMap:async input=>{if(fail)throw Error('寫入被拒絕');writes.push(input);return {uid:'R001'};},
  updateTraceMap:async()=>{throw Error('unexpected update');},
  index:{mutate:async()=>miss?[]:[{uid:'R001',trace_type:'space_period',
     title:'測試路線',source_scope:'lo3rwang',anchor_list:['A001','B002']}]},
  clear:()=>{cleared++;},setSelectedUid:()=>{},setEditorOpen:()=>{},setShowMap:()=>{},refresh:async()=>{}
 };
 const keys=Object.keys(vars);
 const save=new Function(...keys,'return ('+expression+');')(...keys.map(k=>vars[k]));
 return {save,writes,messages,get saved(){return saved},get cleared(){return cleared}};
}
test('Frame manager uses React Select and no county gates',()=>{
 const route=manager(),data=read('app/modular/features/trace/trace-data.js');
 assert.match(route,/import Select from 'react-select'/);
 assert.match(route,/readCurrentTraceAnchors\(owner,current\.anchor_list/);
 assert.match(route,/onClick=\{addToSpool\}/);
 assert.doesNotMatch(route,/countyOptions|createReferenceAnchor|readTraceAddressReferences/);
 assert.match(data,/space_period/);
});
test('real handler saves ordered UIDs and confirms database readback',async()=>{
 const h=saveHarness();assert.equal(await h.save(),true);
 assert.equal(h.writes.length,1);assert.equal(h.writes[0].type,'space_period');
 assert.deepEqual(h.writes[0].anchorUids,['A001','B002']);
 assert.equal(h.cleared,1);assert.match(h.messages.at(-1),/重讀確認/);
});
test('write rejected and delayed readback retain draft without duplicate insert',async()=>{
 const fail=saveHarness({fail:true});assert.equal(await fail.save(),false);
 assert.equal(fail.writes.length,0);assert.equal(fail.cleared,0);
 const first=saveHarness({miss:true});assert.equal(await first.save(),false);
 assert.equal(first.writes.length,1);assert.equal(first.cleared,0);
 const retry=saveHarness({receipt:first.saved});assert.equal(await retry.save(),true);
 assert.equal(retry.writes.length,0);
});
test('space_period joins saved stops; space_trace keeps independent pairs',()=>{
 const anchors=['A001','B002','C003'].map((uid,i)=>({
  uid,trace_type:'space_anchor',source_scope:'lo3rwang',address:[120+i,23+i]
 }));
 const base={uid:'R001',source_scope:'lo3rwang'};
 const r=resolveSpaceGraph({...base,trace_type:'space_period',
  anchor_list:['A001','B002','C003']},anchors);
 assert.deepEqual(r.lines.map(x=>[x.from,x.to]),[['A001','B002'],['B002','C003']]);
 const t=resolveSpaceGraph({...base,trace_type:'space_trace',
  anchor_list:[['A001','B002'],['B002','C003']]},anchors);
 assert.deepEqual(t.lines.map(x=>[x.from,x.to]),[['A001','B002'],['B002','C003']]);
});
test('delete targets stored type and UID; EditDock requires true readback',()=>{
 assert.match(manager(),/deleteTraceMap\(\{scopeId:owner,uid:row\.uid,type:row\.trace_type\}\)/);
 assert.match(read('app/modular/features/trace/trace-data.js'),/\.eq\('uid',key\)\.eq\('trace_type',type\)/);
 assert.match(read('app/modular/edit-dock.jsx'),/if\(saved!==true\)throw new Error/);
});
