import test from 'node:test';
import assert from 'node:assert/strict';
import {remapArchiveArticleUids} from '../app/loc/import-random-uids.mjs';
import {insertImportBatches} from '../app/loc/import-duplicate-check.mjs';

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

test('25,000 new-site articles are inserted in fixed batches without any comparison reads',async()=>{
  const articles=Array.from({length:25000},(_,n)=>({
    uid:String(n+1).padStart(8,'0'),site:'Facebook',
    createtime:'2020-01-01T00:00:00.000Z'
  }));
  let batches=0,inserted=0;
  const result=await insertImportBatches(articles,{
    batchSize:1000,
    writeBatch:async rows=>{
      batches++;
      inserted+=rows.length;
      return {count:rows.length};
    }
  });
  assert.equal(batches,25);
  assert.equal(inserted,25000);
  assert.equal(result.inserted,25000);
  assert.equal(result.conflicts,0);
});
