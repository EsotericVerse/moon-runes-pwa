import test from 'node:test';
import assert from 'node:assert/strict';
import {keywordTreeCatalog,keywordTreeMetrics} from '../app/loc/keyword-tree-report.mjs';
const rows=[
 {uid:'CAT1',type:'category',name:'符文',desc:'',lists:['CL01','CL02'],uid_lists:[]},
 {uid:'CL01',type:'class',name:'符文66',desc:'',lists:['GR01','GR02'],uid_lists:[]},
 {uid:'CL02',type:'class',name:'符文24',desc:'',lists:[],uid_lists:[]},
 {uid:'GR01',type:'group',name:'靈魂',desc:'',lists:['IT01','IT02'],uid_lists:['Ab12Cd34']},
 {uid:'GR02',type:'group',name:'連結',desc:'',lists:['IT03'],uid_lists:['ab12Cd34']},
 {uid:'IT01',type:'item',name:'靈',desc:'',lists:['感'],uid_lists:[{uid:'Ab12Cd34',times:3},{uid:'ab12Cd34',times:1}]},
 {uid:'IT02',type:'item',name:'魂',desc:'',lists:['意志'],uid_lists:[{uid:'Ab12Cd34',times:2}]},
 {uid:'IT03',type:'item',name:'向',desc:'',lists:['方向'],uid_lists:[{uid:'ab12Cd34',times:4}]}
];
test('Culture and Statistics share Group membership and Item hits',()=>{
 const s=keywordTreeMetrics(rows,'CL01');
 assert.deepEqual(s.groups.map(x=>x.document_count),[1,1]);
 assert.deepEqual(s.items.map(x=>x.hit_count),[4,2,4]);
 assert.equal(s.document_count,2);
 assert.equal(keywordTreeCatalog(rows,'CL01').groups[0].items[0].uid,'IT01');
});
test('Trace filters UID membership without parsing article content',()=>{
 const s=keywordTreeMetrics(rows,'CL01',{articleUids:['Ab12Cd34']});
 assert.deepEqual(s.groups.map(x=>x.document_count),[1,0]);
 assert.deepEqual(s.items.map(x=>x.hit_count),[1,1,0]); // No per-article times retained for filtered selections
});
test('Multiple Classes in one Category remain distinct',()=>{
 const s=keywordTreeMetrics(rows,'CL02');
 assert.equal(s.groups.length,0);
});
test('Reject two winning Groups for one article',()=>{
 const bad=rows.map(r=>r.uid==='GR02'?{...r,uid_lists:['Ab12Cd34']}:r);
 assert.throws(()=>keywordTreeMetrics(bad,'CL01'),/multiple Groups/);
});
