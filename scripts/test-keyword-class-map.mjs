import test from 'node:test';
import assert from 'node:assert/strict';
import {keywordClassCatalog,indexKeywordTree} from '../app/loc/keyword-tree.mjs';
import {keywordTreeMetrics} from '../app/loc/keyword-tree-report.mjs';
function tree(groupCount=16,itemCount=130){
 const gids=Array.from({length:groupCount},(_,i)=>'G'+String(i).padStart(3,'0'));
 const iids=Array.from({length:itemCount},(_,i)=>'I'+String(i).padStart(3,'0'));
 return [
  {uid:'CAT1',type:'category',name:'分類',lists:['CLS1'],uid_lists:[]},
  {uid:'CLS1',type:'class',name:'任意 Class',lists:gids,uid_lists:[]},
  ...gids.map((uid,i)=>({uid,type:'group',name:'G'+i,
    lists:iids.filter((_,j)=>j%groupCount===i),uid_lists:[]})),
  ...iids.map((uid,i)=>({uid,type:'item',name:'I'+i,lists:['Token'+i],uid_lists:[]}))
 ];
}
test('unbounded Class has 16 independent Groups and 130 Items',()=>{
 const rows=tree(),catalog=keywordClassCatalog(rows,'CLS1');
 assert.equal(indexKeywordTree(rows).index.size,148);
 assert.equal(new Set(catalog.catalog.map(item=>item.group_uid)).size,16);
 assert.equal(catalog.catalog.length,130);
});
test('Group memberships come only from child UIDs, never matching names',()=>{
 const rows=tree(2,3),report=keywordTreeMetrics(rows,'CLS1');
 assert.equal(report.groups.length,2);
 assert.deepEqual(report.items.map(item=>item.uid),['I000','I002','I001']);
});
test('not a single Class-specific ID or item_no is required',()=>{
 const rows=tree(3,7);
 for(const row of rows)assert.deepEqual(Object.keys(row).filter(key=>/class_id|group_id|item_no/.test(key)),[]);
});
