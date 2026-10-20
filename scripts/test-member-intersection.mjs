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

test('daily rune dimensions can intersect another member without counting unrelated directions',()=>{
  const sets=new Map([
    ['alice',{rows:[{day:'2026-10-01',kind:'total',category:'文字作品',item_count:1}],daily:[]}],
    ['lrunes',{rows:[],daily:[
      {record_date:'2026-10-01',draw_kind:'main',direction:'正位',phase:'新月'},
      {record_date:'2026-10-02',draw_kind:'supplement',direction:'逆位',phase:'滿月'}
    ]}]
  ]);
  const value=calculateMemberCross([
    {person:'alice',metric:'text'},{person:'lrunes',metric:'daily:direction:正位'},
    {person:'lrunes',metric:'daily:phase:滿月'}
  ],sets,{from:'2026-10-01',to:'2026-10-02',unit:'day',categories,aliases});
  assert.deepEqual(value.totals.map(x=>x.value),[1,1,1]);
  assert.equal(value.commonDays,0);
  assert.equal(value.unionDays,2);
  const kinds=availableMemberMeasures([...sets.values()].map(x=>x.rows),categories);
  assert.ok(kinds.some(x=>x.id==='daily:direction:正位'));
});


test('source groups are never merged across Scopes in member comparisons',()=>{
  const sets=new Map([['alice',{rows:[{day:'2026-10-01',kind:'source',category:'fb',item_count:2}],daily:[]}]]);
  const measures=availableMemberMeasures([...sets.values()].map(x=>x.rows));
  assert.ok(!measures.some(x=>x.id.startsWith('source:')||x.id.startsWith('personal:')));
});

test('Daily Rune 2025 records re-enter on minus and leave after plus restores the one-year window',()=>{
  const older=Array.from({length:60},(_,i)=>({
    record_date:new Date(Date.UTC(2025,4,31+i)).toISOString().slice(0,10),
    draw_kind:'main',direction:'正位',phase:'新月'
  }));
  const recent=Array.from({length:96},(_,i)=>({
    record_date:new Date(Date.UTC(2026,7,5+Math.floor(i*68/96))).toISOString().slice(0,10),
    draw_kind:i%3?'main':'supplement',direction:'逆位',phase:'滿月'
  }));
  const datasets=new Map([['lrunes',{rows:[],daily:[...older,...recent]}]]);
  const lanes=[{person:'lrunes',metric:'daily'}];
  const options={unit:'month',categories:[],aliases:[]};
  const before=calculateMemberCross(lanes,datasets,{from:'2025-10-11',to:'2026-10-11',...options});
  const zoomedOut=calculateMemberCross(lanes,datasets,{from:'2024-10-11',to:'2026-10-11',...options});
  const zoomedBack=calculateMemberCross(lanes,datasets,{from:'2025-10-11',to:'2026-10-11',...options});
  assert.deepEqual([before.totals[0].value,zoomedOut.totals[0].value,zoomedBack.totals[0].value],[96,156,96]);
  assert.equal(before.rows.length,zoomedBack.rows.length);
});
