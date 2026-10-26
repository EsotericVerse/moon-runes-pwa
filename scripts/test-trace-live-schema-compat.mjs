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

import {validTraceCoordinates,normalizedTraceCoordinates} from '../app/modular/features/trace/trace-anchor-coordinates.mjs';

test('spatial anchor preserves missing GPS without projecting an invented (0, 0)',()=>{
  assert.deepEqual(normalizedTraceCoordinates('',null),{longitude:null,latitude:null});
  assert.deepEqual(normalizedTraceCoordinates(null,undefined),{longitude:null,latitude:null});
  assert.equal(validTraceCoordinates(null,null),false);
  assert.equal(validTraceCoordinates('', ''),false);
  assert.deepEqual(normalizedTraceCoordinates('121.5','25.0'),{longitude:121.5,latitude:25});
  assert.deepEqual(normalizedTraceCoordinates(0,0),{longitude:0,latitude:0});
  assert.throws(()=>normalizedTraceCoordinates('121.5',''),/同時填寫/);
  assert.throws(()=>normalizedTraceCoordinates('200','25'),/同時填寫/);
  assert.equal(validTraceCoordinates([],[]),false);
});

test('anchor create and update both use nullable normalized coordinates',()=>{
  const data=readFileSync(new URL('../app/modular/features/trace/trace-data.js',import.meta.url),'utf8');
  assert.match(data,/export const validCoordinates=validTraceCoordinates/);
  assert.equal((data.match(/const coordinates=normalizedTraceCoordinates\(longitude,latitude\)/g)||[]).length,2);
  assert.match(data,/description:descriptionText\(description\),\.\.\.coordinates/);
  assert.match(data,/\.\.\.coordinates,radius_m:Number\(radius_m\)/);
});
