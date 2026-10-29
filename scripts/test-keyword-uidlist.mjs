import test from 'node:test';
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
test('group/item cardinality derives from catalog rather than Rune66',()=>{
  const result=buildKeywordUidlistClass(data);
  assert.deepEqual(Object.keys(result),['class_uid','class_group','group']);
  assert.deepEqual(Object.keys(result.group),['靈魂','連結']);
  assert.deepEqual(Object.keys(result.group['靈魂'].item),['靈','魂']);
  assert.deepEqual(result.group['靈魂'].item['靈'],[{uid:'Ab12Cd34',times:3},{uid:'ab12Cd34',times:2}]);
  assert.deepEqual(summarizeKeywordUidlist(result.group['靈魂'].item['靈']),{article_count:2,hit_count:5});
});
test('incremental writes preserve unscanned UIDs and replace only changed hits',()=>{
  const old=buildKeywordUidlistClass(data);
  const updated=patchKeywordUidlistClass(old,[{uid:'Ab12Cd34',group_lists:'9:7'}],catalog);
  assert.deepEqual(updated.group['靈魂'].item['靈'],[{uid:'ab12Cd34',times:2}]);
  assert.deepEqual(updated.group['靈魂'].item['魂'],[]);
  assert.deepEqual(updated.group['連結'].item['向'],[{uid:'Ab12Cd34',times:7},{uid:'ab12Cd34',times:4}]);
  assert.equal(old.group['靈魂'].item['靈'].length,2);
});
test('zero matches remove previous article hits',()=>{
  const changed=patchKeywordUidlistClass(buildKeywordUidlistClass(data),[
    {uid:'Ab12Cd34',group_lists:'false'}
  ],catalog);
  assert.equal(changed.group['靈魂'].item['魂'].length,0);
});
test('new classifications can use group/item keys without old numeric IDs',()=>{
  const result=buildKeywordUidlistClass({...data,classifications:[
    {uid:'Ab12Cd34',item_counts:{'靈魂':{'靈':3,'魂':1},'連結':{'向':2}}}
  ]});
  assert.deepEqual(result.group['連結'].item['向'],[{uid:'Ab12Cd34',times:2}]);
});
test('same Item name in different Groups remains distinct',()=>{
  const two=[{class_name:'Pop',class_group:'風格A',item_name:'共同詞'},
    {class_name:'Pop',class_group:'風格B',item_name:'共同詞'}];
  const result=buildKeywordUidlistClass({classUid:'b9A2',classGroup:'Pop',catalogRows:two,classifications:[
    {uid:'Ab12Cd34',item_counts:{'風格A':{'共同詞':1},'風格B':{'共同詞':3}}}
  ]});
  assert.equal(result.group['風格A'].item['共同詞'][0].times,1);
  assert.equal(result.group['風格B'].item['共同詞'][0].times,3);
});
test('supports 16 uneven Groups, 130 Items and arbitrary numeric Item numbers',()=>{
  const catalogRows=Array.from({length:130},(_,n)=>({
    class_name:'Pop',class_group:'Group '+(n%16),item_no:n*3,item_name:'Item '+n
  }));
  const actual=buildKeywordUidlistClass({classUid:'B3aY',classGroup:'Pop',catalogRows,
    classifications:[{uid:'Ab12Cd34',group_lists:'387:7'}]});
  assert.equal(Object.keys(actual.group).length,16);
  assert.equal(Object.values(actual.group).reduce((n,g)=>n+Object.keys(g.item).length,0),130);
  assert.deepEqual(actual.group['Group 1'].item['Item 129'],[{uid:'Ab12Cd34',times:7}]);
});
test('short Class UIDs preserve Base62 case without using SHA or UUID',()=>{
  assert.equal(isKeywordClassUid('aB3d'),true);
  assert.equal(isKeywordClassUid('tooLong'),false);
  let k=0;const random=buf=>{buf.set([0,1,2,k++,4,5,6,7,8,9,10,11,12,13,14,15]);return buf;};
  assert.equal(generateKeywordClassUid(['0120'],random),'0121');
});
test('invalid data is rejected rather than losing classification hits',()=>{
  assert.throws(()=>buildKeywordUidlistClass({...data,classUid:'bad'}));
  assert.throws(()=>buildKeywordUidlistClass({...data,classifications:[{uid:'short',group_lists:'1:1'}]}));
  assert.throws(()=>buildKeywordUidlistClass({...data,classifications:[{uid:'Ab12Cd34',group_lists:'99:1'}]}));
  assert.throws(()=>buildKeywordUidlistClass({...data,catalogRows:[...catalog,catalog[0]]}));
  assert.throws(()=>patchKeywordUidlistClass({...buildKeywordUidlistClass(data),class_uid:'wrong'},[],catalog));
});
