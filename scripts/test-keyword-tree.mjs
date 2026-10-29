import test from 'node:test';
import assert from 'node:assert/strict';
import {indexKeywordTree,descendantsOfKeyword,keywordClassCatalog,rebuildKeywordUidLists} from '../app/loc/keyword-tree.mjs';
const rows=[
 {uid:'S0p1',type:'category',name:'符文',desc:'符文各種',lists:['C0a1','C0a2'],uid_lists:[]},
 {uid:'C0a1',type:'class',name:'符文66',desc:'66符文',lists:['G001'],uid_lists:[]},
 {uid:'C0a2',type:'class',name:'符文24',desc:'24符文',lists:[],uid_lists:[]},
 {uid:'G001',type:'group',name:'靈魂',desc:'靈魂組',lists:['I001','I002'],uid_lists:[]},
 {uid:'I001',type:'item',name:'靈',desc:'靈之符文',lists:['感','變','覺','精神','麻木','失神','遲鈍','麻醉'],uid_lists:[]},
 {uid:'I002',type:'item',name:'魂',desc:'魂之符文',lists:['意志'],uid_lists:[]}
];
test('Anchor-like UID recursion resolves all four types, no IDs or fixed cardinality',()=>{
 const tree=indexKeywordTree(rows);
 assert.equal(tree.index.size,6);
 assert.deepEqual(descendantsOfKeyword(rows,'C0a1',{type:'item'}).map(item=>item.name),['靈','魂']);
 const {catalog}=keywordClassCatalog(rows,'C0a1');
 assert.deepEqual(catalog.map(item=>item.uid),['I001','I002']);
 assert.deepEqual(catalog[0].keywords,rows[4].lists);
 assert.equal(Object.keys(rows[0]).join(','),'uid,type,name,desc,lists,uid_lists');
});
test('Class UID lists stays empty; Group and Item use same field differently',()=>{
 const updated=rebuildKeywordUidLists(rows,'C0a1',[
  {uid:'Ab12Cd34',classification_group:'靈魂',hits:[{uid:'I001',times:3}]},
  {uid:'aB12Cd34',classification_group:'靈魂',hits:[{uid:'I001',times:2},{uid:'I002',times:1}]}
 ]);
 const group=updated.find(row=>row.uid==='G001'),cl=updated.find(row=>row.uid==='C0a1'),item=updated.find(row=>row.uid==='I001');
 assert.deepEqual(group.uid_lists,['Ab12Cd34','aB12Cd34']);
 assert.deepEqual(cl.uid_lists,[]);
 assert.deepEqual(item.uid_lists,[{uid:'Ab12Cd34',times:3},{uid:'aB12Cd34',times:2}]);
 assert.deepEqual(rows[4].uid_lists,[]);
});
test('Rejects broken UID links, duplicate parents and misleading name references',()=>{
 assert.throws(()=>indexKeywordTree([...rows.slice(0,1),{...rows[1],lists:['I001']},...rows.slice(2)]),/hierarchy/);
 assert.throws(()=>indexKeywordTree([...rows,{uid:'S0p2',type:'category',name:'Other',lists:['C0a1']}]),/multiple parents/);
 assert.throws(()=>indexKeywordTree([...rows,{uid:'G002',type:'group',name:'Alt',lists:['靈']}]),/UID/);
});
