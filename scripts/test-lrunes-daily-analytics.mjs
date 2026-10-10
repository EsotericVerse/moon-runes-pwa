import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeDailyDraws,rankDailyDraws,pageDailyRanking,summarizeDailyDraws,
  DAILY_RUNE_PAGE_SIZE
} from '../app/lrunes/daily-analytics-model.mjs';

const draws=normalizeDailyDraws([
  {record_date:'2026-10-01',draw_kind:'main',rune_number:9,rune_name:'向',direction:'正位',recorded_phase:'新月'},
  {record_date:'2026-10-01',draw_kind:'supplement',rune_number:9,rune_name:'向',direction:'正位',recorded_phase:'滿月'},
  {record_date:'2026-10-02',draw_kind:'history_1',rune_number:9,rune_name:'向',direction:'逆位',recorded_phase:null},
  {record_date:'2026-10-03',draw_kind:'main',rune_number:24,rune_name:'韻',direction:'正位',recorded_phase:'新月'}
],()=> '上弦');

test('only rune mode combines directions and lunar phases',()=>{
  const ranked=rankDailyDraws(draws,'rune');
  assert.equal(ranked.length,2);
  assert.equal(ranked[0].label,'向');
  assert.equal(ranked[0].count,3);
  assert.equal(ranked[0].ratio,75);
});

test('three-dimensional mode keeps rune, direction, and date moon phase distinct',()=>{
  const ranked=rankDailyDraws(draws,'triple');
  assert.equal(ranked.length,4);
  assert.ok(ranked.some(row=>row.label==='向 · 正位 · 新月'));
  assert.ok(ranked.some(row=>row.label==='向 · 正位 · 滿月'));
  assert.ok(ranked.some(row=>row.label==='向 · 逆位 · 上弦'));
  assert.ok(draws.find(row=>row.draw_kind==='history_1').phase_inferred);
});

test('day count differs from draw count; historic rows are not coerced to supplement',()=>{
  const s=summarizeDailyDraws(draws);
  assert.equal(s.recordCount,4);
  assert.equal(s.dayCount,3);
  assert.equal(s.drawKinds.find(row=>row.kind==='history_1').count,1);
});

test('ranking never exposes a full list in one page',()=>{
  const items=Array.from({length:66},(_,index)=>({
    key:String(index),label:String(index),count:1,ratio:100/66,rune_number:index+1
  }));
  const first=pageDailyRanking(items);
  assert.equal(first.rows.length,DAILY_RUNE_PAGE_SIZE);
  assert.equal(first.totalPages,4);
  const final=pageDailyRanking(items,100);
  assert.equal(final.currentPage,4);
  assert.equal(final.rows.length,6);
  assert.ok(pageDailyRanking(items,1,1000).rows.length<=DAILY_RUNE_PAGE_SIZE);
});
