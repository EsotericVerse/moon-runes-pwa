import test from 'node:test';
import assert from 'node:assert/strict';
import {reanalyzeKeywordClass} from '../app/loc/keyword-reanalysis.mjs';
const source=[
 {uid:'CAT1',type:'category',name:'符文',lists:['CL01']},
 {uid:'CL01',type:'class',name:'符文66',lists:['GR01']},
 {uid:'GR01',type:'group',name:'靈魂',lists:['IT01']},
 {uid:'IT01',type:'item',name:'靈',lists:['心情']}
];
async function analyze(catalog,content='心情'){
 const saved=[],progress=[];
 const stats=await reanalyzeKeywordClass({
  classUid:'CL01',treeRows:catalog,pageSize:1,
  readPage:async ({offset})=>offset?[]:[{uid:'Ab12Cd34',content}],
  writeNode:async value=>saved.push(value),finalize:async()=>{},
  onProgress:row=>progress.push(row)
 });
 return {saved,stats,progress};
}
test('Group and Item use the same uid_lists column with different content',async()=>{
 const result=await analyze(source);
 assert.deepEqual(result.saved.find(r=>r.type==='group').uid_lists,['Ab12Cd34']);
 assert.deepEqual(result.saved.find(r=>r.type==='item').uid_lists,[{uid:'Ab12Cd34',times:1}]);
 assert.equal(result.stats.matchedDocuments,1);
 assert.equal(result.stats.occurrences,1);
});
test('Changed Item lists clear old Group and Item analysis without migration',async()=>{
 const newCatalog=source.map(row=>row.uid==='IT01'?{...row,lists:['雪花']}:row);
 const result=await analyze(newCatalog);
 assert.deepEqual(result.saved.find(r=>r.type==='item').uid_lists,[]);
 assert.deepEqual(result.saved.find(r=>r.type==='group').uid_lists,[]);
 assert.equal(result.stats.matchedDocuments,0);
});
test('Original classification implicitly matches Item name as well as lists',async()=>{
 const result=await analyze(source,'只有靈這個字');
 assert.equal(result.stats.matchedDocuments,1);
 assert.deepEqual(result.saved.find(row=>row.type==='item').uid_lists,[{uid:'Ab12Cd34',times:1}]);
});
test('Failed Keyword write never publishes the success marker',async()=>{
 let published=false;
 await assert.rejects(reanalyzeKeywordClass({
  classUid:'CL01',treeRows:source,
  readPage:async({offset})=>offset?[]:[{uid:'Ab12Cd34',content:'心情'}],
  writeNode:async()=>{throw Error('write failed')},finalize:async()=>{published=true}
 }),/write failed/);
 assert.equal(published,false);
});

test('stateful ties use least-loaded Group across page boundaries; unmatched falls back to 德',async()=>{
 const catalog=[
  {uid:'CAT1',type:'category',name:'符文',lists:['CL01']},
  {uid:'CL01',type:'class',name:'符文66',lists:['GR01','GR02','GR03']},
  {uid:'GR01',type:'group',name:'靈魂',lists:['IT01']},
  {uid:'GR02',type:'group',name:'秩序',lists:['IT02']},
  {uid:'GR03',type:'group',name:'特殊',lists:['IT03']},
  {uid:'IT01',type:'item',name:'靈',lists:['心']},
  {uid:'IT02',type:'item',name:'向',lists:['方']},
  {uid:'IT03',type:'item',name:'德',lists:['台北']}
 ];
 const docs=[
  {uid:'aB000001',content:'靈向'},
  {uid:'aB000002',content:'靈向'},
  {uid:'aB000003',content:'靈向'},
  {uid:'aB000004',content:'靈向'},
  {uid:'aB000005',content:'未命中任何一個判斷詞'}
 ];
 const writes=[];
 const stats=await reanalyzeKeywordClass({
  classUid:'CL01',treeRows:catalog,pageSize:1,
  readPage:async({offset,limit})=>docs.slice(offset,offset+limit),
  writeNode:async row=>writes.push(row),finalize:async()=>{}
 });
 assert.deepEqual(writes.find(x=>x.uid==='GR01').uid_lists,['aB000001','aB000003']);
 assert.deepEqual(writes.find(x=>x.uid==='GR02').uid_lists,['aB000002','aB000004']);
 assert.deepEqual(writes.find(x=>x.uid==='GR03').uid_lists,['aB000005']);
 assert.equal(stats.matchedDocuments,5);
 assert.equal(stats.itemMatches,8);
});
