import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FAVORITES,parseFavorites,serializeFavorites,homeScopeForAccount} from '../app/modular/navigation-preferences.mjs';
import {navigationHref} from '../app/modular/nav-destinations.mjs';
import fs from 'node:fs';
import {cleanFolderName,parseFavoriteFolders,serializeFavoriteFolders,visibleFavoriteLayout,normalizeFavoriteFolders} from '../app/modular/favorite-folders.mjs';

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

test('favorite folders are plain text, safe Unicode labels and stable per-folder IDs',()=>{
  const folders=[
    {id:'folder1234',label:'寫作與 月亮',scopes:['lrunes','lo3rwang']},
    {id:'folder9876',label:'工作',scopes:['family1']}
  ];
  const scalar=serializeFavoriteFolders(folders);
  assert.equal(scalar.startsWith('{'),false);
  assert.equal(scalar.includes('寫作與 月亮'),false);
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
test('NAV pins return to LOC, conditionally scrolls and expands directories as a second row',()=>{
  const shell=fs.readFileSync('app/AppShell.jsx','utf8');
  const rail=fs.readFileSync('app/modular/ScrollableScopeNav.jsx','utf8');
  const navCss=fs.readFileSync('app/styles/nav.css','utf8');
  const global=fs.readFileSync('app/globals.css','utf8');
  const settings=fs.readFileSync('app/loc/GlobalSettings.jsx','utf8');
  assert.doesNotMatch(shell,/scope-favorites-label/);
  assert.match(shell,/className="scope-nav-loc-home"/);
  assert.match(shell,/copy.nav.home/);
  assert.match(shell,/visibleFavoriteLayout\(preferences.favorites,preferences.folders\)/);
  assert.match(shell,/openFolder\?<div id="scope-nav-folder-contents"/);
  assert.match(shell,/aria-expanded=\{openFolderId===folder.id\}/);
  assert.match(rail,/position.overflow\?<button/);
  assert.match(rail,/scrollWidth-node.clientWidth/);
  assert.match(rail,/ResizeObserver/);
  assert.match(navCss,/\.scope-nav-loc-home\{/);
  assert.match(navCss,/\.scope-nav-viewport\{/);
  assert.match(navCss,/border-radius:0/);
  assert.ok(navCss.includes('.scope-global{\n  position:static;'));
  assert.equal(navCss.includes('position:sticky'),false);
  assert.equal(fs.readFileSync('app/styles/uiux.css','utf8').includes('.scope-global{\n  position:sticky;'),false);
  assert.ok(fs.readFileSync('app/styles/bottom-navigation.css','utf8').includes('.scope-feature-dock{\n  position:fixed;'));
  assert.match(global,/@import "\.\/styles\/nav.css";/);
  assert.match(settings,/>新增目錄<\/button>/);
  assert.match(settings,/FOLDERS_SETTING_KEY/);
});

test('LOC and Author home NAV can match a later sibling after JsonLd script',()=>{
  const navCss=fs.readFileSync('app/styles/nav.css','utf8');
  assert.ok(navCss.includes(':has(~ .loc-next-main[data-loc-view="home"]'));
  assert.equal(navCss.includes(':has(+ .loc-next-main[data-loc-view="home"]'),false);
});
