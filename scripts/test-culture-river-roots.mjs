import assert from 'node:assert/strict';
import {test} from 'node:test';
import {summarizeCultureRiverRoots,selectCultureRiverChildren} from '../app/loc/culture-river-roots.mjs';
const taxonomy={
  categories:[{category_code:'facebook',enabled:true},{category_code:'others',enabled:true}],
  aliases:[{source_key:'facebook',category_code:'facebook'}]
};
const rows=[
  {day:'2026-10-01',kind:'source',category:'Facebook',item_count:4},
  {day:'2026-10-01',kind:'source',category:'Website',item_count:2},
  {day:'2026-10-01',kind:'media',category:'music',item_count:3},
  {day:'2026-10-01',kind:'total',category:'文字作品',item_count:6},
  {day:'2026-10-01',kind:'total',category:'多媒體',item_count:3},
  {day:'2026-10-02',kind:'source',category:'Facebook',item_count:1}
];
test('root buckets preserve distinct system, personal and media counts',()=>{
  const summary=summarizeCultureRiverRoots(rows,taxonomy);
  assert.deepEqual(summary.rootBuckets,[
    {category:'custom',start_date:'2026-10-01',item_count:2},
    {category:'media',start_date:'2026-10-01',item_count:3},
    {category:'system',start_date:'2026-10-01',item_count:4},
    {category:'system',start_date:'2026-10-02',item_count:1}
  ]);
  assert.equal(summary.groups.length,3);
});
test('expanded root filter never leaks other source types or top-level totals',()=>{
  assert.deepEqual(selectCultureRiverChildren(rows,taxonomy,['system']).map(x=>x.item_count),[4,1]);
  assert.deepEqual(selectCultureRiverChildren(rows,taxonomy,['custom']).map(x=>x.item_count),[2]);
  assert.deepEqual(selectCultureRiverChildren(rows,taxonomy,['media']).map(x=>x.item_count),[3]);
  assert.equal(selectCultureRiverChildren(rows,taxonomy,[]).length,0);
});
