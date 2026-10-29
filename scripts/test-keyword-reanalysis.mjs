import test from 'node:test';
import assert from 'node:assert/strict';
import {reanalyzeKeywordClass} from '../app/loc/keyword-reanalysis.mjs';
const catalog=[
  {keyword_id:1,class_uid:'A3bC',item_name:'火',class_group:'元素',keywords:['燃燒'],order_no:1},
  {keyword_id:2,class_uid:'A3bC',item_name:'水',class_group:'元素',keywords:['河流'],order_no:2},
  {keyword_id:3,class_uid:'A3bC',item_name:'空',class_group:'其他',keywords:['空白'],order_no:3}
];
test('reanalyzes from article content and replaces all Item lists without Galaxy writes',async()=>{
 const pages=[[{uid:'Ab12Cd34',content:'燃燒的河流',searchable:true},
               {uid:'Ef56Gh78',content:'河流'}],[]];
 const writes=[],statuses=[];
 const result=await reanalyzeKeywordClass({
   classUid:'A3bC',catalogRows:catalog,pageSize:2,
   readPage:async()=>pages.shift(),
   writeItem:async row=>writes.push(row),
   finalize:async row=>statuses.push(row)
 });
 assert.equal(result.analyzedDocuments,2);
 assert.equal(result.matchedDocuments,2);
 assert.equal(writes.length,3);
 assert.deepEqual(writes[0].uidlist.map(x=>x.uid),['Ab12Cd34']);
 assert.deepEqual(writes[1].uidlist.map(x=>x.uid),['Ab12Cd34','Ef56Gh78']);
 assert.deepEqual(writes[2].uidlist,[]);
 assert.equal(statuses[0].classUid,'A3bC');
});
test('new keyword rules replace previous results; stale hits disappear',async()=>{
 const articles=[{uid:'Ab12Cd34',content:'燃燒'}];
 const run=async rules=>{
   const writes=[];
   await reanalyzeKeywordClass({classUid:'A3bC',
     catalogRows:catalog.map(row=>row.keyword_id===1?{...row,keywords:rules}:row),
     readPage:async ({offset})=>offset?[]:articles,
     writeItem:async row=>writes.push(row),finalize:async()=>{}
   });
   return writes;
 };
 assert.equal((await run(['燃燒']))[0].uidlist.length,1);
 assert.equal((await run(['雪花']))[0].uidlist.length,0);
});
test('no fixed Group/Item ceiling or Rune66 numbering in reanalysis',async()=>{
 const more=Array.from({length:130},(_,i)=>({keyword_id:101+i,class_uid:'X2z5',
   item_name:'Item '+i,class_group:'Group '+i%16,keywords:['Signal '+i]}));
 const writes=[];
 await reanalyzeKeywordClass({
   classUid:'X2z5',catalogRows:more,
   readPage:async ({offset})=>offset?[]:[{uid:'Ab12Cd34',content:'Signal 129'}],
   writeItem:async row=>writes.push(row),finalize:async()=>{}
 });
 assert.equal(writes.length,130);
 assert.equal(writes.at(-1).uidlist.length,1);
});
test('never finalizes a partial write',async()=>{
 let finalized=false;
 await assert.rejects(reanalyzeKeywordClass({classUid:'A3bC',catalogRows:catalog,
   readPage:async ({offset})=>offset?[]:[{uid:'Ab12Cd34',content:'燃燒'}],
   writeItem:async row=>{if(row.keywordId==='2')throw Error('write failed')},
   finalize:async()=>{finalized=true}
 }),/write failed/);
 assert.equal(finalized,false);
});
