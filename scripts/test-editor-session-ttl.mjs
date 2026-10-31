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
  assert.throws(()=>assertEditorSession(storage,10000000+EDIT_IDLE_TTL_MS+2),/重新驗證編輯權限/);
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

test('expired editor locks editing without signing out the Google/Supabase account',()=>{
  const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
  const dock=read('app/modular/edit-dock.jsx');
  const ttl=read('app/loc/edit-session-ttl.mjs');
  const auth=read('app/loc/db-contract.mjs');
  assert.match(dock,/const expire=\(\)=>end\(\)/);
  assert.match(dock,/window\.addEventListener\('loc-editor-session-expired',expire\)/);
  assert.doesNotMatch(dock,/signOutAccount/);
  assert.match(dock,/const invalidated=event==='SIGNED_OUT'\|\|identityChanged/);
  assert.match(dock,/clearEditorSession\(window\.sessionStorage\)/);
  assert.match(ttl,/window\.dispatchEvent\(new Event\('loc-editor-session-expired'\)\)/);
  assert.doesNotMatch(ttl,/signOutAccount/);
  assert.match(ttl,/重新驗證編輯權限後再寫入/);
  assert.match(auth,/async function signOutAccount\(\)/);
});

test('explicit verified homepage edit entry clears an expired edit lock before restarting',()=>{
  const code=readFileSync(new URL('../app/loc/ScopeHomeEditEntry.jsx',import.meta.url),'utf8');
  const authenticated=code.indexOf('const result=await account.refresh()');
  const authorized=code.indexOf('if(!allowed)');
  const reset=code.indexOf('clearEditorSession(window.sessionStorage);',authenticated);
  const granted=code.indexOf('grantHomeEditorAccess(window.sessionStorage,scopeId,result.user.id)');
  const restarted=code.indexOf('editDock?.begin(scopeId)');
  assert.ok(authenticated>=0&&authorized>authenticated&&reset>authorized&&granted>reset&&restarted>granted,
    'edit-lock reset must happen only after verifying user and management permission');
  const storage=store();
  const start=10000000;
  touchEditorSession(storage,start);
  assert.equal(touchEditorSession(storage,start+EDIT_IDLE_TTL_MS+1),false);
  clearEditorSession(storage);
  assert.equal(touchEditorSession(storage,start+EDIT_IDLE_TTL_MS+2),true);
});
