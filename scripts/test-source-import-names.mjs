import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canonicalImportSourceName,inferImportSourceFromFilename} from '../app/loc/source-name.mjs';
import {grantHomeEditorAccess,readHomeEditorAccess,clearHomeEditorAccess} from '../app/loc/home-edit-access.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('system brand source spellings and custom Scope labels',()=>{
  assert.equal(canonicalImportSourceName('FaceBook',['Facebook']),'Facebook');
  assert.equal(canonicalImportSourceName('THREADS',['Threads']),'Threads');
  assert.equal(canonicalImportSourceName('MYBLOG',[],['MyBlog']),'MyBlog');
  assert.equal(canonicalImportSourceName('My Words'),'My Words');
  assert.equal(inferImportSourceFromFilename('threads_2026.json'),'Threads');
});
test('URL edit parameter cannot bootstrap a public editor',()=>{
  const culture=read('app/modular/features/Culture.jsx');
  const search=read('app/modular/features/Search.jsx');
  const management=read('app/loc/SearchManagement.jsx');
  assert.match(culture,/canUseScopeEditor&&searchParams\?\.get\('edit'\)==='1'/);
  assert.doesNotMatch(culture,/if\(isTimeEditingView.*editDock\?\.begin/);
  assert.match(search,/if\(!managementMode&&\(!publicScopeEditing\|\|result.scopeId!==scopeId\)\)return/);
  assert.match(management,/account\.user&&editDock\?\.active&&editDock\.scopeId===scopeId/);
});

test('home editor re-entry requires the verified entry marker and expires',()=>{
  const map=new Map();
  const storage={getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
  grantHomeEditorAccess(storage,'lo3rwang','u-1',10000);
  assert.equal(readHomeEditorAccess(storage,10001)?.scopeId,'lo3rwang');
  assert.equal(readHomeEditorAccess(storage,10000+7200000),null);
  clearHomeEditorAccess(storage);
  assert.equal(readHomeEditorAccess(storage,10001),null);
  const source=read('app/loc/HomeEditModeRestore.jsx');
  assert.match(source,/marker.userId===result\?\.user\?\.id/);
  assert.match(source,/canManageScopeSync\(scopeId\)/);
});
