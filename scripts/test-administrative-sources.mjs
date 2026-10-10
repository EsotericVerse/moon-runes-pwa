import test from 'node:test';
import assert from 'node:assert/strict';
import {administrativeSourceTrend} from '../app/loc/statistics-admin-source.mjs';

test('Admin categories and aliases decide the global source distribution',()=>{
  const taxonomy={
    categories:[{category_code:'facebook',display_name:'Facebook',enabled:true},
      {category_code:'threads',display_name:'Threads',enabled:true},
      {category_code:'others',display_name:'Others',enabled:true}],
    aliases:[{source_key:'fb',category_code:'facebook'},{source_key:'threads',category_code:'threads'}]
  };
  const data=[
    {kind:'source',day:'2026-10-01',category:'fb',item_count:2},
    {kind:'source',day:'2026-10-02',category:'threads',item_count:1},
    {kind:'source',day:'2026-10-02',category:'unlisted',item_count:1},
    {kind:'total',day:'2026-10-01',category:'文字作品',item_count:2},
    {kind:'total',day:'2026-10-02',category:'文字作品',item_count:2}
  ];
  const x=administrativeSourceTrend(data,taxonomy,{startDate:'2026-10-01',endDate:'2026-10-03'});
  assert.equal(x.total,4);
  assert.equal(x.rows.length,3);
  assert.equal(x.rows[0].category_facebook,2);
  assert.equal(x.rows[1].category_threads,1);
  assert.equal(x.rows[1].category_others,1);
  assert.deepEqual(x.distribution.map(row=>row.name),['Facebook','Threads','Others']);
  assert.equal(x.rows[2].total,0);
});
