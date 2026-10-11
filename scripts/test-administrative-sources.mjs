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


test('personal custom sources may override group assignment without changing another Scope',()=>{
  const taxonomy={
    categories:[{category_code:'facebook',display_name:'Facebook',enabled:true},
      {category_code:'threads',display_name:'Threads',enabled:true},
      {category_code:'others',display_name:'Others',enabled:true}],
    aliases:[{source_key:'fb',category_code:'facebook'}],
    scopeSources:[{scope_id:'alice',source_key:'fb',category_code:'threads',display_name:'我的社群',enabled:true}]
  };
  const rows=[
    {kind:'source',day:'2026-10-01',category:'fb',item_count:3},
    {kind:'source',day:'2026-10-01',category:'unknown',item_count:1},
    {kind:'total',day:'2026-10-01',category:'文字作品',item_count:4}
  ];
  const alice=administrativeSourceTrend(rows,taxonomy,{scopeId:'alice',startDate:'2026-10-01',endDate:'2026-10-01'});
  const bob=administrativeSourceTrend(rows,taxonomy,{scopeId:'bob',startDate:'2026-10-01',endDate:'2026-10-01'});
  assert.equal(alice.rows[0].category_threads,3);
  assert.equal(bob.rows[0].category_facebook,3);
  assert.equal(alice.rows[0].category_others,1);
  const own=administrativeSourceTrend(rows,taxonomy,{scopeId:'alice',dimension:'personal',startDate:'2026-10-01',endDate:'2026-10-01'});
  assert.deepEqual(own.distribution.map(row=>[row.name,row.value]),[['我的社群',3],['未自訂來源',1]]);
  assert.equal(own.total,4);
});
