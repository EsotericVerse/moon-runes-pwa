import assert from 'node:assert/strict';
import test from 'node:test';
import {buildContinuousMoonRiver} from '../app/lrunes/daily-moon-river.mjs';

test('moon lane spans days without rune draws, without gaps or overlapping days',()=>{
  const phases={'2026-10-01':'新月','2026-10-02':'新月','2026-10-03':'上弦','2026-10-04':'上弦','2026-10-05':'滿月'};
  const river=buildContinuousMoonRiver('2026-10-01','2026-10-05',day=>phases[day]);
  assert.deepEqual(river.map(item=>[item.moon_phase,item.start_date,item.end_date]),[
    ['新月','2026-10-01','2026-10-03'],
    ['上弦','2026-10-03','2026-10-05'],
    ['滿月','2026-10-05','2026-10-06']
  ]);
  assert.ok(river.every(row=>row.group_key==='lrunes-real-moon'&&row.group_order===-1));
  assert.ok(river.every(row=>row.entry_type==='real_moon_phase'&&!('item_count' in row)));
});

test('phase lane still displays through a window with no draw records',()=>{
  const rows=buildContinuousMoonRiver('2026-01-01','2026-01-03',()=> '下弦');
  assert.equal(rows.length,1);
  assert.equal(rows[0].end_date,'2026-01-04');
  assert.equal(rows[0].moon_phase,'下弦');
});

test('leap day and calendar-year transitions are continuous',()=>{
  const rows=buildContinuousMoonRiver('2024-02-28','2024-03-01',day=>day<'2024-02-29'?'滿月':'下弦');
  assert.equal(rows[0].end_date,'2024-02-29');
  assert.equal(rows[1].start_date,'2024-02-29');
  assert.equal(rows[1].end_date,'2024-03-02');
  const year=buildContinuousMoonRiver('2025-12-31','2026-01-01',()=> '新月');
  assert.equal(year[0].end_date,'2026-01-02');
});

test('invalid and oversized ranges are safely rejected',()=>{
  for(const [from,to] of [['2026-02-30','2026-03-01'],['2026-10-03','2026-10-01'],['','2026-10-01'],['2000-01-01','2026-01-01']])
    assert.deepEqual(buildContinuousMoonRiver(from,to,()=> '新月'),[]);
});
