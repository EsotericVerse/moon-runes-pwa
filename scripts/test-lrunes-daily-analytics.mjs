import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeDailyDraws,rankDailyDraws,pageDailyRanking,summarizeDailyDraws,dailyCategoryTrend,
  DAILY_RUNE_PAGE_SIZE,DAILY_RUNE_MODES,DAILY_DIRECTIONS,dailyCategoryKey
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

test('trends follow the selected statistical category and fill missing days with zero',()=>{
  const triple=rankDailyDraws(draws,'triple');
  const chosen=triple.find(row=>row.label==='向 · 正位 · 新月');
  const values=dailyCategoryTrend(draws,'triple',[chosen],'day','2026-10-01','2026-10-03');
  assert.equal(values.length,3);
  assert.equal(values[0][chosen.key],1);
  assert.equal(values[1][chosen.key],0);
  assert.equal(values[2][chosen.key],0);
});

test('the four requested independent dimensions are always available in LunaRunes statistics',()=>{
  assert.deepEqual(DAILY_RUNE_MODES.map(mode=>mode.value),['rune','rune_direction','direction','triple']);
  assert.deepEqual(DAILY_RUNE_MODES.map(mode=>mode.label),[
    '符文本體','符文本體 × 位向','位向','符文本體 × 位向 × 真實月相'
  ]);
  assert.deepEqual(DAILY_DIRECTIONS,['正位','半正位','半逆位','逆位']);
});

test('rune and direction mode merges lunar phases but keeps each rune-direction pairing distinct',()=>{
  const ranked=rankDailyDraws(draws,'rune_direction');
  assert.equal(ranked.length,3);
  assert.equal(ranked.reduce((sum,row)=>sum+row.count,0),draws.length);
  assert.deepEqual(
    ranked.map(row=>({key:row.key,label:row.label,count:row.count})),
    [
      {key:'9|正位',label:'向 · 正位',count:2},
      {key:'9|逆位',label:'向 · 逆位',count:1},
      {key:'24|正位',label:'韻 · 正位',count:1}
    ]
  );
  assert.equal(ranked[0].ratio,50);
  assert.equal(dailyCategoryKey(draws[0],'rune_direction'),dailyCategoryKey(draws[1],'rune_direction'));
  assert.notEqual(dailyCategoryKey(draws[1],'triple'),dailyCategoryKey(draws[0],'triple'));
});

test('direction-only ranking covers all four positions including zeros without multiplying draws',()=>{
  const ranked=rankDailyDraws(draws,'direction');
  assert.equal(ranked.length,4);
  assert.equal(ranked.reduce((sum,row)=>sum+row.count,0),draws.length);
  const byDirection=Object.fromEntries(ranked.map(row=>[row.label,[row.count,row.ratio]]));
  assert.deepEqual(byDirection,{
    正位:[3,75],逆位:[1,25],半正位:[0,0],半逆位:[0,0]
  });
  assert.deepEqual(rankDailyDraws([],'direction'),[]);
  assert.equal(dailyCategoryKey(draws[0],'direction'),dailyCategoryKey(draws[3],'direction'));
});

test('both new statistical dimensions use exactly the same keys for ranking and zero-filled day/month trends',()=>{
  const pair=rankDailyDraws(draws,'rune_direction');
  const pairKey=pair.find(row=>row.label==='向 · 正位').key;
  const pairTrend=dailyCategoryTrend(draws,'rune_direction',pair,'day','2026-10-01','2026-10-03');
  assert.deepEqual(pairTrend.map(row=>row[pairKey]),[2,0,0]);

  const direction=rankDailyDraws(draws,'direction');
  const positive=direction.find(row=>row.label==='正位').key;
  const reverse=direction.find(row=>row.label==='逆位').key;
  const zero=direction.find(row=>row.label==='半逆位').key;
  const daily=dailyCategoryTrend(draws,'direction',direction,'day','2026-10-01','2026-10-04');
  assert.deepEqual(daily.map(row=>row[positive]),[2,0,1,0]);
  assert.deepEqual(daily.map(row=>row[reverse]),[0,1,0,0]);
  assert.deepEqual(daily.map(row=>row[zero]),[0,0,0,0]);
  const monthly=dailyCategoryTrend(draws,'direction',direction,'month','2026-10-01','2026-10-31');
  assert.equal(monthly.length,1);
  assert.equal(monthly[0][positive],3);
  assert.equal(monthly[0][reverse],1);
});
