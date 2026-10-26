import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTimeTraceRiver} from '../app/loc/culture-time-trace-river.mjs';

const row=(uid,type,title,start_date,end_date,extra={})=>({
  uid,scope_id:'example',entry_type:type,title,start_date,end_date,
  ...extra
});
const source=[
  row('A001','anchor','第一錨','2026-01-01'),
  row('A002','anchor','第二錨','2026-01-03'),
  row('A003','anchor','第三錨','2026-02-01'),
  row('A004','anchor','第四錨','2026-02-06'),
  row('E001','event','單日事件','2026-01-01',null,{
    ranges:[{start_date:'2026-01-01',end_date:'2026-01-01',
      start_anchor_id:'A001',end_anchor_id:null}]}),
  row('E002','event','二錨事件','2026-02-01','2026-02-06',{
    ranges:[{start_date:'2026-02-01',end_date:'2026-02-06',
      start_anchor_id:'A003',end_anchor_id:'A004'}]}),
  row('E002','event','二錨事件','2026-02-01','2026-02-06',{
    ranges:[{start_date:'2026-02-01',end_date:'2026-02-06',
      start_anchor_id:'A003',end_anchor_id:'A004'}]}),
  row('T001','period','時間痕跡甲','2026-01-01','2026-02-06',{anchor_ids:['E002','E001','GONE']}),
  row('T002','period','時間痕跡乙','2026-02-01','2026-02-06',{anchor_ids:['E002']})
];

test('Y axis shows trace root groups only when collapsed',()=>{
  const data=buildTimeTraceRiver(source);
  assert.deepEqual(data.groups.map(x=>x.label),['時間痕跡甲','時間痕跡乙']);
  assert.ok(data.groups.every(x=>x.collapsible&&!x.expanded));
  assert.deepEqual(data.items.map(x=>x.group_key),
    ['trace:example:T001','trace:example:T001','trace:example:T002']);
  assert.ok(!data.items.some(x=>x.end_date&&x.end_date.includes('now')));
  assert.equal(data.items.find(x=>x.time_period_uid==='E001').end_date,undefined,
    'single-day event must be a point, not a range');
});
test('trace expansion adds ordered event groups and actual endpoints',()=>{
  const data=buildTimeTraceRiver(source,['trace:example:T001']);
  assert.deepEqual(data.groups.map(x=>x.id),[
    'trace:example:T001','trace-event:example:T001:E002',
    'trace-event:example:T001:E001','trace-event:example:T001:GONE',
    'trace:example:T002'
  ]);
  assert.equal(data.items.filter(x=>x.entry_type==='anchor').length,3);
  assert.deepEqual(data.items.filter(x=>x.entry_type==='anchor').map(x=>x.start_date),
    ['2026-02-01','2026-02-06','2026-01-01']);
  assert.equal(data.items.find(x=>x.id.endsWith(':E001:0:period')).end_date,undefined);
});
test('one event can be reused under two traces without merging separated intervals',()=>{
  const data=buildTimeTraceRiver(source,['trace:example:T001','trace:example:T002']);
  assert.equal(data.items.filter(x=>x.entry_type==='anchor'&&x.uid==='A003').length,2);
  assert.equal(data.items.filter(x=>x.entry_type==='event'&&x.time_trace_uid==='T001').length,2);
  assert.equal(data.items.filter(x=>x.time_trace_uid==='T001'&&x.start_date==='2026-01-01'
    &&x.end_date==='2026-02-06').length,0,'gap must not be filled');
});
test('invalid event UID keeps trace group and broken link label without fake anchor',()=>{
  const data=buildTimeTraceRiver(source,['trace:example:T001']);
  assert.ok(data.groups.find(x=>x.label==='事件｜失效連線 GONE'));
  assert.ok(!data.items.some(x=>x.time_period_uid==='GONE'));
});
test('empty trace still appears and can be expanded',()=>{
  const data=buildTimeTraceRiver([row('T003','period','空痕跡',null,null,{anchor_ids:[]})]);
  assert.equal(data.groups.length,1);
  assert.equal(data.items.length,0);
});
