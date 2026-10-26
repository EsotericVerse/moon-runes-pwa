import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const columns="uid,type,title,description,address,anchor_ids";

test('Culture and Time editor never query retired status',()=>{
  const culture=read('app/loc/culture-query.js');
  const editor=read('app/modular/features/CultureTimelineEditor.jsx');
  assert.ok(culture.includes("const TIME_COLUMNS='"+columns+"'"));
  assert.ok(editor.includes("const TIME_COLUMNS='"+columns+"'"));
  assert.match(culture,/columns:TIME_COLUMNS/);
  assert.match(editor,/columns:TIME_COLUMNS/);
  assert.doesNotMatch(culture,/row\.status|\bstatus:row\.status/);
  assert.doesNotMatch(editor,/status:''|timeReadColumns/);
});
test('Culture timeline no longer propagates historical DB status',()=>{
  const timeline=read('app/modular/modules/culture-timeline/CultureTimeline.jsx');
  assert.doesNotMatch(timeline,/item\?\.status|old\.status|row\.status/);
});
test('only lo3rwang Time physical column is retired, not other scope or SQLite',()=>{
  const sql=read('supabase/migrations/20261027235950_drop_lo3rwang_time_status.sql');
  assert.match(sql,/ALTER TABLE silver\.lo3rwang_time DROP COLUMN status/);
  assert.doesNotMatch(sql,/ALTER TABLE silver\.lrunes_time|DROP TABLE|CASCADE/);
});
