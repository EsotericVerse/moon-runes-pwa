import assert from 'node:assert/strict';
import {
  encodeTimeSegment,decodeTimeSegments,resolveTimeSegments,
  timeSegmentContainsDate,timePeriodContainsDate,timePeriodSortDate
} from '../app/loc/time-anchor-ranges.mjs';

const anchors=new Map([
  ['A001',{uid:'A001',time_date:'2000-01-01'}],
  ['A002',{uid:'A002',time_date:'2000-02-01'}],
  ['A003',{uid:'A003',time_date:'2000-05-01'}],
  ['A004',{uid:'A004',time_date:'2000-07-01'}]
]);
const ranges=resolveTimeSegments(['A001-A002','A003-A004','A004'],anchors,{today:'2000-08-01'});
assert.equal(ranges.length,3);
assert.deepEqual(ranges.map(r=>r.start_date),['2000-01-01','2000-05-01','2000-07-01']);
assert.equal(timePeriodContainsDate({ranges},'2000-03-01'),false,'the gap may not belong to the period');
assert.equal(timePeriodContainsDate({ranges},'2000-01-20'),true);
assert.equal(timePeriodContainsDate({ranges},'2000-07-01'),true,'singleton period anchor');
assert.equal(timePeriodContainsDate({ranges},'2000-07-02'),false,'singleton does not fabricate an open period');
assert.equal(timePeriodSortDate({ranges}),'2000-01-01');
assert.equal(encodeTimeSegment('A001','A004'),'A001-A004');
assert.deepEqual(decodeTimeSegments(['A001','A002']).map(x=>x.start),['A001','A002']);
assert.deepEqual(decodeTimeSegments(['birthday','military-start'],{legacy:true})[0],{
  start:'birthday',end:'military-start',raw:'birthday,military-start'
});
const changed=new Map(anchors);
changed.set('A001',{uid:'A001',time_date:'1999-12-01'});
assert.equal(resolveTimeSegments(['A001-A002'],changed)[0].start_date,'1999-12-01','anchor edit must move period');
const removed=new Map(anchors);
removed.delete('A002');
const broken=resolveTimeSegments(['A001-A002','A003-A004'],removed);
assert.deepEqual(broken[0].missing_anchor_ids,['A002']);
assert.equal(broken[0].start_date,'2000-01-01');
assert.equal(broken[0].end_date,'2000-01-01','do not synthesize deleted endpoint date');
assert.equal(broken[1].invalid,false,'unaffected range stays valid');
assert.equal(timeSegmentContainsDate(broken[0],'2000-02-01'),false);
assert.equal(resolveTimeSegments(['A004-0'],anchors,{today:'2000-08-01'})[0].open_end,true);
assert.equal(timePeriodContainsDate({ranges:resolveTimeSegments(['A004-0'],anchors)},'2000-08-01',{today:'2000-08-01'}),true);
console.log('time anchor ranges: 17 structural and behavioral assertions passed');
