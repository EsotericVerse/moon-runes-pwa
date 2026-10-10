import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateItemConfluenceRange,validateItemLane,itemConfluenceShiftMonth,
  buildItemConfluenceDaily,buildItemConfluenceRiver,itemConfluenceSummary,
  ITEM_CONFLUENCE_PAGE_SIZE,ITEM_LANE_OPTIONS,itemLaneDescription,
  groupItemConfluenceRunes,itemRuneDisplay
} from '../app/loc/item-confluence-model.mjs';

const scopes=[{id:'lo3rwang'},{id:'another'},{id:'lrunes'}];
const a={scopeId:'lo3rwang',source:'galaxy:facebook',exact:''};
const b={scopeId:'another',source:'galaxy:threads',exact:''};

test('validates a three-calendar-month interval at input boundary',()=>{
  assert.deepEqual(validateItemConfluenceRange('2026-07-10','2026-10-10'),{
    valid:true,startDate:'2026-07-10',endDate:'2026-10-10'
  });
  assert.equal(validateItemConfluenceRange('2026-07-09','2026-10-10').valid,false);
  assert.equal(validateItemConfluenceRange('2026-02-30','2026-03-01').valid,false);
  assert.equal(validateItemConfluenceRange('2026-10-11','2026-10-10').valid,false);
  assert.equal(itemConfluenceShiftMonth('2026-01-31',1),'2026-02-28');
  assert.equal(ITEM_CONFLUENCE_PAGE_SIZE,20);
});

test('supports any managed Scope A/B and distinct platform sources',()=>{
  assert.equal(validateItemLane(a,scopes).valid,true);
  assert.equal(validateItemLane(b,scopes).valid,true);
  assert.equal(validateItemLane({scopeId:'lrunes',source:'daily:rune'},scopes).valid,true);
  assert.equal(validateItemLane({scopeId:'another',source:'daily:rune'},scopes).valid,false);
  assert.equal(validateItemLane({scopeId:'private',source:'galaxy:all'},scopes).valid,false);
  assert.equal(validateItemLane({scopeId:'loc',source:'galaxy:all'},[...scopes,{id:'loc'}]).valid,false);
  assert.equal(validateItemLane({scopeId:'another',source:'media:exact',exact:'video'},scopes).valid,true);
  assert.equal(validateItemLane({scopeId:'another',source:'media:exact',exact:''},scopes).valid,false);
  assert.match(itemLaneDescription(b),/Threads/);
  assert.ok(ITEM_LANE_OPTIONS.some(option=>option.value==='galaxy:facebook'));
});

test('daily union fills zero-record days without merging source ownership',()=>{
  const daily=buildItemConfluenceDaily({
    startDate:'2026-10-01',endDate:'2026-10-04',
    series:[
      [{day:'2026-10-01',count:3},{day:'2026-10-03',count:6}],
      [{day:'2026-10-01',count:1},{day:'2026-10-02',count:2}]
    ]
  });
  assert.equal(daily.length,4);
  assert.deepEqual(daily[0].counts,[3,1]);
  assert.deepEqual(daily[1].counts,[0,2]);
  assert.deepEqual(daily[2].counts,[6,0]);
  assert.deepEqual(daily[3].counts,[0,0]);
  assert.deepEqual(daily[0].ratios,[.5,.5]);
  assert.deepEqual(daily[2].ratios,[1,0]);
  const summary=itemConfluenceSummary(daily);
  assert.deepEqual(summary.totals,[9,3]);
  assert.deepEqual(summary.peak,[6,2]);
  assert.equal(summary.bothActiveDays,1);
  assert.equal(summary.totalDays,4);
  const river=buildItemConfluenceRiver(daily,['我的 Facebook','他人的 Threads']);
  assert.equal(river.length,4);
  assert.equal(new Set(river.map(x=>x.group_key)).size,2);
  assert.match(river[0].title,/Facebook/);
  assert.match(river[1].title,/Threads/);
  assert.equal(river.filter(x=>x.start_date==='2026-10-04').length,0);
});

