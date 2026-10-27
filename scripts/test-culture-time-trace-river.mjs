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

test('collapsed trace roots retain a permanent lane for every saved anchor',()=>{
  const data=buildTimeTraceRiver(source);
  assert.deepEqual(data.groups.map(x=>x.label),['時間痕跡甲','時間痕跡乙']);
  assert.ok(data.groups.every(x=>x.collapsible&&!x.expanded));
  assert.deepEqual(data.items.filter(x=>x.entry_type==='anchor').map(x=>x.uid),
    ['A001','A002','A003','A004','A003','A004']);
  assert.ok(data.items.filter(x=>x.entry_type==='anchor')
    .every(x=>x.group_key.startsWith('trace:example:')&&x.display_label==='●'));
  assert.deepEqual(data.items.filter(x=>x.entry_type==='event').map(x=>x.group_key),
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
  assert.equal(data.items.filter(x=>x.entry_type==='anchor').length,9);
  assert.deepEqual(data.items.filter(x=>x.entry_type==='anchor'&&
    x.group_key.startsWith('trace-event:')).map(x=>x.start_date),
    ['2026-02-01','2026-02-06','2026-01-01']);
  assert.equal(data.items.find(x=>x.id.endsWith(':E001:0:period')).end_date,undefined);
});
test('one event can be reused under two traces without merging separated intervals',()=>{
  const data=buildTimeTraceRiver(source,['trace:example:T001','trace:example:T002']);
  assert.equal(data.items.filter(x=>x.entry_type==='anchor'&&x.uid==='A003').length,4,
    'anchor appears in two traces and their two expanded event rows');
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

test('unlinked dated anchors are visible even when no traces exist',()=>{
  const items=[
    row('FREE','anchor','獨立定錨','2026-08-15'),
    row('BAD','anchor','無日期',null),
  ];
  const data=buildTimeTraceRiver(items);
  assert.deepEqual(data.groups.map(x=>x.id),['time-anchors:example']);
  assert.deepEqual(data.items.map(x=>({uid:x.uid,start:x.start_date,kind:x.entry_type})),[
    {uid:'FREE',start:'2026-08-15',kind:'anchor'}
  ]);
});
test('each Scope has its own permanent anchor lane and stable identifiers',()=>{
  const data=buildTimeTraceRiver([
    row('A001','anchor','甲','2026-01-01'),
    row('A001','anchor','乙','2026-01-02',null,{scope_id:'other'})
  ]);
  assert.deepEqual(data.groups.map(x=>x.label),['example · 定錨點','other · 定錨點']);
  assert.deepEqual(data.items.map(x=>x.id),['time-anchors:example:A001','time-anchors:other:A001']);
});

test('time trace rows retain chronological order instead of moving active periods to the first lane',()=>{
  const data=buildTimeTraceRiver(source);
  assert.deepEqual(data.groups.map(group=>group.id),
    ['trace:example:T001','trace:example:T002']);
  assert.deepEqual(data.items.filter(item=>item.entry_type==='anchor')
    .map(item=>[item.uid,item.group_key]),[
      ['A001','trace:example:T001'],['A002','trace:example:T001'],
      ['A003','trace:example:T001'],['A004','trace:example:T001'],
      ['A003','trace:example:T002'],['A004','trace:example:T002']
    ]);
  assert.ok(data.items.filter(x=>x.entry_type==='anchor')
    .every(x=>x.display_label==='●'));
});
test('disconnected traces never absorb anchors in the gap',()=>{
  const data=buildTimeTraceRiver([
    row('A101','anchor','頭','2026-01-02'),
    row('A102','anchor','空隙','2026-02-01'),
    row('A103','anchor','尾','2026-03-29'),
    row('T009','period','間斷時期','2026-01-01','2026-03-31',{
      ranges:[{start_date:'2026-01-01',end_date:'2026-01-05'},
        {start_date:'2026-03-25',end_date:'2026-03-31'}]})
  ]);
  assert.deepEqual(data.items.filter(x=>x.group_key==='trace:example:T009').map(x=>x.uid),['A101','A103']);
  assert.deepEqual(data.items.filter(x=>x.group_key==='time-anchors:example').map(x=>x.uid),['A102']);
  assert.equal(data.groups.find(x=>x.id==='time-anchors:example')?.label,'未歸屬定錨點');
});
test('invalid trace ranges do not swallow unrelated anchors',()=>{
  const data=buildTimeTraceRiver([
    row('A101','anchor','有效日期','2026-02-01'),
    row('T009','period','失效時期','2026-01-01','2026-03-01',{
      ranges:[{start_date:'2026-01-01',end_date:'2026-03-01',invalid:true,point:false}]})
  ]);
  assert.equal(data.items.find(x=>x.uid==='A101')?.group_key,'time-anchors:example');
});

test('a later time trace cannot move early anchors onto its lane',()=>{
  const data=buildTimeTraceRiver([
    row('A100','anchor','P1 定錨點','1988-01-01'),
    row('A200','anchor','P6 定錨點','2026-07-01'),
    row('T100','period','P1','1980-01-01','2000-01-01'),
    row('T200','period','P6','2026-01-01','2026-10-06')
  ]);
  assert.deepEqual(data.groups.map(x=>x.id),
    ['trace:example:T100','trace:example:T200']);
  assert.equal(data.items.find(x=>x.uid==='A100')?.group_key,'trace:example:T100');
  assert.equal(data.items.find(x=>x.uid==='A200')?.group_key,'trace:example:T200');
});
