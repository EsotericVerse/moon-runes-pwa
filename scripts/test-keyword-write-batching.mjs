import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {descendantsOfKeyword} from '../app/loc/keyword-tree.mjs';

const code=readFileSync(new URL('../app/loc/db-contract.mjs',import.meta.url),'utf8');
const from=code.indexOf('  async function resetKeywordClassification(');
const to=code.indexOf('  async function readKeywordClass(',from);
assert.ok(from>=0&&to>from,'UID-tree reset must exist');
const body=code.slice(from,to);

test('reset erases only the active Class Group/Item uid_lists',()=>{
 assert.match(body,/descendantsOfKeyword/);
 assert.match(body,/node=>node.type==='group'\|\|node.type==='item'/);
 assert.match(body,/update\(\{uid_lists:\[\]\}\)/);
 assert.match(body,/\.eq\('uid',row.uid\)/);
 assert.doesNotMatch(body,/apply_keyword_classification|\.update\(\{class_id|galaxy/);
});
test('stale analysis marker is cleared before partial Keyword writes',()=>{
 assert.ok(body.indexOf('staticstime:null')<body.indexOf('for(const row of children)'));
});
test('only Group and Item descendants are reset',()=>{
 const rows=[
  {uid:'C001',type:'category',name:'符文',lists:['L001']},
  {uid:'L001',type:'class',name:'符文66',lists:['G001']},
  {uid:'G001',type:'group',name:'靈魂',lists:['I001']},
  {uid:'I001',type:'item',name:'靈',lists:['感']}
 ];
 const resetNodes=descendantsOfKeyword(rows,'L001').filter(row=>row.type==='group'||row.type==='item');
 assert.deepEqual(resetNodes.map(x=>x.uid),['G001','I001']);
});
