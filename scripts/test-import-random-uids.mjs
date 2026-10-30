import test from 'node:test';
import assert from 'node:assert/strict';
import {remapArchiveArticleUids} from '../app/loc/import-random-uids.mjs';

const idGenerator=()=>{
  let i=0;
  return ()=>String(++i).padStart(8,'0');
};
test('random IDs replace archive hashes and preserve parent/child relations',()=>{
  const parent={uid:'HASH0001',source_id:null,target_id:['HASH0002','HASH0003']};
  const children=[{uid:'HASH0002',source_id:'HASH0001'},
    {uid:'HASH0003',source_id:'HASH0001'}];
  const result=remapArchiveArticleUids([parent,...children],idGenerator());
  assert.deepEqual(result.map(row=>row.uid),['00000001','00000002','00000003']);
  assert.deepEqual(result[0].target_id,[result[1].uid,result[2].uid]);
  assert.equal(result[1].source_id,result[0].uid);
  assert.equal(result[2].source_id,result[0].uid);
  assert.equal(parent.uid,'HASH0001');
});
test('distinct posts with the same source-hash or timestamp are given fresh IDs',()=>{
  const used=new Set(),generate=idGenerator();
  const a=remapArchiveArticleUids([{uid:'SAMEHASH',createtime:'2026-01-01'}],generate,used);
  const b=remapArchiveArticleUids([{uid:'SAMEHASH',createtime:'2026-01-01'}],generate,used);
  assert.notEqual(a[0].uid,b[0].uid);
  assert.equal(used.size,2);
});
test('random ID collisions inside an archive are regenerated before writing',()=>{
  const used=new Set(['00000001']);
  const result=remapArchiveArticleUids([{uid:'HASH0001'}],idGenerator(),used);
  assert.equal(result[0].uid,'00000002');
  assert.equal(used.size,2);
});
test('invalid repeated UID in the same source record does not silently merge posts',()=>{
  assert.throws(()=>remapArchiveArticleUids([{uid:'HASH0001'},{uid:'HASH0001'}],idGenerator()),/重複或空白/);
});
