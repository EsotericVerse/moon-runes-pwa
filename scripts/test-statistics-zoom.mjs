import assert from 'node:assert/strict';
import test from 'node:test';
import {statisticsZoomLevel,statisticsZoomWindow,statisticsWeekKey} from '../app/modular/modules/statistics/statistics-time-zoom.mjs';
import {dailyCategoryTrend} from '../app/lrunes/daily-analytics-model.mjs';

test('default keeps one year; minus reaches earliest actual year, plus narrows',()=>{
  const first='2025-05-31',today='2026-10-11';
  const standard=statisticsZoomWindow(0,today,first);
  assert.equal(standard.startDate,'2025-10-11');
  assert.equal(standard.bucket,'month');
  assert.equal(standard.fullHistory,false);
  assert.equal(standard.canZoomOut,true);
  const all=statisticsZoomWindow(-1,today,first);
  assert.equal(all.startDate,first);
  assert.equal(all.fullHistory,true);
  assert.equal(all.canZoomOut,false);
  assert.equal(all.bucket,'month');
  const close=statisticsZoomWindow(1,today,first);
  assert.ok(close.startDate>standard.startDate);
  assert.equal(close.canZoomIn,true);
});

test('historical bounds are based on actual records, not fixed year presets or ceilings',()=>{
  const wide=statisticsZoomWindow(-9,'2026-10-11','1899-09-15');
  assert.equal(wide.startDate,'1899-09-15');
  assert.equal(wide.canZoomOut,false);
  assert.equal(wide.fullHistory,true);
  assert.equal(statisticsZoomWindow(0,'2026-10-11','2026-08-05').canZoomOut,false);
  assert.equal(statisticsZoomWindow(0,'2026-10-11','').canZoomOut,false);
  assert.equal(statisticsZoomLevel(-5),-5);
  assert.equal(statisticsZoomLevel(3.8),3);
  assert.equal(statisticsZoomWindow(25,'2026-10-11','2025-01-01').canZoomIn,false);
});

test('automatic month/week/day buckets follow zoom, with no separate unit selector',()=>{
  const end='2026-10-11',start='2025-05-31';
  assert.equal(statisticsZoomWindow(0,end,start).bucket,'month');
  assert.equal(statisticsZoomWindow(1,end,start).bucket,'month');
  assert.equal(statisticsZoomWindow(2,end,start).bucket,'week');
  assert.equal(statisticsZoomWindow(4,end,start).bucket,'day');
  assert.equal(statisticsZoomWindow(0,'2024-03-31','2023-01-01').startDate,'2023-03-31');
});

test('week bucket always starts on Monday across month boundary',()=>{
  assert.equal(statisticsWeekKey('2026-10-01'),'2026-09-28');
  assert.equal(statisticsWeekKey('2026-10-04'),'2026-09-28');
  assert.equal(statisticsWeekKey('2026-10-05'),'2026-10-05');
});

test('Daily Rune weekly grouping sums every draw once and preserves empty weeks',()=>{
  const rows=[
    {record_date:'2026-10-01',rune_number:1,direction:'正位',phase:'新月'},
    {record_date:'2026-10-02',rune_number:1,direction:'正位',phase:'新月'},
    {record_date:'2026-10-12',rune_number:1,direction:'正位',phase:'新月'}
  ];
  const item={key:'1',label:'一號符文'};
  const values=dailyCategoryTrend(rows,'rune',[item],'week','2026-09-28','2026-10-18');
  assert.deepEqual(values.map(v=>v[item.key]),[2,0,1]);
});
