import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeTimeSegment,decodeTimeSegments,resolveTimeSegments,
  timePeriodContainsDate,resolveTimeTrace,timeDateWindows
} from '../app/loc/time-anchor-ranges.mjs';
const anchors=new Map([
 ['A001',{uid:'A001',address:'2000-01-01'}],
 ['A002',{uid:'A002',address:'2000-01-05'}],
 ['A003',{uid:'A003',address:'2000-04-01'}],
 ['A004',{uid:'A004',address:'2000-04-08'}]
]);
test('time_period contains one or two actual anchor UIDs only',()=>{
 assert.deepEqual(encodeTimeSegment('A001'),['A001']);
 assert.deepEqual(encodeTimeSegment('A001','A002'),['A001','A002']);
 assert.throws(()=>encodeTimeSegment('A001','0'),/只能引用/);
 assert.deepEqual(decodeTimeSegments(['A001','A002'])[0].start,'A001');
 assert.equal(decodeTimeSegments(['A001','A002','A003'])[0].malformed,true);
});
test('one anchor draws a point with no virtual-now end',()=>{
 const [r]=resolveTimeSegments(['A001'],anchors);
 assert.equal(r.start_date,'2000-01-01');
 assert.equal(r.end_date,'2000-01-01');
 assert.equal(r.open_end,false);
 assert.equal(r.point,true);
 assert.equal(timePeriodContainsDate({ranges:[r]},'2000-01-02'),false);
});
test('two anchors define only their actual inclusive interval',()=>{
 const [r]=resolveTimeSegments(['A001','A002'],anchors);
 assert.equal(r.start_date,'2000-01-01');
 assert.equal(r.end_date,'2000-01-05');
 assert.equal(r.point,false);
 assert.equal(timePeriodContainsDate({ranges:[r]},'2000-01-05'),true);
});
test('deleted anchor invalidates link, retains genuine remaining point',()=>{
 const remaining=new Map(anchors);remaining.delete('A002');
 const [r]=resolveTimeSegments(['A001','A002'],remaining);
 assert.deepEqual(r.missing_anchor_ids,['A002']);
 assert.equal(r.start_date,'2000-01-01');
 assert.equal(r.end_date,'2000-01-01');
 assert.equal(r.point,true);
 assert.equal(timePeriodContainsDate({ranges:[r]},'2000-01-02'),false);
});
test('two deleted anchors preserve the event record without dates',()=>{
 const [r]=resolveTimeSegments(['A001','A002'],new Map());
 assert.equal(r.start_date,null);
 assert.equal(r.end_date,null);
 assert.equal(r.invalid,true);
});
test('time_trace uses separate events without filling disconnected gaps',()=>{
 const event1={uid:'E001',type:'time_period',ranges:resolveTimeSegments(['A001','A002'],anchors)};
 const event2={uid:'E002',type:'time_period',ranges:resolveTimeSegments(['A003','A004'],anchors)};
 const trace=resolveTimeTrace(['E001','E002'],[event1,event2]);
 assert.equal(timePeriodContainsDate({ranges:trace.ranges},'2000-02-03'),false);
 assert.deepEqual(timeDateWindows(trace.ranges),[
  {startDate:'2000-01-01',endDate:'2000-01-05'},
  {startDate:'2000-04-01',endDate:'2000-04-08'}
 ]);
});
test('overlapping events merge query windows; broken refs remain explicit',()=>{
 const e1={uid:'E001',type:'time_period',ranges:resolveTimeSegments(['A001','A002'],anchors)};
 const e2={uid:'E002',type:'time_period',ranges:resolveTimeSegments(['A001','A003'],anchors)};
 const trace=resolveTimeTrace(['E001','DEAD','E002'],[e1,e2]);
 assert.deepEqual(trace.invalidLinks,['DEAD']);
 assert.deepEqual(timeDateWindows(trace.ranges),[{startDate:'2000-01-01',endDate:'2000-04-01'}]);
});
test('moving a real anchor changes event windows without updating the trace',()=>{
 const revised=new Map(anchors);revised.set('A002',{uid:'A002',address:'2000-01-09'});
 const revisedWindows=timeDateWindows(resolveTimeSegments(['A001','A002'],revised));
 assert.equal(revisedWindows[0].endDate,'2000-01-09');
});
