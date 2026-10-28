import test from 'node:test';
import assert from 'node:assert/strict';
import {EDIT_OPERATION_TTL_MS,EDIT_IDLE_TTL_MS,EDIT_SESSION_TTL_MS,
  editorSessionStatus,touchEditorSession,assertEditorSession,clearEditorSession} from '../app/loc/edit-session-ttl.mjs';
import {readFileSync} from 'node:fs';
const store=()=>{
  const rows=new Map();
  return {getItem:k=>rows.get(k)||null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};
};
test('5m operation, 30m idle and 2h edit session windows',()=>{
  assert.equal(EDIT_OPERATION_TTL_MS,300000);
  assert.equal(EDIT_IDLE_TTL_MS,1800000);
  assert.equal(EDIT_SESSION_TTL_MS,7200000);
});
test('ordinary activity renews idle window but not maximum editing time',()=>{
  const storage=store();
  assert.equal(touchEditorSession(storage,10000000),true);
  assert.equal(touchEditorSession(storage,10000000+29*60000),true);
  assert.equal(editorSessionStatus(storage,10000000+58*60000).expired,false);
  assert.equal(editorSessionStatus(storage,10000000+2*3600000).expired,true);
});
test('idle timeout remains locked after a late click, sign out clears lock',()=>{
  const storage=store();
  touchEditorSession(storage,10000000);
  assert.equal(touchEditorSession(storage,10000000+EDIT_IDLE_TTL_MS+1),false);
  assert.throws(()=>assertEditorSession(storage,10000000+EDIT_IDLE_TTL_MS+2),/重新登入/);
  clearEditorSession(storage);
  assert.equal(assertEditorSession(storage,10000000+EDIT_IDLE_TTL_MS+3),true);
});
test('cancel remains available, logout and unmount release stale operations',()=>{
  const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
  const dock=read('app/modular/edit-dock.jsx');
  const shell=read('app/AppShell.jsx');
  const timeline=read('app/loc/TimelinePlaceManager.jsx');
  const editor=read('app/modular/features/CultureTimelineEditor.jsx');
  assert.match(dock,/releaseOperation\(\);\s*clearEditor\(\);/);
  assert.match(dock,/EDIT_OPERATION_TTL_MS/);
  assert.match(dock,/clearEditorSession\(window\.sessionStorage\)/);
  assert.match(shell,/disabled=\{editDock\.busy&&tab\.action!=='cancel'\}/);
  assert.match(timeline,/runRef\.current\+\+;\s*workerRef\.current\?\.abort\(\)/);
  assert.match(editor,/refresh\(\);reset\(\);setMessage\('已儲存。'\);return true/);
});
