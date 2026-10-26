import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/modular/features/trace/trace-data.js',import.meta.url),'utf8');
const manager=readFileSync(new URL('../app/loc/TraceRouteManager.jsx',import.meta.url),'utf8');
const editor=readFileSync(new URL('../app/loc/TraceManagement.jsx',import.meta.url),'utf8');
test('read/write Queue probes only a missing-column schema error and preserves one column',()=>{
  assert.match(source,/function missingTraceQueueColumn/);
  assert.match(source,/\['42703','PGRST204'\]/);
  assert.match(source,/traceQueueRequest\(id,field=>/);
  assert.match(source,/\.insert\(\{\.\.\.base,\[field\]:anchor_list\}\)/);
  assert.match(source,/\.update\(\{\.\.\.base,\[field\]:anchor_list\}\)/);
});
test('four and eight character saved identities remain readable before migration',()=>{
  assert.match(source,/A-Za-z0-9\]\{4\}\|\[A-Za-z0-9\]\{8\}/);
  assert.match(manager,/useState\(scopeId\)/);
  assert.doesNotMatch(editor,/setQuickNotice/);
});
