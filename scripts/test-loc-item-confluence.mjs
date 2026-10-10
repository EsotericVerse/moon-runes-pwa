import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateItemConfluenceRange,validateItemLane,itemConfluenceShiftMonth,
  buildItemConfluenceDaily,buildItemConfluenceRiver,itemConfluenceSummary,
  ITEM_CONFLUENCE_PAGE_SIZE,ITEM_LANE_OPTIONS,itemLaneDescription
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
