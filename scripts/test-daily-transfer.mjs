import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_TRANSFER_FORMAT,DAILY_TRANSFER_BATCH,normalizeDailyTransferRow,
  makeDailyTransfer,parseDailyTransfer,planDailyTransfer
} from '../app/lrunes/daily-transfer-contract.mjs';
const base={record_date:'2026-10-12',draw_kind:'main',rune_number:32,direction:'正位',recorded_phase:'上弦月'};
test('portable daily backup is lossless and shares an explicit version tag',()=>{
  const pack=makeDailyTransfer([base]);
  assert.equal(pack.format,DAILY_TRANSFER_FORMAT);
  assert.deepEqual(parseDailyTransfer(JSON.stringify(pack)),[base]);
});
test('duplicate and conflicting daily entries never overwrite existing records',()=>{
  const incoming=[base,{...base,record_date:'2026-10-13'}, {...base,record_date:'2026-10-14',rune_number:5}];
  const original=[base,{...base,record_date:'2026-10-14',rune_number:18}];
  const plan=planDailyTransfer(incoming,original);
  assert.equal(plan.total,3);
  assert.equal(plan.newCount,1);
  assert.equal(plan.duplicateCount,1);
  assert.equal(plan.conflictCount,1);
  assert.equal(plan.batches,1);
  assert.equal(plan.fresh[0].record_date,'2026-10-13');
  assert.equal(original[1].rune_number,18);
});
test('invalid encoding surrogate substitute or invalid dates never get silently repaired',()=>{
  for(const date of ['2026-02-30','2026-00-05','2026-13-10','bad']){
    assert.throws(()=>normalizeDailyTransferRow({...base,record_date:date}));
  }
  assert.throws(()=>normalizeDailyTransferRow({...base,rune_number:67}));
  assert.throws(()=>normalizeDailyTransferRow({...base,direction:'fake'}));
});
test('ambiguous same-date daily backup is rejected before writing',()=>{
  assert.throws(()=>makeDailyTransfer([base,{...base,rune_number:16}]),/重複/);
  assert.throws(()=>parseDailyTransfer({format:'unknown',records:[base]}),/只接受/);
});
test('100-row preflight batch plan is deterministic',()=>{
  const source=Array.from({length:290},(_,i)=>({
    record_date:new Date(Date.UTC(2020,0,i+1)).toISOString().slice(0,10),
    draw_kind:'main',rune_number:i%66+1,direction:'正位'
  }));
  const plan=planDailyTransfer(source,[]);
  assert.equal(DAILY_TRANSFER_BATCH,100);
  assert.equal(plan.batches,3);
  assert.equal(plan.newCount,290);
});
