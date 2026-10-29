import test from 'node:test';
import assert from 'node:assert/strict';
import {isKeywordClassUid,generateKeywordClassUid,buildKeywordUidlistRows,patchKeywordUidlistRows,summarizeKeywordUidlist}
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
test('Item uidlist preserves UID case and per-article times',()=>{
  const rows=buildKeywordUidlistRows(data);
  assert.deepEqual(rows[0].uidlist,[{uid:'Ab12Cd34',times:3},{uid:'ab12Cd34',times:2}]);
  assert.equal(rows[0].class_group,'符文66');
  assert.deepEqual(summarizeKeywordUidlist(rows[0]),{article_count:2,hit_count:5});
});
test('incremental classification retains unchanged records and updates times',()=>{
  const before=buildKeywordUidlistRows(data);
  const after=patchKeywordUidlistRows(before,[{uid:'Ab12Cd34',group_lists:'9:7'}]);
  assert.deepEqual(after[0].uidlist,[{uid:'ab12Cd34',times:2}]);
  assert.deepEqual(after[1].uidlist,[]);
  assert.deepEqual(after[2].uidlist,[{uid:'Ab12Cd34',times:7},{uid:'ab12Cd34',times:4}]);
  assert.equal(before[0].uidlist.length,2);
});
test('removes hits on zero-match reanalysis',()=>{
  const rows=patchKeywordUidlistRows(buildKeywordUidlistRows(data),[{uid:'Ab12Cd34',group_lists:'false'}]);
  assert.equal(rows[1].uidlist.length,0);
});
test('accepts engine rune_counts directly',()=>{
  const rows=buildKeywordUidlistRows({...data,classifications:[
    {uid:'Ab12Cd34',rune_counts:[{rune_id:1,count:3},{rune_id:2,count:1}]}
  ]});
  assert.deepEqual(rows[0].uidlist,[{uid:'Ab12Cd34',times:3}]);
});
test('generates unique four-character Base62 IDs without SHA or UUID',()=>{
  assert.equal(isKeywordClassUid('aB3d'),true);
  assert.equal(isKeywordClassUid('tooLong'),false);
  let k=0;
  const random=buf=>{buf.set([0,1,2,k++,4,5,6,7,8,9,10,11,12,13,14,15]);return buf;};
  assert.equal(generateKeywordClassUid(['0120'],random),'0121');
});
test('rejects invalid or cross-Class data',()=>{
  assert.throws(()=>buildKeywordUidlistRows({...data,classUid:'bad'}));
  assert.throws(()=>buildKeywordUidlistRows({...data,classifications:[{uid:'short',group_lists:'1:1'}]}));
  assert.throws(()=>buildKeywordUidlistRows({...data,classifications:[{uid:'Ab12Cd34',group_lists:'99:1'}]}));
  assert.throws(()=>patchKeywordUidlistRows([...buildKeywordUidlistRows(data),
    {class_uid:'aB3e',class_group:'另一組',item_no:10,uidlist:[]}]));
});
