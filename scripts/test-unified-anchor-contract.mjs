import test from 'node:test';
import assert from 'node:assert/strict';
import {toAnchorRecord,fromAnchorRecord,validateAnchorCollection} from '../app/loc/anchor-contract.mjs';

const stamp='2026-10-16T08:00:00Z';
const examples=[
  ['time',{uid:'00A1',type:'period',title:'期間',description:'日期區間',address:'2026-10-16',anchor_ids:['00A2','00A3'],range:{version:1,segments:[{start_date:'2026-10-16',end_date:'2026-10-20'}]},invisible:false}],
  ['trace',{uid:'06E3',trace_type:'trace',title:'痕跡',description:'路線',anchor_list:['06E4','06E5'],route_list:{routes:['1234'],segments:[['06E4','06E5']],postal_address:'台灣'},address:[121.5,25],times:[stamp],invisible:true}],
  ['keywords',{uid:'AbC1',type:'item',name:'斷',desc:'符文',lists:['斷','分'],uid_lists:{hits:[{uid:'FaBbAc01',times:3}]},invisible:false}],
  ['media',{uid:'aBc123Z9',type:'音樂',title:'歌曲',url:'https://suno.com/song/a',meta_tags:'jazz, orchestral',createtime:stamp,location:'臺北',invisible:false}],
  ['media',{uid:'RUnE29Z3',type:'rune',title:'抽牌結果',url:null,meta_tags:'{"cards":["夢"]}',createtime:stamp,location:null,invisible:false}]
];
for(const [kind,record] of examples)test(kind+' round-trip preserves field values and UID case',()=>{
  const packed=toAnchorRecord(kind,record);
  assert.equal(packed.kind,kind);
  assert.equal(packed.uid,record.uid);
  assert.deepEqual(fromAnchorRecord(packed),record);
  assert.equal(typeof packed.attrs,'object');
  assert.ok(!Array.isArray(packed.attrs));
  assert.ok(Array.isArray(packed.links));
});
test('anchor table rejects global UID collisions even when kinds differ',()=>{
  const t=toAnchorRecord('time',examples[0][1]);
  const k=toAnchorRecord('keywords',{...examples[2][1],uid:'00A1'});
  assert.throws(()=>validateAnchorCollection([t,k]),/UID collision/);
});
test('does not normalize case-sensitive Base62 UIDs',()=>{
  const a=toAnchorRecord('keywords',{...examples[2][1],uid:'AbC1'});
  const b=toAnchorRecord('keywords',{...examples[2][1],uid:'aBc1'});
  assert.deepEqual(validateAnchorCollection([a,b]),{count:2,unique:2});
});
test('does not accept an unknown domain or malformed links',()=>{
  assert.throws(()=>toAnchorRecord('galaxy',examples[0][1]),/Unknown anchor kind/);
  assert.throws(()=>toAnchorRecord('time',{...examples[0][1],anchor_ids:'00A2'}),/must be an array/);
});