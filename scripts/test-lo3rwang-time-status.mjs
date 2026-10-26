import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {timeReadColumns} from '../app/loc/time-read-columns.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('lo3rwang Time never SELECTs the retired status column',()=>{
  assert.equal(timeReadColumns('silver.lo3rwang_time'),'uid,type,title,description,address,anchor_ids');
  assert.equal(timeReadColumns('lo3rwang_time'),'uid,type,title,description,address,anchor_ids');
  assert.ok(!timeReadColumns('silver.lo3rwang_time').split(',').includes('status'));
});
test('other Scope Time and local SQLite retain their existing schema',()=>{
  assert.ok(timeReadColumns('silver.lrunes_time').endsWith(',status'));
  assert.ok(timeReadColumns('silver.other_time').endsWith(',status'));
  assert.ok(timeReadColumns('local_time').endsWith(',status'));
});
test('Culture time readers and editor use the same column contract',()=>{
  const culture=read('app/loc/culture-query.js');
  const editor=read('app/modular/features/CultureTimelineEditor.jsx');
  assert.match(culture,/columns:timeReadColumns\(table\)/);
  assert.match(editor,/columns:timeReadColumns\(timeTable\)/);
  assert.doesNotMatch(culture,/const TIME_COLUMNS=/);
  assert.doesNotMatch(editor,/const TIME_COLUMNS=/);
  assert.doesNotMatch(editor,/status:''/);
});
