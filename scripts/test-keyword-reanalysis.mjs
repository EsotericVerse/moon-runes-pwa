import test from 'node:test';
import assert from 'node:assert/strict';
import {reanalyzeKeywordClass} from '../app/loc/keyword-reanalysis.mjs';
import {createKeywordUidDocumentClassifier,classifyKeywordDocumentsByUid} from '../app/loc/model/keyword-uid-analysis.mjs';
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

test('two Classes can analyze the same Galaxy article without overwriting each other',async()=>{
 const records=[
  {uid:'CAT1',type:'category',name:'文字',lists:['CLA1','CLB1']},
  {uid:'CLA1',type:'class',name:'符文66',lists:['GRA1']},
  {uid:'CLB1',type:'class',name:'政德文化',lists:['GRB1']},
  {uid:'GRA1',type:'group',name:'靈魂',lists:['ITA1']},
  {uid:'GRB1',type:'group',name:'文化',lists:['ITB1']},
  {uid:'ITA1',type:'item',name:'靈',lists:['心']},
  {uid:'ITB1',type:'item',name:'文化',lists:['月']}
 ];
 const stored=new Map();
 let text='心月';
 const analyze=async classUid=>reanalyzeKeywordClass({
  classUid,treeRows:records,
  readPage:async({offset})=>offset?[]:[{uid:'Ab12Cd34',content:text}],
  writeNode:async ({uid,uid_lists})=>stored.set(uid,uid_lists),
  finalize:async()=>{}
 });
 await analyze('CLA1');
 await analyze('CLB1');
 assert.deepEqual(stored.get('GRA1'),['Ab12Cd34']);
 assert.deepEqual(stored.get('GRB1'),['Ab12Cd34']);
 assert.deepEqual(stored.get('ITA1'),[{uid:'Ab12Cd34',times:1}]);
 assert.deepEqual(stored.get('ITB1'),[{uid:'Ab12Cd34',times:1}]);
 text='月';
 await analyze('CLA1');
 assert.deepEqual(stored.get('GRA1'),[]);
 assert.deepEqual(stored.get('ITA1'),[]);
 assert.deepEqual(stored.get('GRB1'),['Ab12Cd34']);
 assert.deepEqual(stored.get('ITB1'),[{uid:'Ab12Cd34',times:1}]);
});

test('duplicate Group labels resolve to distinct UID hit lists during reanalysis',async()=>{
 const catalog=[
  {uid:'CAT1',type:'category',name:'總稱',lists:['CL01']},
  {uid:'CL01',type:'class',name:'符文66',lists:['GR01','GR02']},
  {uid:'GR01',type:'group',name:'靈魂組',lists:['IT01']},
  {uid:'GR02',type:'group',name:'靈魂組',lists:['IT02']},
  {uid:'IT01',type:'item',name:'靈',lists:['潛意識']},
  {uid:'IT02',type:'item',name:'靈',lists:['情緒']}
 ];
 const saved=[];
 const stats=await reanalyzeKeywordClass({
  classUid:'CL01',treeRows:catalog,pageSize:1,
  readPage:async({offset})=>offset?[]:[{uid:'Ab12Cd34',content:'情緒'}],
  writeNode:async row=>saved.push(row),finalize:async()=>{}
 });
 assert.deepEqual(saved.find(row=>row.uid==='GR01').uid_lists,[]);
 assert.deepEqual(saved.find(row=>row.uid==='GR02').uid_lists,['Ab12Cd34']);
 assert.equal(stats.matchedDocuments,1);
});

test('server-capped short pages continue until an empty page, not an offset boundary',async()=>{
 const docs=Array.from({length:7},(_,i)=>({
   uid:'Ab'+String(i+1).padStart(6,'0'),content:'心情'
 }));
 const calls=[],saved=[];
 const stats=await reanalyzeKeywordClass({
   classUid:'CL01',treeRows:source,pageSize:10,expectedCount:7,
   readPage:async({offset,limit})=>{
     calls.push({offset,limit});
     return docs.slice(offset,offset+2);
   },
   writeNode:async value=>saved.push(value),finalize:async()=>{}
 });
 assert.deepEqual(calls.map(call=>call.offset),[0,2,4,6,7]);
 assert.equal(stats.analyzedDocuments,7);
 assert.equal(stats.matchedDocuments,7);
 assert.equal(saved.find(x=>x.uid==='GR01').uid_lists.length,7);
});

test('incomplete COUNT or changed data never writes partial Keyword results',async()=>{
 let writes=0,finalized=false;
 await assert.rejects(reanalyzeKeywordClass({
   classUid:'CL01',treeRows:source,pageSize:200,expectedCount:3,
   readPage:async({offset})=>offset?[]:[{uid:'Ab000001',content:'心情'}],
   writeNode:async()=>{writes++},
   finalize:async()=>{finalized=true}
 }),/Galaxy 分頁筆數不一致/);
 assert.equal(writes,0);
 assert.equal(finalized,false);
});


test('prepared Keyword Class returns the same UID hits across pages and can be reused',()=>{
 const create=createKeywordUidDocumentClassifier(source,'CL01');
 const pages=[
   [{uid:'Ab123456',content:'心情心情'}, {uid:'Ab123457',content:'月光'}],
   [{uid:'Ab123458',content:'心情'}, {uid:'Ab123459',content:'靈魂'}]
 ];
 for(const docs of pages)
   assert.deepEqual(create(docs),classifyKeywordDocumentsByUid(docs,source,'CL01'));
});

test('unified Anchor analysis emits aggregate total and deduplicated UID strings only',async()=>{
 const docs=[
  {uid:'Ab12Cd34',content:'心情心情'},
  {uid:'aB12Cd34',content:'心情'}
 ];
 const saved=[];
 const stats=await reanalyzeKeywordClass({
  classUid:'CL01',treeRows:source,pageSize:1,compactResults:true,
  readPage:async({offset,limit})=>docs.slice(offset,offset+limit),
  writeNode:async row=>saved.push(row),finalize:async()=>{}
 });
 const item=saved.find(x=>x.type==='item'),group=saved.find(x=>x.type==='group');
 assert.deepEqual(item.uid_lists.uidlists,['Ab12Cd34','aB12Cd34']);
 assert.equal(item.uid_lists.total,2);
 assert.deepEqual(group.uid_lists,{total:2,uidlists:['Ab12Cd34','aB12Cd34']});
 assert.equal(stats.matchedDocuments,2);
 assert.equal(JSON.stringify(saved).includes('"times"'),false);
});
