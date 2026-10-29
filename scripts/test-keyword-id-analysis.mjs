import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyKeywordDocumentsById} from '../app/loc/model/keyword-id-analysis.mjs';
import {buildKeywordUidlistRows} from '../app/loc/keyword-uidlist.mjs';

test('Classifies using keyword_id only and writes valid per-Item uidlists',()=>{
  const rows=[
    {keyword_id:'9007199254740993',class_uid:'aB3d',item_name:'靈',class_group:'靈魂',keywords:['心靈']},
    {keyword_id:72,class_uid:'aB3d',item_name:'魂',class_group:'靈魂',keywords:['靈魂']}
  ];
  const result=classifyKeywordDocumentsById([{uid:'Ab12Cd34',content:'心靈與靈魂'}],rows);
  assert.deepEqual(result.classifications[0].hits.map(hit=>hit.keyword_id),['9007199254740993','72']);
  const stored=buildKeywordUidlistRows({classUid:'aB3d',catalogRows:rows,classifications:result.classifications});
  assert.equal(stored[0].uidlist[0].uid,'Ab12Cd34');
  assert.ok(stored[0].uidlist[0].times>0);
  assert.ok(stored[1].uidlist[0].times>0);
  assert.ok(!('item_no' in stored[0]));
  assert.ok(!('class_id' in stored[0]));
});
test('No Group/Item count cap; 130 Items across 16 Groups work',()=>{
  const catalog=Array.from({length:130},(_,n)=>({
    keyword_id:n+1,item_name:'Keyword'+n,class_group:'Group '+n%16,keywords:['Signal'+n]
  }));
  const result=classifyKeywordDocumentsById([{uid:'Ab12Cd34',content:'Signal129'}],catalog);
  assert.ok(result.classifications[0].hits.some(hit=>hit.keyword_id==='130'&&hit.times>0));
});
test('Rejects missing and duplicate keyword_id',()=>{
  assert.throws(()=>classifyKeywordDocumentsById([],[{item_name:'bad',class_group:'A'}]));
  assert.throws(()=>classifyKeywordDocumentsById([],[{keyword_id:1},{keyword_id:1}]));
});
