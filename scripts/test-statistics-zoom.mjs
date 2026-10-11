import assert from 'node:assert/strict';
import test from 'node:test';
import {STATISTICS_ZOOM_LEVELS,statisticsZoomLevel,statisticsZoomWindow,statisticsWeekKey} from '../app/modular/modules/statistics/statistics-time-zoom.mjs';
import {dailyCategoryTrend} from '../app/lrunes/daily-analytics-model.mjs';

test('plus narrows observation range, minus widens it, no separate date-unit selector needed',()=>{
  const dates=STATISTICS_ZOOM_LEVELS.map((_,level)=>statisticsZoomWindow(level,'2026-10-11'));
  const width=range=>(Date.parse(range.endDate)-Date.parse(range.startDate))/86400000;
  for(let i=1;i<dates.length;i++)assert.ok(width(dates[i])<width(dates[i-1]),'zoom '+i+' must narrow');
  assert.deepEqual(dates.map(x=>x.bucket),['month','week','week','day','day','day','day']);
  assert.equal(statisticsZoomLevel(-20),0);
  assert.equal(statisticsZoomLevel(100),STATISTICS_ZOOM_LEVELS.length-1);
});

test('calendar month shift clamps month end and leap year',()=>{
  const end=statisticsZoomWindow(3,'2024-03-31');
  assert.equal(end.startDate,'2024-02-29');
  assert.equal(end.endDate,'2024-03-31');
  assert.equal(statisticsZoomWindow(0,'2026-10-11').startDate,'2025-10-11');
});

test('week bucket always starts on Monday across month boundary',()=>{
  assert.equal(statisticsWeekKey('2026-10-01'),'2026-09-28');
  assert.equal(statisticsWeekKey('2026-10-04'),'2026-09-28');
  assert.equal(statisticsWeekKey('2026-10-05'),'2026-10-05');
});

test('daily rune week zoom sums each draw once and preserves zero-count weeks',()=>{
  const rows=[
    {record_date:'2026-10-01',rune_number:1,direction:'正位',phase:'新月'},
    {record_date:'2026-10-02',rune_number:1,direction:'正位',phase:'新月'},
    {record_date:'2026-10-12',rune_number:1,direction:'正位',phase:'新月'}
  ];
  const item={key:'1',label:'一號符文'};
  const values=dailyCategoryTrend(rows,'rune',[item],'week','2026-09-28','2026-10-18');
  assert.deepEqual(values.map(v=>v[item.key]),[2,0,1]);
});
