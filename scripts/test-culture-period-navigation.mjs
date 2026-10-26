import test from 'node:test';
import assert from 'node:assert/strict';
import {structurePeriodPreference} from '../app/loc/culture-period-navigation.mjs';
const anchor=date=>({entry_type:'anchor',start_date:date});
const trace=(uid,ranges)=>({uid,period:uid,ranges});
const range=(start,end=start)=>({start_date:start,end_date:end});
test('nearest trace uses real endpoint distance, not UID or current flag',()=>{
 const a=trace('T100',[range('2000-01-01','2000-02-01')]);
 const b=trace('T001',[range('2026-01-01','2026-06-01')]);
 assert.equal(structurePeriodPreference([a,b],[anchor('2026-01-01')],'2026-07-01').preferredKey,'T001');
});
test('disconnected trace gap does not count as inside the trace',()=>{
 const split=trace('T001',[range('2026-01-01','2026-01-05'),range('2026-10-01','2026-10-05')]);
 const other=trace('T002',[range('2026-06-01','2026-06-08')]);
 assert.equal(structurePeriodPreference([split,other],[],'2026-06-03').preferredKey,'T002');
});
test('single-anchor trace can be selected by proximity',()=>{
 assert.equal(structurePeriodPreference([
  trace('T001',[range('2026-02-14')]),
  trace('T002',[range('2026-02-15')])
 ],[],'2026-02-16').preferredKey,'T002');
});
test('independent latest anchor does not create a virtual after-period',()=>{
 const result=structurePeriodPreference([trace('T001',[range('2020-01-01')])],
  [anchor('2026-10-06')],'2026-10-27');
 assert.equal(result.preferredKey,'T001');
 assert.equal(result.lastAnchor.start_date,'2026-10-06');
});
test('no valid trace remains an all/empty state',()=>{
 assert.equal(structurePeriodPreference([], [anchor('2026-10-06')],'2026-10-27').preferredKey,'all');
});
test('tie chooses the more recent real endpoint',()=>{
 assert.equal(structurePeriodPreference([
  trace('T001',[range('2026-10-01')]),trace('T002',[range('2026-10-03')])
 ],[],'2026-10-02').preferredKey,'T002');
});
