import test from 'node:test';
import assert from 'node:assert/strict';
import {assignedSource,availableMemberMeasures,calculateMemberCross} from '../app/loc/member-intersection-model.mjs';

const categories=[
  {category_code:'facebook',display_name:'Facebook',enabled:true},
  {category_code:'threads',display_name:'Threads',enabled:true},
  {category_code:'others',display_name:'Others',enabled:true}
];
const aliases=[{source_key:'fb',category_code:'facebook'},{source_key:'threads',category_code:'threads'}];
test('classification is Admin-owned; unmatched records are Others',()=>{
  assert.equal(assignedSource('fb',aliases,categories),'facebook');
  assert.equal(assignedSource('random',aliases,categories),'others');
});
test('cross member selections preserve per-member and per-measure counts',()=>{
  const sets=new Map([
    ['alice',{rows:[
      {day:'2026-10-01',kind:'source',category:'fb',item_count:2},
      {day:'2026-10-01',kind:'total',category:'文字作品',item_count:2},
      {day:'2026-10-02',kind:'total',category:'多媒體',item_count:3},
      {day:'2026-10-02',kind:'media',category:'song',item_count:3}
    ],daily:[]}],
    ['lrunes',{rows:[
      {day:'2026-10-01',kind:'total',category:'文字作品',item_count:1}
    ],daily:[{record_date:'2026-10-01'},{record_date:'2026-10-01'},{record_date:'2026-10-03'}]}]
  ]);
  const rows=calculateMemberCross([
    {person:'alice',metric:'total',label:'Alice 作品'},
    {person:'lrunes',metric:'daily',label:'每日符文'}
  ],sets,{from:'2026-10-01',to:'2026-10-03',unit:'day',categories,aliases});
  assert.deepEqual(rows.totals.map(x=>x.value),[5,3]);
  assert.equal(rows.commonDays,1);
  assert.equal(rows.unionDays,3);
  assert.equal(rows.rows.length,3);
  const subset=calculateMemberCross([
    {person:'alice',metric:'source:facebook'},
    {person:'alice',metric:'media:song'}
  ],sets,{from:'2026-10-01',to:'2026-10-03',categories,aliases});
  assert.deepEqual(subset.totals.map(x=>x.value),[2,3]);
  assert.equal(subset.commonDays,0);
  assert.ok(availableMemberMeasures([...sets.values()].map(x=>x.rows),categories).some(x=>x.id==='media:song'));
});
