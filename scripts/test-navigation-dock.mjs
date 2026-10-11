import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FAVORITES,parseFavorites,serializeFavorites,homeScopeForAccount} from '../app/modular/navigation-preferences.mjs';
import {navigationHref} from '../app/modular/nav-destinations.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
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
  assert.equal(navigationHref('loc','',true),'/index.html');
  assert.equal(navigationHref('loc','culture',true),'/culture/index.html');
  assert.equal(navigationHref('loc','statics',true),'/statics/index.html');
  assert.equal(navigationHref('lrunes','',true),'/lrunes/index.html');
  assert.equal(navigationHref('lrunes','culture',true),'/lrunes/culture/index.html');
  assert.equal(navigationHref('lo3rwang','statics',true),'/lo3rwang/statics/index.html');
  assert.equal(navigationHref('family1','governance',true),'/scope/governance/index.html?scope=family1');
  assert.match(navigationHref('lrunes','culture',false),/^https:\/\//);
});
test('one immutable six-key feature dock and explicit global settings route',()=>{
  const code=fs.readFileSync('app/AppShell.jsx','utf8');
  const css=fs.readFileSync('app/styles/bottom-navigation.css','utf8');
  const settings=fs.readFileSync('app/loc/GlobalSettings.jsx','utf8');
  assert.match(code,/\{id:'home'/);
  assert.match(code,/\['culture','statics','search','governance'\]/);
  assert.match(code,/\{id:'settings'.*href:native\?'\/settings\/index\.html':'\/settings\/'\}/);
  assert.match(code,/className="scope-feature-dock"/);
  assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css,/box-shadow:/);
  assert.match(settings,/>每日符文行事曆<\/h2>/);
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
  assert.match(settings,/新增、刪除與目錄管理暫不啟用/);
  assert.match(settings,/FOLDERS_SETTING_KEY/);
});

test('LOC and Author home NAV can match a later sibling after JsonLd script',()=>{
  const navCss=fs.readFileSync('app/styles/nav.css','utf8');
  assert.ok(navCss.includes(':has(~ .loc-next-main[data-loc-view="home"]'));
  assert.equal(navCss.includes(':has(+ .loc-next-main[data-loc-view="home"]'),false);
});

test('native first-row NAV respects iOS safe area while web retains original layout',()=>{
  const shell=fs.readFileSync('app/AppShell.jsx','utf8');
  const css=fs.readFileSync('app/styles/nav.css','utf8');
  const layout=fs.readFileSync('app/layout.jsx','utf8');
  assert.match(shell,/data-native=\{native\?'ios':'web'\}/);
  assert.match(layout,/viewportFit:'cover'/);
  assert.match(css,/\.scope-global\[data-native="ios"\]/);
  assert.match(css,/max\(env\(safe-area-inset-top,0px\),var\(--loc-native-top-fallback\)\)/);
  assert.match(css,/min-height:40px/);
  assert.match(css,/min-height:780px/);
  assert.match(css,/position:static/);
  assert.doesNotMatch(css,/\.scope-global\[data-native="ios"\]\s*\{[^}]*position:fixed/);
});


