import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FAVORITES,parseFavorites,serializeFavorites,homeScopeForAccount} from '../app/modular/navigation-preferences.mjs';
import {navigationHref} from '../app/modular/nav-destinations.mjs';
import fs from 'node:fs';

test('anonymous users start with three favorite workspaces and LOC homepage',()=>{
  assert.deepEqual(parseFavorites(null),DEFAULT_FAVORITES);
  assert.deepEqual(parseFavorites(undefined),DEFAULT_FAVORITES);
  assert.equal(homeScopeForAccount('lrunes',{user:null},['lrunes']),'loc');
});
test('favorite preference is plain, normalized text and can be cleared',()=>{
  assert.equal(serializeFavorites(['lrunes','lrunes','family1','../bad','admin']),'lrunes,family1');
  assert.deepEqual(parseFavorites('lrunes, family1,lrunes,admin'),['lrunes','family1']);
  assert.deepEqual(parseFavorites(''),[]);
});
test('preferred homepage never confers Scope authority',()=>{
  const scopeAccount={user:{id:'user1'},authorizer:{scopeIds:['lrunes']},canManageGlobalSync:()=>false};
  assert.equal(homeScopeForAccount('lrunes',scopeAccount,['loc','lrunes','family1']),'lrunes');
  assert.equal(homeScopeForAccount('family1',scopeAccount,['loc','lrunes','family1']),'loc');
  assert.equal(homeScopeForAccount('nonexistent',scopeAccount,['loc','lrunes']),'loc');
  const adminAccount={...scopeAccount,canManageGlobalSync:()=>true};
  assert.equal(homeScopeForAccount('family1',adminAccount,['loc','lrunes','family1']),'family1');
});
test('native links resolve bundled routes, not external canonical domains',()=>{
  assert.equal(navigationHref('loc','',true),'/');
  assert.equal(navigationHref('lrunes','culture',true),'/lrunes/culture/');
  assert.equal(navigationHref('lo3rwang','statics',true),'/lo3rwang/statics/');
  assert.equal(navigationHref('family1','governance',true),'/scope/governance/?scope=family1');
  assert.match(navigationHref('lrunes','culture',false),/^https:\/\//);
});
test('one immutable six-key feature dock and explicit global settings route',()=>{
  const code=fs.readFileSync('app/AppShell.jsx','utf8');
  const css=fs.readFileSync('app/styles/bottom-navigation.css','utf8');
  const settings=fs.readFileSync('app/loc/GlobalSettings.jsx','utf8');
  assert.match(code,/\{id:'home'/);
  assert.match(code,/\['culture','statics','search','governance'\]/);
  assert.match(code,/\{id:'settings'.*href:'\/settings\/'\}/);
  assert.match(code,/className="scope-feature-dock"/);
  assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css,/box-shadow:/);
  assert.match(settings,/>每日符文<\/h2>/);
  assert.match(settings,/>我的最愛<\/h2>/);
  assert.match(settings,/>設定首頁<\/h2>/);
  assert.match(settings,/>登入<\/h2>/);
});
