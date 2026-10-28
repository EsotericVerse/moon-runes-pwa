import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isChunkLoadFailure,recoverChunkOnce} from '../app/loc/chunk-recovery.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const browser=(url,confirm=true)=>{
  const u=new URL(url),memory=new Map();
  let reloads=0,prompts=0;
  return {
    location:{protocol:u.protocol,pathname:u.pathname,search:u.search,
      reload:()=>{reloads++;}},
    sessionStorage:{getItem:key=>memory.get(key)||null,setItem:(key,v)=>memory.set(key,v)},
    confirm:()=>{prompts++;return confirm;},
    get reloads(){return reloads;},get prompts(){return prompts;}
  };
};
test('manage links use a fresh static document, not RSC navigation',()=>{
  const link=read('app/modular/ScopeLink.jsx');
  assert.match(link,/isManagementHref\(href\)/);
  assert.match(link,/<a href=\{href\}/);
  assert.match(link,/new URL\(String\(href\)/);
});
test('real failed chunks recover once; unrelated errors do not',()=>{
  const w=browser('https://loc.example/lo3rwang/manage/?section=placeManage');
  const chunk=Error('Failed to load chunk /_next/static/chunks/missing.js from module');
  assert.equal(isChunkLoadFailure(chunk),true);
  void recoverChunkOnce(chunk,{browser:w,now:10000000});
  assert.equal(w.reloads,1);
  assert.throws(()=>recoverChunkOnce(chunk,{browser:w,now:10000001}),/Failed to load chunk/);
  assert.equal(w.reloads,1);
  const missingRpc=Error('404: rpc/preview_timeline_place_page_json');
  assert.equal(isChunkLoadFailure(missingRpc),false);
  assert.throws(()=>recoverChunkOnce(missingRpc,{browser:w,now:12000000}),/404/);
});
test('editing requires consent, declining never reloads or locks out',()=>{
  const w=browser('https://loc.example/lo3rwang/manage/?edit=1',false);
  const error=Error('ChunkLoadError: Loading chunk 12 failed');
  assert.throws(()=>recoverChunkOnce(error,{browser:w,now:10000000}),/ChunkLoadError/);
  assert.equal(w.prompts,1);
  assert.equal(w.reloads,0);
});
test('non-https native file views never refresh',()=>{
  const w=browser('file:///local/manage/index.html');
  assert.throws(()=>recoverChunkOnce(Error('ChunkLoadError'),{browser:w}),/ChunkLoadError/);
  assert.equal(w.reloads,0);
});
test('management links select real sections and preserve legacy links',()=>{
  const shell=read('app/AppShell.jsx');
  const management=read('app/loc/ScopeManagement.jsx');
  assert.match(shell,/editTabHref\('manage','section','placeManage'\)/);
  assert.match(shell,/editTabHref\('trace\/manage','section','traceMap'\)/);
  assert.match(management,/traceAnchor:isLoc\?'traceMap':'placeManage'/);
});
test('both management lazy entries use the same recovery',()=>{
  assert.match(read('app/loc/LocApp.jsx'),/import\('\.\/ScopeManagement'\)\.catch\(recoverChunkOnce\)/);
  assert.match(read('app/loc/ScopeManagement.jsx'),/import\('\.\/PlaceManagement'\)\.catch\(recoverChunkOnce\)/);
  assert.match(read('app/AppShell.jsx'),/window\.addEventListener\('unhandledrejection',recover\)/);
});

test('LunaRunes has the same owner-authorized keyword editor as other Scopes',()=>{
  const shell=read('app/AppShell.jsx');
  const page=read('app/modular/features/KeywordSettings.jsx');
  const route=read('app/lrunes/statics/keywords/page.jsx');
  assert.doesNotMatch(shell,/navScopeId!==['\"]lrunes['\"]/);
  assert.doesNotMatch(page,/scopeId!==['\"]lrunes['\"]/);
  assert.match(shell,/editTabHref\('statics\/keywords','edit','1'\)/);
  assert.match(page,/account\.canManageScopeSync\(scopeId\)/);
  assert.match(route,/forcedView=\"keywords\" forcedScope=\"lrunes\"/);
});
