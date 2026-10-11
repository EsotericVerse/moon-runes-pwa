import test from 'node:test';
import assert from 'node:assert/strict';
import {
 sharedGroupCodes,canParticipateInCrossStatistics,sharedSourceBreakdown,sharedScopeDensity
} from '../app/loc/statistics-group-sharing.mjs';
import {calculateMemberCross} from '../app/loc/member-intersection-model.mjs';

const categories=[
 {category_code:'facebook',display_name:'Facebook',enabled:true},
 {category_code:'threads',display_name:'Threads',enabled:true},
 {category_code:'others',display_name:'Others',enabled:true}
];
const aliases=[
 {source_key:'fb',category_code:'facebook'},
 {source_key:'threads',category_code:'threads'},
 {source_key:'facebook_pic',category_code:'facebook'}
];
const scopeSources=[
 {scope_id:'alice',source_key:'custom-blog',display_name:'我的文章',category_code:'threads',enabled:true},
 {scope_id:'bob',source_key:'custom-blog',display_name:'部落格',category_code:'facebook',enabled:true}
];
const permissions=[
 {scope_id:'alice',category_code:'facebook',share_enabled:true},
 {scope_id:'alice',category_code:'threads',share_enabled:false},
 {scope_id:'bob',category_code:'threads',share_enabled:true}
];
const raw=[
 {day:'2026-10-01',kind:'source',category:'fb',item_count:4},
 {day:'2026-10-01',kind:'source',category:'threads',item_count:3},
 {day:'2026-10-01',kind:'source',category:'custom-blog',item_count:2},
 {day:'2026-10-02',kind:'media',category:'facebook_pic',item_count:2},
 {day:'2026-10-02',kind:'media',category:'suno',item_count:5},
 {day:'2026-10-01',kind:'total',category:'文字作品',item_count:9},
 {day:'2026-10-02',kind:'total',category:'多媒體',item_count:7}
];
const taxonomy={categories,aliases,scopeSources,permissions};

test('missing consent denies and consent is independent for every group source of every member',()=>{
 assert.equal(canParticipateInCrossStatistics('unknown',permissions,categories),false);
 assert.deepEqual([...sharedGroupCodes('alice',permissions,categories)],['facebook']);
 assert.deepEqual([...sharedGroupCodes('bob',permissions,categories)],['threads']);
 assert.deepEqual([...sharedGroupCodes('unknown',permissions,categories)],[]);
});
test('LOC density and total never leak excluded groups or precomputed unfiltered totals',()=>{
 const rows=sharedSourceBreakdown(raw,'alice',taxonomy);
 assert.deepEqual(rows.filter(row=>row.kind==='source').map(row=>row.category),['fb']);
 assert.equal(rows.filter(row=>row.kind==='media').reduce((n,row)=>n+row.item_count,0),2);
 assert.deepEqual(rows.filter(row=>row.kind==='total').map(row=>[row.day,row.category,row.item_count]),[
   ['2026-10-01','文字作品',4],['2026-10-02','多媒體',2]
 ]);
 assert.deepEqual(sharedScopeDensity(raw,'alice',taxonomy),[
   {scope_id:'alice',day:'2026-10-01',item_count:4},
   {scope_id:'alice',day:'2026-10-02',item_count:2}
 ]);
 assert.deepEqual(sharedScopeDensity(raw,'charlie',taxonomy),[]);
});
test('personal source labels receive no independent consent; only assigned group matters',()=>{
 const allowed=sharedSourceBreakdown(raw,'bob',taxonomy);
 assert.ok(allowed.some(row=>row.category==='threads'));
 assert.ok(!allowed.some(row=>row.category==='custom-blog'));
 assert.ok(!allowed.some(row=>row.category==='fb'));
});
test('cross-member total and source measures only consume published source groups',()=>{
 const datasets=new Map([['alice',{rows:sharedSourceBreakdown(raw,'alice',taxonomy),daily:[]}]]);
 const result=calculateMemberCross([
  {person:'alice',metric:'total'},
  {person:'alice',metric:'source:facebook'},
  {person:'alice',metric:'source:threads'}
 ],datasets,{from:'2026-10-01',to:'2026-10-02',unit:'day',categories,aliases,scopeSources});
 assert.deepEqual(result.totals.map(row=>row.value),[6,4,0]);
});
