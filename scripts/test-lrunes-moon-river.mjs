import assert from 'node:assert/strict';
import test from 'node:test';
import {buildContinuousMoonRiver,buildReferencedMoonRiver,hasReferencedDailyRune} from '../app/lrunes/daily-moon-river.mjs';

test('moon lane spans days without rune draws, without gaps or overlapping days',()=>{
  const phases={'2026-10-01':'新月','2026-10-02':'新月','2026-10-03':'上弦','2026-10-04':'上弦','2026-10-05':'滿月'};
  const river=buildContinuousMoonRiver('2026-10-01','2026-10-05',day=>phases[day]);
  assert.deepEqual(river.map(item=>[item.moon_phase,item.start_date,item.end_date]),[
    ['新月','2026-10-01','2026-10-03'],
    ['上弦','2026-10-03','2026-10-05'],
    ['滿月','2026-10-05','2026-10-06']
  ]);
  assert.ok(river.every(row=>row.group_key==='lrunes-real-moon'&&row.group_order===-1));
  assert.ok(river.every(row=>row.entry_type==='real_moon_phase_event'&&!('item_count' in row)));
});

test('calendar bands span days with no individual draw inside a referenced window',()=>{
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

test('real moon events are strictly dependent on cited and populated daily-rune source',()=>{
  const range=['2026-10-01','2026-10-05'];
  const phase=day=>day<'2026-10-03'?'新月':'上弦';
  const daily={scopeId:'lrunes',source:'daily:rune'};
  const other={scopeId:'lo3rwang',source:'galaxy:facebook'};
  assert.equal(hasReferencedDailyRune([other]),false);
  assert.equal(hasReferencedDailyRune([other,daily]),true);

  // No daily-rune lane at all: another source must never summon moon events.
  assert.deepEqual(buildReferencedMoonRiver(...range,[other],phase,5),[]);
  assert.deepEqual(buildReferencedMoonRiver(...range,[{scopeId:'lrunes',source:'galaxy:all'}],phase,5),[]);
  assert.deepEqual(buildReferencedMoonRiver(...range,[{scopeId:'lo3rwang',source:'daily:rune'}],phase,5),[]);
  // A selected but empty daily-rune interval also does not show moon phases.
  assert.deepEqual(buildReferencedMoonRiver(...range,[daily],phase,0),[]);
  assert.deepEqual(buildReferencedMoonRiver(...range,[daily],phase),[]);

  // One or more visible daily records authorize exactly one continuous
  // moon calendar lane, including gaps between draw dates.
  const result=buildReferencedMoonRiver(...range,[other,daily],phase,1);
  assert.deepEqual(result.map(x=>[x.start_date,x.end_date,x.moon_phase]),[
    ['2026-10-01','2026-10-03','新月'],
    ['2026-10-03','2026-10-06','上弦']
  ]);
  assert.equal(new Set(result.map(item=>item.group_key)).size,1);
  assert.equal(result[1].moon_phase_anchor_date,'2026-10-03');
  assert.ok(result.every(item=>item.entry_type==='real_moon_phase_event'));
  assert.deepEqual(buildReferencedMoonRiver(...range,[daily,daily],phase,1),result);
});
