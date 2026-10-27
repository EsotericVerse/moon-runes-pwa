import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCHIVE_WRITE_WINDOW,createArchiveWriteWindow} from '../app/loc/archive-write-window.mjs';

test('30,000 records are flushed without imposing a whole-archive cap',async()=>{
  assert.equal(ARCHIVE_WRITE_WINDOW,30000);
  const sizes=[];let total=0;
  const window=createArchiveWriteWindow(async rows=>{sizes.push(rows.length);total+=rows.length;});
  for(let file=0;file<165;file++){
    for(let row=0;row<2100;row++)window.add(file*2100+row);
    await window.flush();
  }
  await window.flush(true);
  assert.equal(total,346500);
  assert.deepEqual(sizes,[...Array(11).fill(30000),16500]);
  assert.equal(window.pendingCount,0);
});

test('last partial segment is retained, including one record past 30k',async()=>{
  const sizes=[];
  const collector=createArchiveWriteWindow(async rows=>{sizes.push(rows.length)});
  for(let i=0;i<30001;i++)collector.add(i);
  await collector.flush();
  assert.deepEqual(sizes,[30000]);
  assert.equal(collector.pendingCount,1);
  await collector.flush(true);
  assert.deepEqual(sizes,[30000,1]);
});

test('failed write retains its pending segment for a safe retry',async()=>{
  let writes=0;
  const collector=createArchiveWriteWindow(async rows=>{
    writes++;
    if(writes===1)throw Error('database unavailable');
    assert.deepEqual(rows,[1,2]);
  },{size:2});
  collector.add(1);collector.add(2);
  await assert.rejects(collector.flush(),/database unavailable/);
  assert.equal(collector.pendingCount,2);
  await collector.flush(true);
  assert.equal(collector.pendingCount,0);
});
