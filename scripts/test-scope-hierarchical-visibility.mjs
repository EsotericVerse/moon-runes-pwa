import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Time and Trace use the same boolean invisible attribute',()=>{
  const time=read('app/modular/features/CultureTimelineEditor.jsx');
  const trace=read('app/modular/features/trace/trace-data.js');
  assert.match(time,/TIME_COLUMNS=.*invisible/);
  assert.match(time,/invisible:Boolean\(draft.invisible\)/);
  assert.match(trace,/CORE_COLUMNS=.*invisible/);
  assert.match(trace,/invisible:normalizedInvisible\(invisible\)/);
  assert.doesNotMatch(time+trace,/hidden_depth|hiddenDepth|visibilityDepth/);
});

test('editors set individual visibility without ancestor depth',()=>{
  const time=read('app/modular/features/CultureTimelineEditor.jsx');
  const manager=read('app/loc/TraceRouteManager.jsx');
  const anchor=read('app/loc/TraceManagement.jsx');
  assert.match(time,/bulkSetVisibility\(true\)/);
  assert.match(time,/bulkSetVisibility\(false\)/);
  assert.match(manager,/applyBulkVisibility\(true\)/);
  assert.match(manager,/applyBulkVisibility\(false\)/);
  assert.match(anchor,/bulkApply\(true\)/);
  assert.match(anchor,/bulkApply\(false\)/);
  assert.doesNotMatch(time+manager+anchor,/hidden_depth|hiddenDepth|bulkDepth|visibilityDepth/);
});

test('importers insert visible records, leaving historical migrations unchanged',()=>{
  const place=read('app/loc/import-place-anchors.mjs');
  const time=read('app/loc/import-time-anchors.mjs');
  assert.match(place,/anchor_list:\[\],invisible:false/);
  assert.match(time,/anchor_ids:\[\],invisible:false/);
  assert.doesNotMatch(place+time,/hidden_depth/);
});
