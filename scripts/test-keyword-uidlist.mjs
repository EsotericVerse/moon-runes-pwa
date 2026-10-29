import test from 'node:test';
import {classifyRune66Documents} from '../app/loc/model/rune66-keyword-engine.mjs';
import assert from 'node:assert/strict';
import {isKeywordClassUid,generateKeywordClassUid,buildKeywordUidlistClass,patchKeywordUidlistClass,summarizeKeywordUidlist}
  from '../app/loc/keyword-uidlist.mjs';
const catalog=[
  {class_name:'符文66',class_group:'靈魂',item_no:1,item_name:'靈'},
  {class_name:'符文66',class_group:'靈魂',item_no:2,item_name:'魂'},
  {class_name:'符文66',class_group:'連結',item_no:9,item_name:'向'}
];
const data={classUid:'aB3d',classGroup:'符文66',catalogRows:catalog,classifications:[
  {uid:'Ab12Cd34',group_lists:'1:3,2:1'},
  {uid:'ab12Cd34',group_lists:'1:2,9:4'}
]};
test('Item names key UID/times arrays without item_no in output',()=>{
  const result=buildKeywordUidlistClass(data);
  assert.deepEqual(Object.keys(result),['class_uid','class_group','item']);
  assert.deepEqual(Object.keys(result.item),['靈','魂','向']);
  assert.deepEqual(result.item['靈'],[{uid:'Ab12Cd34',times:3},{uid:'ab12Cd34',times:2}]);
  assert.deepEqual(summarizeKeywordUidlist(result.item['靈']),{article_count:2,hit_count:5});
});
test('partial analysis updates UID/times without erasing other articles',()=>{
  const before=buildKeywordUidlistClass(data);
  const after=patchKeywordUidlistClass(before,[{uid:'Ab12Cd34',group_lists:'9:7'}],catalog);
  assert.deepEqual(after.item['靈'],[{uid:'ab12Cd34',times:2}]);
  assert.deepEqual(after.item['魂'],[]);
  assert.deepEqual(after.item['向'],[{uid:'Ab12Cd34',times:7},{uid:'ab12Cd34',times:4}]);
  assert.equal(before.item['靈'].length,2);
});
test('zero hits remove old associations',()=>{
  const result=patchKeywordUidlistClass(buildKeywordUidlistClass(data),[
    {uid:'Ab12Cd34',group_lists:'false'}
  ],catalog);
  assert.equal(result.item['魂'].length,0);
});
test('accepts engine rune_counts and new Item-name counts',()=>{
  const rune=buildKeywordUidlistClass({...data,classifications:[{uid:'Ab12Cd34',rune_counts:[{rune_id:1,count:3}]}]});
  assert.deepEqual(rune.item['靈'],[{uid:'Ab12Cd34',times:3}]);
  const named=buildKeywordUidlistClass({...data,classifications:[{uid:'Ab12Cd34',item_counts:{'靈':4,'魂':1}}]});
  assert.deepEqual(named.item['靈'],[{uid:'Ab12Cd34',times:4}]);
});
test('supports arbitrary Item count and IDs above 66',()=>{
  const expanded=Array.from({length:130},(_,n)=>({class_name:'符文66',item_no:n,item_name:'項目'+n}));
  const result=buildKeywordUidlistClass({...data,catalogRows:expanded,classifications:[
    {uid:'Ab12Cd34',group_lists:'129:6'}
  ]});
  assert.equal(Object.keys(result.item).length,130);
  assert.deepEqual(result.item['項目129'],[{uid:'Ab12Cd34',times:6}]);
});
test('generates a unique four-character Base62 Class UID independent of SHA',()=>{
  assert.equal(isKeywordClassUid('aB3d'),true);
  assert.equal(isKeywordClassUid('tooLong'),false);
  let k=0;const random=buf=>{buf.set([0,1,2,k++,4,5,6,7,8,9,10,11,12,13,14,15]);return buf;};
  assert.equal(generateKeywordClassUid(['0120'],random),'0121');
});
test('rejects invalid UIDs, unknown Items, mixed Classes and duplicate Item names',()=>{
  assert.throws(()=>buildKeywordUidlistClass({...data,classUid:'bad'}));
  assert.throws(()=>buildKeywordUidlistClass({...data,classifications:[{uid:'short',group_lists:'1:1'}]}));
  assert.throws(()=>buildKeywordUidlistClass({...data,classifications:[{uid:'Ab12Cd34',group_lists:'99:1'}]}));
  assert.throws(()=>buildKeywordUidlistClass({...data,catalogRows:[...catalog,catalog[0]]}));
  assert.throws(()=>patchKeywordUidlistClass({...buildKeywordUidlistClass(data),class_uid:'wrong'},[],catalog));
});

test('classification engine does not cap generic Keywords Items at 66',()=>{
  const result=classifyRune66Documents([
    {uid:'Ab12Cd34',content:'高序號的識別詞'}
  ],[
    {item_no:129,item_name:'新項目',class_group:'新分類',keywords:['識別詞'],class_enable:true}
  ]);
  assert.equal(result.classifications[0].rune_counts[0].rune_id,129);
  assert.equal(result.classifications[0].rune_counts[0].count,1);
});
