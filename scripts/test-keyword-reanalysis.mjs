import test from 'node:test';
import assert from 'node:assert/strict';
import {reanalyzeKeywordClass} from '../app/loc/keyword-reanalysis.mjs';
const source=[
 {uid:'CAT1',type:'category',name:'符文',lists:['CL01']},
 {uid:'CL01',type:'class',name:'符文66',lists:['GR01']},
 {uid:'GR01',type:'group',name:'靈魂',lists:['IT01']},
 {uid:'IT01',type:'item',name:'靈',lists:['心靈']}
];
async function analyze(catalog,content='心靈'){
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
test('Item name is not an implicit keyword in new portable parser',async()=>{
 const result=await analyze(source,'只有靈這個字');
 assert.equal(result.stats.matchedDocuments,0);
});
test('Failed Keyword write never publishes the success marker',async()=>{
 let published=false;
 await assert.rejects(reanalyzeKeywordClass({
  classUid:'CL01',treeRows:source,
  readPage:async({offset})=>offset?[]:[{uid:'Ab12Cd34',content:'心靈'}],
  writeNode:async()=>{throw Error('write failed')},finalize:async()=>{published=true}
 }),/write failed/);
 assert.equal(published,false);
});
