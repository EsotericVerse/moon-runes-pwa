import assert from 'node:assert/strict';
import test from 'node:test';
import {buildKeywordUidlistRows,patchKeywordUidlistRows,summarizeKeywordUidlist,isKeywordClassUid,generateKeywordClassUid} from '../app/loc/keyword-uidlist.mjs';
const catalog=[
 {keyword_id:1,class_uid:'aB3d',class_group:'靈魂',item_name:'靈'},
 {keyword_id:2,class_uid:'aB3d',class_group:'靈魂',item_name:'魂'},
 {keyword_id:9,class_uid:'aB3d',class_group:'連結',item_name:'向'}
];
const classifications=[
 {uid:'Ab12Cd34',hits:[{keyword_id:1,times:3},{keyword_id:2,times:1}]},
 {uid:'ab12Cd34',hits:[{keyword_id:1,times:2},{keyword_id:9,times:4}]}
];
const build=()=>buildKeywordUidlistRows({classUid:'aB3d',catalogRows:catalog,classifications});
test('one keyword_id owns an array of UID / times, no item_no or class_id',()=>{
 const rows=build();
 assert.deepEqual(Object.keys(rows[0]),['keyword_id','class_uid','class_group','item_name','uidlist']);
 assert.deepEqual(rows[0].uidlist,[{uid:'Ab12Cd34',times:3},{uid:'ab12Cd34',times:2}]);
 assert.deepEqual(summarizeKeywordUidlist(rows[0].uidlist),{article_count:2,hit_count:5});
});
test('incremental rescan preserves untouched UIDs and removes stale hits',()=>{
 const saved=build();
 const updated=patchKeywordUidlistRows({classUid:'aB3d',catalogRows:catalog,storedRows:saved,
  classifications:[{uid:'Ab12Cd34',hits:[{keyword_id:9,times:7}]}]});
 assert.deepEqual(updated[0].uidlist,[{uid:'ab12Cd34',times:2}]);
 assert.deepEqual(updated[1].uidlist,[]);
 assert.deepEqual(updated[2].uidlist,[{uid:'Ab12Cd34',times:7},{uid:'ab12Cd34',times:4}]);
 assert.equal(saved[0].uidlist.length,2);
});
test('zero matches clear only rescanned UID',()=>{
 const updated=patchKeywordUidlistRows({classUid:'aB3d',catalogRows:catalog,storedRows:build(),
  classifications:[{uid:'Ab12Cd34',hits:[]}]});
 assert.equal(updated[1].uidlist.length,0);
 assert.equal(updated[0].uidlist.length,1);
});
test('arbitrary Group cardinalities and Item count',()=>{
 const large=Array.from({length:130},(_,i)=>({
   keyword_id:i+1000,class_uid:'Zz8Q',class_group:'Group '+i%16,item_name:'item '+i}));
 const rows=buildKeywordUidlistRows({classUid:'Zz8Q',catalogRows:large,
 classifications:[{uid:'Ab12Cd34',hits:[{keyword_id:1129,times:6}]}]});
 assert.equal(rows.length,130);
 assert.equal(new Set(rows.map(row=>row.class_group)).size,16);
 assert.deepEqual(rows.at(-1).uidlist,[{uid:'Ab12Cd34',times:6}]);
});
test('keyword_id bigint string is not silently rounded',()=>{
 const rows=buildKeywordUidlistRows({classUid:'aB3d',catalogRows:[{
   keyword_id:'9007199254740993',class_uid:'aB3d',class_group:'A',item_name:'B'}],
 classifications:[{uid:'Ab12Cd34',hits:[{keyword_id:'9007199254740993',times:2}]}]});
 assert.equal(rows[0].keyword_id,'9007199254740993');
 assert.equal(rows[0].uidlist[0].times,2);
});
test('Class UIDs are independent four-character Base62 identifiers',()=>{
 assert.equal(isKeywordClassUid('aB3d'),true);
 assert.equal(isKeywordClassUid('abcdef'),false);
 let n=0;
 const random=b=>{b.set([0,1,2,n++,4,5,6,7,8,9,10,11,12,13,14,15]);return b;};
 assert.equal(generateKeywordClassUid(['0120'],random),'0121');
});
test('rejects malformed or cross-Class article/item identities',()=>{
 assert.throws(()=>buildKeywordUidlistRows({classUid:'bad',catalogRows:catalog}));
 assert.throws(()=>buildKeywordUidlistRows({classUid:'aB3d',catalogRows:catalog,classifications:[{uid:'bad',hits:[]}]}));
 assert.throws(()=>buildKeywordUidlistRows({classUid:'aB3d',catalogRows:catalog,classifications:[{uid:'Ab12Cd34',hits:[{keyword_id:99,times:2}]}]}));
 assert.throws(()=>patchKeywordUidlistRows({classUid:'ZZZZ',catalogRows:catalog,storedRows:build()}));
});
