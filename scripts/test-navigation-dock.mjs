import test from 'node:test';
import assert from 'node:assert/strict';
import {NavigationPreferences} from '../app/modular/navigation-preferences.js';
const {DEFAULT_FAVORITES,parseFavorites,serializeFavorites,homeScopeForAccount}=NavigationPreferences.account;
import {navigationHref} from '../app/modular/scope-registry.js';
import fs from 'node:fs';
import vm from 'node:vm';
const {cleanFolderName,parseFavoriteFolders,serializeFavoriteFolders,visibleFavoriteLayout,normalizeFavoriteFolders}=NavigationPreferences.account.folders;

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
  assert.equal(navigationHref('loc','',true),'/index.html');
  assert.equal(navigationHref('loc','culture',true),'/culture/index.html');
  assert.equal(navigationHref('loc','statics',true),'/statics/index.html');
  assert.equal(navigationHref('lrunes','',true),'/lrunes/index.html');
  assert.equal(navigationHref('lrunes','culture',true),'/lrunes/culture/index.html');
  assert.equal(navigationHref('lo3rwang','statics',true),'/lo3rwang/statics/index.html');
  assert.equal(navigationHref('family1','governance',true),'/scope-shell/governance/index.html?scope=family1');
  assert.match(navigationHref('lrunes','culture',false),/^https:\/\//);
});
test('favorite folders are plain text, safe Unicode labels and stable per-folder IDs',()=>{
  const folders=[
    {id:'folder1234',label:'寫作與 月亮',scopes:['lrunes','lo3rwang']},
    {id:'folder9876',label:'工作',scopes:['family1']}
  ];
  const scalar=serializeFavoriteFolders(folders);
  assert.equal(scalar.startsWith('{'),false);
  assert.deepEqual(parseFavoriteFolders(scalar),folders);
  assert.equal(cleanFolderName('  測試\n目錄\t'), '測試 目錄');
});
test('folder membership never duplicates entries, overrides LOC, or grants permission',()=>{
  const folders=normalizeFavoriteFolders([
    {id:'folder1234',label:'作品',scopes:['lrunes','loc','lo3rwang','lrunes']},
    {id:'folder9876',label:'其他',scopes:['lrunes','family1']}
  ]);
  assert.deepEqual(folders[0].scopes,['lrunes','lo3rwang']);
  assert.deepEqual(folders[1].scopes,['family1']);
  const layout=visibleFavoriteLayout(['lrunes','lo3rwang','loc','family1','novel'],folders);
  assert.deepEqual(layout.direct,['novel']);
  assert.deepEqual(layout.directories[0].scopes,['lrunes','lo3rwang']);
  assert.deepEqual(layout.directories[1].scopes,['family1']);
  assert.deepEqual(parseFavoriteFolders('bad\tbroken%ZZ\tlrunes'),[]);
});
test('one navigation object composes account and local-device capabilities without crossing storage boundaries',()=>{
  const {account,device}=NavigationPreferences;
  assert.equal(account.HOME_SETTING_KEY,'loc-home-scope-v1');
  assert.equal(account.parseFavorites(null).length,3);
  const storage={getItem:key=>key===device.MOBILE_HOME_STORAGE_KEY?'myphone':'true'};
  assert.equal(device.mobileHomepageChoice(storage),'myphone');
  assert.equal(device.mobileHomepageEnabled(storage),true);
  assert.equal(device.mobileFavoriteEnabled(storage),true);
  assert.equal(device.mobileHomeHref(true),'/my-phone/index.html');
  assert.equal(account.homeScopeForAccount('myphone',{user:{id:'one'}},['myphone']),'loc');
  assert.equal(device.MOBILE_HOME_STORAGE_KEY.startsWith('loc-device-'),true);
});


test('account favorite folders compose with account preferences without granting permissions',()=>{
  const account=NavigationPreferences.account;
  const folders=account.folders;
  const raw=folders.serializeFavoriteFolders([{id:'alpha0001',label:'我的空間',scopes:['lrunes','loc']}]);
  const restored=folders.parseFavoriteFolders(raw);
  assert.deepEqual(restored,[{id:'alpha0001',label:'我的空間',scopes:['lrunes']}]);
  const layout=folders.visibleFavoriteLayout(account.parseFavorites('lrunes,lo3rwang,loc'),restored);
  assert.deepEqual(layout.direct,['lo3rwang']);
  assert.deepEqual(layout.directories[0].scopes,['lrunes']);
  assert.equal(account.homeScopeForAccount('lrunes',{user:null},['lrunes']),'loc');
});