test('rejects generation of overlength time series',()=>{
  assert.deepEqual(buildItemConfluenceDaily({
    startDate:'2026-01-01',endDate:'2026-06-01',series:[[],[]]
  }),[]);
});

test('LunaRunes data is displayed as content, never as source density',()=>{
  const draws=[
    {record_date:'2026-10-02',draw_kind:'supplement',rune_number:20,rune_name:'月',direction:'逆位',recorded_phase:'新月'},
    {record_date:'2026-10-02',draw_kind:'main',rune_number:11,rune_name:'光',direction:'正位',recorded_phase:'空亡'},
    {record_date:'2026-10-03',draw_kind:'main',rune_number:13,rune_name:'地',direction:'半正位'},
    {record_date:'2026-10-04',draw_kind:'main',rune_number:14,rune_name:'空',direction:'半逆位'}
  ];
  const runeSeries=groupItemConfluenceRunes(draws,date=>
    date==='2026-10-02'?'滿月':'下弦'
  );
  assert.equal(runeSeries.length,3);
  assert.equal(runeSeries[0].count,2);
  assert.deepEqual(runeSeries[0].draws.map(row=>row.direction),['正位','逆位']);
  assert.equal(runeSeries[0].draws[0].true_moon_phase,'滿月');
  assert.match(itemRuneDisplay(runeSeries[0].draws[0]),/光 · 正位 · 滿月/);
  assert.match(itemRuneDisplay(runeSeries[0].draws[1]),/月 · 逆位 · 滿月/);
  const daily=buildItemConfluenceDaily({
    startDate:'2026-10-02',endDate:'2026-10-04',
    lanes:[{scopeId:'lrunes',source:'daily:rune'},{scopeId:'other',source:'galaxy:threads'}],
    series:[runeSeries,[{day:'2026-10-02',count:9},{day:'2026-10-03',count:4}]]
  });
  assert.equal(daily[0].runeDraws[0].length,2);
  assert.equal(daily[0].runeDraws[1].length,0);
  const items=buildItemConfluenceRiver(daily,['每日符文','Threads'],[
    {scopeId:'lrunes',source:'daily:rune'},{scopeId:'other',source:'galaxy:threads'}
  ]);
  const runeItems=items.filter(row=>row.entry_type==='item_daily_rune');
  const densityItems=items.filter(row=>row.entry_type==='item_density');
  assert.equal(runeItems.length,3);
  assert.equal(densityItems.length,2);
  assert.match(runeItems[0].display_label,/主抽 · 光 · 正位 · 滿月/);
  assert.match(runeItems[0].display_label,/補抽 · 月 · 逆位 · 滿月/);
  assert.equal(runeItems[0].end_date,undefined);
  assert.equal(runeItems[0].density_ratio,undefined);
  assert.equal(runeItems[0].item_count,undefined);
  assert.equal(densityItems[0].item_count,9);
  assert.equal(densityItems[0].density_ratio,1);
});

test('only the dedicated LunaRunes option can create semantic rune labels',()=>{
  const runeSeries=groupItemConfluenceRunes([{
    record_date:'2026-10-02',draw_kind:'main',rune_number:10,
    rune_name:'光',direction:'半逆位'
  }],()=> '上弦');
  const ordinary=[{scopeId:'lrunes',source:'galaxy:all'}];
  const daily=buildItemConfluenceDaily({
    startDate:'2026-10-02',endDate:'2026-10-02',
    lanes:ordinary,series:[runeSeries]
  });
  const items=buildItemConfluenceRiver(daily,['一般 Galaxy'],ordinary);
  assert.equal(items[0].entry_type,'item_density');
  assert.equal(items[0].display_label,'');
  assert.equal(daily[0].runeDraws[0].length,0);
});
