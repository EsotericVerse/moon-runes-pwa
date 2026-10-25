import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('LOC route editor selects an authorized source Scope, never filters to empty LOC-only mirrors',()=>{
  const src=read('app/loc/TraceManagement.jsx');
  assert.match(src,/const \[routeScopeId,setRouteScopeId\]=useState\(/);
  assert.match(src,/scopeId==='loc'\s*\?editableScopes\.includes\(routeScopeId\)\?routeScopeId:editableScopes\[0\]/);
  assert.match(src,/account\.canManageScopeSync\(source\)/);
  assert.match(src,/spatial\.anchors\.filter\(row=>row\.source_scope===writeScopeId\)/);
  assert.match(src,/input=\{scopeId:writeScopeId,title,description,anchorUids:selected,anchors\}/);
  assert.match(src,/可編輯的作品範圍/);
});

test('Trace save result is confirmed by a fresh read before clearing the story and stops',()=>{
  const src=read('app/loc/TraceManagement.jsx');
  assert.match(src,/const written=editingUid\s*\?await updateTraceMap/);
  assert.match(src,/const fresh=await reload\(\)/);
  assert.match(src,/fresh\.maps\.find\(row=>row\.uid===saved\.uid/);
  assert.match(src,/setNoticeError\(true\)/);
  assert.match(src,/useEditDockForm\(\{save,isDirty:\(\)=>dirty,isBusy:\(\)=>busy\}\)/);
  const writes=read('app/modular/features/trace/trace-data.js');
  assert.match(writes,/dbAuthRelation\(relation\(id\)\)\.insert\(data\)\.select\('uid'\)\.single\(\)/);
  assert.match(writes,/chosen\.some\(uid=>!existing\.has\(uid\)\)/);
});

test('a successful route edit refreshes public Trace without changing database policy',()=>{
  const src=read('app/loc/TraceManagement.jsx');
  assert.match(src,/revalidateServerMetadata\(\)/);
  assert.match(src,/cache\.invalidate\(\{queryKey:traceKey\('loc'\)\}\)/);
  assert.match(src,/row\.source_scope===writeScopeId/);
  assert.match(src,/deleteTraceMap\(\{scopeId:map\.source_scope,uid:map\.uid\}\)/);
  assert.match(read('app/modular/features/trace/TraceMap.jsx'),/selectedRouteUid/);
  assert.match(read('app/modular/features/trace/trace-map-engine.js'),/setSavedRoute/);
});
