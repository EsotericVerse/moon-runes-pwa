import test from 'node:test';
import assert from 'node:assert/strict';
import {mappedImportValue,importRowsFromJson,validImportBatchSize,writeImportBatches} from '../app/loc/import-batch.mjs';

test('supports arrays, known containers and explicit nested collection paths',()=>{
  assert.equal(importRowsFromJson([{content:'甲'}]).length,1);
  assert.equal(importRowsFromJson({posts:[{content:'甲'},{content:'乙'}]}).length,2);
  assert.equal(importRowsFromJson({result:{entries:[{body:'三'}]}},'result.entries').length,1);
  assert.throws(()=>importRowsFromJson({result:{}},'result.entries'),/找不到資料陣列路徑/);
  assert.throws(()=>importRowsFromJson({unknown:[]}),/指定資料路徑/);
});

test('field mapping supports nested keys and preserves false values',()=>{
  const row={payload:{body:'文字',published_at:'2026-10-09'},published:'yes',searchable:false};
  assert.equal(mappedImportValue(row,'content',{content:'payload.body'}),'文字');
  assert.equal(mappedImportValue(row,'createtime',{createtime:'missing,payload.published_at'}),'2026-10-09');
  assert.equal(mappedImportValue(row,'searchable'),false);
  assert.equal(mappedImportValue(row,'title'),'');
});

test('only bounded batch sizes are accepted',()=>{
  assert.equal(validImportBatchSize('100'),100);
  assert.throws(()=>validImportBatchSize(201),/1～200/);
  assert.throws(()=>validImportBatchSize(0),/1～200/);
  assert.throws(()=>validImportBatchSize('other'),/1～200/);
});

test('each write awaits the previous chunk and emits actual completion',async()=>{
  const calls=[],progress=[];
  const result=await writeImportBatches([1,2,3,4,5],{
    batchSize:2,
    async writeBatch(batch){calls.push([...batch]);return {count:batch.length};},
    onProgress:p=>progress.push(p)
  });
  assert.deepEqual(calls,[[1,2],[3,4],[5]]);
  assert.deepEqual(progress.map(p=>p.completed),[2,4,5]);
  assert.equal(progress.at(-1).percent,100);
  assert.deepEqual(result,{completed:5,total:5,batches:3});
});

test('write failure reports confirmed progress and does not issue later batches',async()=>{
  const calls=[];
  await assert.rejects(writeImportBatches([1,2,3,4,5],{
    batchSize:2,
    async writeBatch(batch){calls.push([...batch]);if(batch[0]===3)throw Error('DB down');return {count:batch.length};}
  }),/已確認完成 2／5 筆/);
  assert.deepEqual(calls,[[1,2],[3,4]]);
});
