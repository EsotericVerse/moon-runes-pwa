import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOC_CONFLUENCE_PAGE_SIZE,buildLocConfluenceRiver,confluenceRuneListRows,
  confluenceDrawLabel,sortConfluenceDraws,confluenceRowDate
} from '../app/loc/loc-confluence-model.mjs';

const draws=[
  {record_date:'2026-10-03',draw_kind:'supplement',rune_number:41,rune_name:'光',direction:'半逆位',phase:'滿月'},
  {record_date:'2026-10-03',draw_kind:'main',rune_number:9,rune_name:'向',direction:'正位',phase:'滿月'},
  {record_date:'2026-10-01',draw_kind:'history_1',rune_number:50,rune_name:'月',direction:'逆位',phase:'上弦'}
];
const distribution=[
  {scope_id:'lo3rwang',start_date:'2026-10-03',item_count:4},
  {scope_id:'lrunes',start_date:'2026-10-03',item_count:11},
  {scope_id:'lo3rwang',start_date:'2026-10-01',item_count:2},
  {scope_id:'lo3rwang',start_date:'2025-06-01',item_count:100}
];
const anchors=[
  {entry_type:'anchor',scope_id:'lo3rwang',start_date:'2026-10-03',record_id:'abc',display_label:'文字轉折'},
  {entry_type:'anchor',scope_id:'lrunes',start_date:'2026-10-01',record_id:'def',display_label:'符韻定錨'}
];

test('one observation river preserves separate rune and author work lanes',()=>{
  const rows=buildLocConfluenceRiver({draws,distribution,anchors,startDate:'2026-10-01',endDate:'2026-10-03'});
  const runes=rows.filter(row=>row.entry_type==='loc_daily_runes');
  const works=rows.filter(row=>row.entry_type==='loc_personal_works_density');
  const anchored=rows.filter(row=>row.entry_type==='loc_confluence_anchor');
  assert.equal(runes.length,2);
  assert.equal(runes[0].group_key,'loc-confluence:runes');
  assert.equal(works.length,2);
  assert.equal(works[1].item_count,4);
  assert.equal(anchored.length,2);
  assert.equal(rows.filter(row=>row.scope_id==='lrunes'&&row.entry_type==='loc_personal_works_density').length,0);
});

test('existing anchor label shows all available daily runes on the exact date',()=>{
  const rows=buildLocConfluenceRiver({draws,distribution,anchors,startDate:'2026-10-01',endDate:'2026-10-03'});
  const anchor=rows.find(row=>row.entry_type==='loc_confluence_anchor'&&row.start_date==='2026-10-03');
  assert.match(anchor.display_label,/向 · 正位 · 滿月/);
  assert.match(anchor.display_label,/光 · 半逆位 · 滿月/);
  assert.match(anchor.title,/文字轉折/);
  const missing=buildLocConfluenceRiver({draws:[],distribution,anchors});
  assert.ok(missing.every(row=>!String(row.display_label).includes('undefined')));
});

test('mixed listing retains date, direction, moon phase and source ownership',()=>{
  const rows=confluenceRuneListRows(draws);
  assert.equal(rows.length,3);
  assert.equal(rows[0].scope_id,'lrunes');
  assert.match(rows[0].title,/向 · 正位 · 滿月/);
  assert.equal(rows[0].record_date,'2026-10-03');
  assert.equal(rows[0].entry_type,'loc_daily_rune');
  assert.equal(LOC_CONFLUENCE_PAGE_SIZE,20);
  assert.equal(confluenceRowDate({createtime:'2026-10-01T10:00:00+08:00'}),'2026-10-01');
  assert.equal(sortConfluenceDraws(draws)[0].draw_kind,'main');
  assert.match(confluenceDrawLabel(draws[2]),/歷史紀錄一/);
});
