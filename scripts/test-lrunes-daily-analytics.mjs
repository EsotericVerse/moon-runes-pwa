import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {
  normalizeDailyDraws,rankDailyDraws,pageDailyRanking,summarizeDailyDraws,
  dailyCategoryTrend,dailyDirectionTrend,DAILY_RUNE_PAGE_SIZE,DAILY_RUNE_MODES
} from '../app/lrunes/daily-analytics-model.mjs';

const draws=normalizeDailyDraws([
  {record_date:'2026-10-01',draw_kind:'main',rune_number:9,rune_name:'向',direction:'正位',recorded_phase:'新月'},
  {record_date:'2026-10-01',draw_kind:'supplement',rune_number:9,rune_name:'向',direction:'正位',recorded_phase:'滿月'},
  {record_date:'2026-10-02',draw_kind:'history_1',rune_number:9,rune_name:'向',direction:'逆位',recorded_phase:null},
  {record_date:'2026-10-03',draw_kind:'main',rune_number:24,rune_name:'韻',direction:'半正位',recorded_phase:'新月'}
],()=> '上弦');

test('statistics expose independent rune counts and direction trend modes',()=>{
  assert.deepEqual(DAILY_RUNE_MODES.map(mode=>mode.value),['rune','direction']);
  const ranked=rankDailyDraws(draws,'rune');
  assert.equal(ranked.length,2);
  assert.equal(ranked[0].label,'向');
  assert.equal(ranked[0].count,3);
  assert.equal(ranked[0].ratio,75);
});

test('rune ranking pagination stays capped',()=>{
  const items=Array.from({length:66},(_,index)=>({
    key:String(index),label:String(index),count:1,ratio:100/66,rune_number:index+1
  }));
  const first=pageDailyRanking(items);
  assert.equal(first.rows.length,DAILY_RUNE_PAGE_SIZE);
  assert.equal(first.totalPages,Math.ceil(items.length/DAILY_RUNE_PAGE_SIZE));
  const final=pageDailyRanking(items,100);
  assert.equal(final.currentPage,Math.ceil(items.length/DAILY_RUNE_PAGE_SIZE));
  assert.equal(final.rows.length,items.length%DAILY_RUNE_PAGE_SIZE);
  assert.ok(pageDailyRanking(items,1,1000).rows.length<=DAILY_RUNE_PAGE_SIZE);
});

test('weekly rune occurrence totals sum all daily draws and fill empty weeks with zero',()=>{
  const rune=rankDailyDraws(draws,'rune').find(row=>row.label==='向');
  const weekly=dailyCategoryTrend(draws,'rune',[rune],'week','2026-10-01','2026-10-11');
  assert.equal(weekly.length,2);
  assert.equal(weekly[0][rune.key],3);
  assert.equal(weekly[1][rune.key],0);
});

test('weekly orientation trend averages signed positions and includes rune labels',()=>{
  const trend=dailyDirectionTrend([
    {record_date:'2026-10-05',direction:'正位',rune_name:'向'},
    {record_date:'2026-10-07',direction:'半正位',rune_name:'韻'},
    {record_date:'2026-10-12',direction:'逆位',rune_name:'界'}
  ],'week','2026-10-05','2026-10-18');
  assert.equal(trend.length,2);
  assert.equal(trend[0].period,'10/05');
  assert.equal(trend[0].recordCount,2);
  assert.equal(trend[0].directionAverage,0.75);
  assert.equal(trend[0].directionLabels,'正位、半正位');
  assert.equal(trend[0].runeLabels,'向 · 韻');
  assert.equal(trend[1].directionAverage,-1);
});

test('direction average maps all four positions to signed values',()=>{
  const trend=dailyDirectionTrend([
    {record_date:'2026-10-05',direction:'正位'},
    {record_date:'2026-10-06',direction:'半正位'},
    {record_date:'2026-10-07',direction:'半逆位'},
    {record_date:'2026-10-08',direction:'逆位'}
  ],'week','2026-10-05','2026-10-11');
  assert.equal(trend[0].directionAverage,0);
});

test('culture panel stays separate from the statistics-only earliest-date query',()=>{
  const source=readFileSync(new URL('../app/lrunes/DailyRuneAnalytics.jsx',import.meta.url),'utf8');
  const beginning=source.indexOf('export function LrunesDailyCulturePanel()');
  const end=source.indexOf('export function LrunesDailyStatisticsPanel()');
  assert.ok(beginning>=0&&end>beginning);
  const culture=source.slice(beginning,end);
  const statistics=source.slice(end);
  assert.doesNotMatch(culture,/\\bearliest\\b/);
  assert.match(statistics,/dailyDirectionTrend\\(draws,zoomRange.bucket/);
  assert.match(statistics,/<ComposedChart data=\\{directionTimeline\\}/);
});
