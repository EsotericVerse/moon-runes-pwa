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
  assert.match(settings,/<h2>首頁設定<\/h2>/);
  assert.match(settings,/scope-settings-favorite-preview/);
  assert.match(settings,/<h2>帳號<\/h2>/);
  assert.doesNotMatch(settings,/DailyLogClient|RuneSQLiteTransfer|RuneDrawClient/);
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
  assert.doesNotMatch(settings,/新增、刪除與目錄管理暫不啟用/);
  assert.match(fs.readFileSync('app/loc/use-navigation-preferences.js','utf8'),/FOLDERS_SETTING_KEY/);
});

test('LOC and Author home NAV can match a later sibling after JsonLd script',()=>{
  const navCss=fs.readFileSync('app/styles/nav.css','utf8');
  assert.ok(navCss.includes(':has(~ .loc-next-main[data-loc-view="home"]'));
  assert.equal(navCss.includes(':has(+ .loc-next-main[data-loc-view="home"]'),false);
});

test('3D rune draw NAV spans exactly the same inner content frame as its stage',()=>{
  const navCss=fs.readFileSync('app/styles/nav.css','utf8');
  const stageCss=fs.readFileSync('app/lrunes/effekseer/effekseer-stage.css','utf8');
  const page=fs.readFileSync('app/lrunes/Rune3DPreview.jsx','utf8');
  assert.match(page,/className="loc-next-main rune-skin-lab rune-3d-shell"/);
  assert.match(page,/data-rune-3d-preview=\{mode\}/);
  assert.match(navCss,/\.scope-global:has\(~ \.loc-next-main\.rune-3d-shell\[data-rune-3d-preview\]\)/);
  assert.match(navCss,/calc\(1880px - clamp\(24px,4\.4vw,64px\)\)/);
  assert.match(navCss,/calc\(100% - clamp\(16px,3vw,56px\) - clamp\(24px,4\.4vw,64px\)\)/);
  assert.match(navCss,/max-width:none;\s*background:transparent;/);
  assert.match(stageCss,/width:min\(calc\(100% - clamp\(16px,3vw,56px\)\),1880px\);/);
  assert.match(stageCss,/padding:clamp\(12px,2\.2vw,32px\)/);
  const clamp=(lo,n,hi)=>Math.min(hi,Math.max(lo,n));
  for(const viewport of [360,560,1024,1830,2000,2560]){
    const outer=Math.min(viewport-clamp(16,viewport*.03,56),1880);
    const padding=clamp(12,viewport*.022,32);
    const actualStageInner=outer-2*padding;
    const nav=Math.min(1880-clamp(24,viewport*.044,64),
      viewport-clamp(16,viewport*.03,56)-clamp(24,viewport*.044,64));
    assert.ok(Math.abs(actualStageInner-nav)<.01,'NAV mismatch at '+viewport+'px');
  }
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



test('Settings has one home & favorites pane, one import pane, and separated management without Rune UI',()=>{
  const settings=fs.readFileSync('app/loc/GlobalSettings.jsx','utf8');
  const daily=fs.readFileSync('app/daily/log/DailyLogClient.jsx','utf8');
  assert.match(settings,/import Select from 'react-select';/);
  assert.match(settings,/inputId="loc-settings-function"/);
  assert.match(settings,/option\('home','首頁設定'\)/);
  assert.match(settings,/option\('files',native\?'本機檔案':'文件匯入'\)/);
  assert.match(settings,/option\('personal','個人首頁'\)/);
  assert.match(settings,/option\('manage','管理選單'\)/);
  assert.match(settings,/activeSection==='home'/);
  assert.match(settings,/activeSection==='files'/);
  assert.match(settings,/activeSection==='personal'/);
  assert.match(settings,/activeSection==='manage'/);
  assert.match(settings,/scope-settings-favorite-preview/);
  assert.match(settings,/MOBILE_HOME_STORAGE_KEY/);
  assert.match(settings,/<PrivateLocalFiles\/>/);
  assert.match(settings,/<ScopeSettingsPanel/);
  assert.match(settings,/<ManagementImportPanel/);
  assert.match(settings,/<ManagementArticlePublisher/);
  assert.match(settings,/<ScopeGroupManagement/);
  assert.doesNotMatch(settings,/月典抽牌|每日符文紀錄|DailyLogClient|RuneSQLiteTransfer|RuneDrawClient|RuneAppDayNightDashboard/);
  assert.doesNotMatch(settings,/section==='favorites'|section==='daily'|我的最愛（展示）/);
  assert.match(daily,/<DailyRuneCalendar/);
});
test('governance management delegates to permission-scoped Settings',()=>{
  const governance=fs.readFileSync('app/modular/features/Governance.jsx','utf8');
  const legacy=fs.readFileSync('app/loc/GovernanceManagement.jsx','utf8');
  const settings=fs.readFileSync('app/loc/GlobalSettings.jsx','utf8');
  assert.doesNotMatch(governance,/governance-management-cta/);
  assert.match(legacy,/window.location.replace\(target\)/);
  assert.match(settings,/managedScopes/);
  assert.match(settings,/account.canManageScopeSync\(item.id\)/);
  assert.match(settings,/canManageGlobal/);
  assert.match(settings,/ScopeSettingsPanel/);
  assert.match(settings,/ManagementArticlePublisher/);
  assert.match(settings,/ScopeGroupManagement/);
  assert.match(settings,/ManagementImportPanel/);
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
  assert.match(settings,/\['lrunes',\.\.\.\(mobileFavoriteEnabled/);
  assert.match(settings,/MOBILE_HOME_STORAGE_KEY/);
  assert.match(home,/<PrivateLocalFiles\/>/);
  assert.doesNotMatch(home,/文化統計與作品全文搜尋|搜尋已匯入檔案名稱|尚未匯入作品/);
});

test('retired private browser-only workbench cannot be reached from Settings',()=>{
  const settings=fs.readFileSync('app/loc/GlobalSettings.jsx','utf8');
  assert.doesNotMatch(settings,/private-import/);
  assert.equal(fs.existsSync('app/private-import/page.jsx'),false);
  assert.equal(fs.existsSync('app/loc/PrivateXArchiveWeb.jsx'),false);
});