test('Settings React Select shows one section and retains daily, local files and managed imports',()=>{
  const settings=fs.readFileSync('app/loc/GlobalSettings.jsx','utf8');
  const daily=fs.readFileSync('app/daily/log/DailyLogClient.jsx','utf8');
  const content=settings.slice(settings.indexOf('<div className="scope-content scope-settings-options">'));
  assert.match(settings,/import Select from 'react-select';/);
  assert.match(settings,/inputId="loc-settings-function"/);
  assert.match(settings,/section==='daily'/);
  assert.match(settings,/section==='files'/);
  assert.match(settings,/section==='favorites'/);
  assert.match(settings,/section==='manage'/);
  assert.match(settings,/section==='home'/);
  assert.match(settings,/section==='account'/);
  assert.match(content,/<DailyLogClient embedded\/>/);
  assert.match(content,/<PrivateLocalFiles\/>/);
  assert.match(content,/<ManagementImportPanel/);
  assert.match(content,/設定首頁/);
  assert.match(content,/我的最愛/);
  assert.match(content,/登入/);
  assert.match(content,/navigationHref\('lrunes','daily\/log',native\)/);
  assert.match(daily,/<DailyRuneCalendar/);
  assert.match(daily,/\{!embedded&&canWrite\?/);
});
test('governance management moves to permissions-scoped Settings, and the old URL redirects',()=>{
  const governance=fs.readFileSync('app/modular/features/Governance.jsx','utf8');
  const legacy=fs.readFileSync('app/loc/GovernanceManagement.jsx','utf8');
  const settings=fs.readFileSync('app/loc/GlobalSettings.jsx','utf8');
  assert.doesNotMatch(governance,/governance-management-cta/);
  assert.match(legacy,/window.location.replace\(target\)/);
  assert.match(settings,/canManageSelected/);
  assert.match(settings,/ManagementArticlePublisher/);
  assert.match(settings,/ScopeSettingsPanel/);
  assert.match(settings,/ScopeGroupManagement/);
  assert.match(settings,/section==='files'\?\(native\?<PrivateLocalFiles\/>/);
});
test('daily rune calendar only reads and renders record details after authentication',()=>{
  const settings=fs.readFileSync('app/loc/GlobalSettings.jsx','utf8');
  const daily=fs.readFileSync('app/daily/log/DailyLogClient.jsx','utf8');
  const calendar=fs.readFileSync('app/lrunes/DailyRuneCalendar.jsx','utf8');
  assert.match(settings,/每日符文紀錄與日曆/);
  assert.match(settings,/\(native\|\|account\.user\)&&!checking\?<p className="scope-settings-note">/);
  assert.match(daily,/const canViewDetails=native\\|\\|\\(!account\\.loading&&Boolean\\(account\\.user\\)\\);/);
  assert.match(daily,/const visibleRows=canViewDetails\?rows:EMPTY_ROWS;/);
  assert.match(daily,/if\(!canViewDetails\)\{\s*setRows\(\[\]\);/);
  assert.ok(daily.indexOf('if(!canViewDetails){')<daily.indexOf('selectDailyRuneMonth({year,month})'));
  assert.match(daily,/const request=\+\+monthRequest\.current;/);
  assert.match(daily,/if\(monthRequest\.current!==request\)return;/);
  assert.match(daily,/return\(\)=>\{monthRequest\.current\+=1;/);
  assert.match(daily,/window\.removeEventListener\('loc-rune-local-changed',reload\)/);
  assert.match(daily,/showDetails=\{canViewDetails\}/);
  assert.match(daily,/canViewDetails&&selectedRows\.length\?/);
  assert.match(daily,/canViewDetails&&!loading&&!error&&!rows\.length\?/);
  assert.match(calendar,/showDetails=true/);
  assert.match(calendar,/const entries=showDetails\?/);
  assert.match(calendar,/const moonMarkers=showDetails\?phaseMarkers\(key\):\[\];/);
});

test('Capacitor static-file route is normalized to canonical Scope URL before hydration',()=>{
  const layout=fs.readFileSync('app/layout.jsx','utf8');
  const declaration=layout.match(/const NATIVE_STATIC_ROUTE_SCRIPT=`([\s\S]*?)`;/);
  assert.ok(declaration,'native route normalization script must be present in RootLayout');
  assert.match(layout,/id="loc-native-static-route"/);
  const script=vm.runInNewContext('`'+declaration[1]+'`');
  function execute(protocol,pathname,search='',hash=''){
    let next=null;
    const window={
      location:{protocol,pathname,search,hash},
      history:{state:{},replaceState(_state,_title,path){next=path;}}
    };
    vm.runInNewContext(script,{window});
    return next;
  }
  assert.equal(execute('capacitor:','/lrunes/culture/index.html','?from=2026-10-01','#example'),'/lrunes/culture/?from=2026-10-01#example');
  assert.equal(execute('capacitor:','/statics/index.html'),'/statics/');
  assert.equal(execute('capacitor:','/index.html'),'/');
  assert.equal(execute('https:','/lrunes/culture/index.html'),null);
  assert.equal(execute('capacitor:','/lrunes/culture/'),null);
});

test('deep feature paths retain their dock feature',()=>{
  const registry=fs.readFileSync('app/modular/scope-registry.js','utf8');
  assert.match(registry,/segments\.includes\(item\.path\)/);
  assert.ok(!registry.includes(".at(-1)||''"));
});
test('contextual returns and native 404 stay in the Capacitor bundle',()=>{
  const nav=fs.readFileSync('app/modular/ContextReturnNav.jsx','utf8');
  const site=fs.readFileSync('app/lrunes/RunesClient.jsx','utf8');
  const hub=fs.readFileSync('app/lrunes/Rune3DNav.jsx','utf8');
  const notFound=fs.readFileSync('app/not-found.jsx','utf8');
  assert.match(nav,/navigationHref\(scopeId,path,native\)/);
  assert.match(site,/navigationHref\('lrunes',path,native\)/);
  assert.match(hub,/navigationHref\('lrunes','card\/duel',native\)/);
  assert.match(notFound,/current\.protocol==='capacitor:'/);
  assert.match(notFound,/index\.html\?loc_direct=1/);
});

test('native My Phone stays device-only and LunaRunes is immutable in favorites',()=>{
  const shell=fs.readFileSync('app/AppShell.jsx','utf8');
  const settings=fs.readFileSync('app/loc/GlobalSettings.jsx','utf8');
  const home=fs.readFileSync('app/loc/MyPhoneHome.jsx','utf8');
  assert.match(shell,/favoriteLinks\.unshift/);
  assert.match(shell,/mobileHomeHref/);
  assert.match(settings,/月之符文.*固定保留/);
  assert.match(settings,/MOBILE_HOME_STORAGE_KEY/);
  assert.match(home,/尚未匯入作品/);
  assert.match(home,/尚未建立可用的本機作品全文索引/);
});

test('retired private browser-only workbench cannot be reached from Settings',()=>{
  const settings=fs.readFileSync('app/loc/GlobalSettings.jsx','utf8');
  assert.doesNotMatch(settings,/private-import/);
  assert.equal(fs.existsSync('app/private-import/page.jsx'),false);
  assert.equal(fs.existsSync('app/loc/PrivateXArchiveWeb.jsx'),false);
});
