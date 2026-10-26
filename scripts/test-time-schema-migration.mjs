import test from 'node:test';
import assert from 'node:assert/strict';
import {convertLegacyTimeRows} from '../app/loc/time-schema-migration.mjs';

const legacy=[
  {record_id:'uuid-1',record_type:'anchor',resource_id:'birthday',label:'生日',time_date:'1980-06-23',note:'原始定錨點'},
  {record_id:'uuid-2',record_type:'anchor',resource_id:'military-start',label:'當兵',time_date:'2003-12-16'},
  {record_id:'uuid-3',record_type:'anchor',resource_id:'military-end',label:'退伍',time_date:'2005-07-01'},
  {record_id:'uuid-4',record_type:'period',resource_id:'P1',label:'學生時代',anchor_ids:['birthday','military-start']},
  {record_id:'uuid-5',record_type:'period',resource_id:'P2',label:'現行',anchor_ids:['military-end','0']},
  {record_id:'uuid-6',record_type:'event',resource_id:'events',label:'多時間事件',anchor_ids:['birthday','military-start','military-end']},
  {record_id:'uuid-7',record_type:'style_comment',resource_id:'style1',label:'歷史風格',style_description:'必須保留備份'}
];
test('all Time identities use one unique four-character uid',()=>{
  const {rows,archive}=convertLegacyTimeRows(legacy);
  assert.equal(rows.length,8);
  assert.equal(archive.length,7);
  assert.equal(new Set(archive.map(x=>x.migrated_uid)).size,7);
  assert.ok(rows.every(row=>/^[0-9A-F]{4}$/.test(row.uid)));
  assert.equal(new Set(rows.map(x=>x.uid)).size,8);
  assert.ok(rows.every(row=>!('resource_id' in row)&&!('record_id' in row)));
});
test('legacy period becomes time_trace and its original boundary becomes a real time_period',()=>{
  const {rows}=convertLegacyTimeRows(legacy);
  const [a,b,c]=rows.filter(x=>x.type==='anchor');
  const [trace1,trace2]=rows.filter(x=>x.type==='time_trace');
  const boundaryEvents=rows.filter(x=>x.type==='time_period'&&x.status==='legacy_boundary');
  const [event]=rows.filter(x=>x.type==='time_period'&&x.status!=='legacy_boundary');
  assert.equal(boundaryEvents.length,2);
  assert.deepEqual(trace1.anchor_ids,[boundaryEvents[0].uid]);
  assert.deepEqual(trace2.anchor_ids,[boundaryEvents[1].uid]);
  assert.deepEqual(boundaryEvents[0].anchor_ids,[a.uid+'-'+b.uid]);
  assert.deepEqual(boundaryEvents[1].anchor_ids,[c.uid+'-0']);
  assert.deepEqual(event.anchor_ids,[a.uid+'-'+b.uid,b.uid+'-'+c.uid]);
  assert.equal(trace1.address,null,'time traces do not own independent dates');
  assert.equal(a.address,'1980-06-23');
});
test('archived labels survive feature removal without becoming live time rows',()=>{
  const {rows,archive}=convertLegacyTimeRows(legacy);
  assert.ok(!rows.some(row=>row.type==='style_comment'));
  assert.equal(archive.find(row=>row.record_type==='style_comment').style_description,'必須保留備份');
});
test('unresolved historical anchor reference blocks migration instead of inventing time',()=>{
  assert.throws(()=>convertLegacyTimeRows([
    legacy[0],{record_type:'period',resource_id:'P1',label:'危險',anchor_ids:['birthday','unlisted']}
  ]),/不存在的定錨點/);
});
