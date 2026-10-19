import test from 'node:test';
import assert from 'node:assert/strict';
import {NavigationPreferences} from '../app/modular/navigation-preferences.js';
const {DEFAULT_FAVORITES,parseFavorites,serializeFavorites,homeScopeForAccount}=NavigationPreferences.account;
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
  assert.ok(settings.includes('<h2><UiText id="uiExtra.globalSettings.homeSettings"/></h2>'));
  assert.match(settings,/scope-settings-favorite-preview/);
  assert.ok(settings.includes('<h2><UiText id="uiExtra.globalSettings.account"/></h2>'));
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

test('all LunaRunes drawing and atlas pages use ORIGINAL loc-next-main + nested loc-panel composition',()=>{
  const navCss=fs.readFileSync('app/styles/nav.css','utf8');
  const uiCss=fs.readFileSync('app/styles/uiux.css','utf8');
  const componentCss=fs.readFileSync('app/styles/components.css','utf8');
  const shellCss=fs.readFileSync('app/lrunes/skin-lab.css','utf8');
  const stageCss=fs.readFileSync('app/lrunes/effekseer/effekseer-stage.css','utf8');
  const draw3D=fs.readFileSync('app/lrunes/Rune3DPreview.jsx','utf8');
  const atlas3D=fs.readFileSync('app/lrunes/Rune3DLibrary.jsx','utf8');
  const draw2D=fs.readFileSync('app/lrunes/duel2/RuneRitualLab.jsx','utf8');
  const daily2D=fs.readFileSync('app/lrunes/daily3d/RuneDaily3D.jsx','utf8');
  const atlas2D=fs.readFileSync('app/lrunes/list2/RuneAtlasLab.jsx','utf8');
  for(const [name,code] of [
    ['3D draw/daily',draw3D],['3D atlas',atlas3D],
    ['original art draw',draw2D],['original art daily',daily2D],
    ['original art atlas',atlas2D]
  ]){
    assert.match(code,/return <main className="loc-next-main"/,
      name+' must inherit the original LOC page-width/gutter CSS');
    assert.match(code,/return <main className="loc-next-main"[^>]*>\s*<div className="loc-panel rune-skin-lab/,
      name+' must use a REAL child LOC text box instead of styling <main> as a frame');
    assert.match(code,/<\/div>\s*<\/main>;/,
      name+' must close its inner text-box before main');
    assert.doesNotMatch(code,/return <main className="loc-next-main rune-skin-lab/,
      name+' must not mix page and text-box CSS layers');
  }
  assert.match(uiCss,/\.loc-next-main,\.scope-main\{\s*width:min\(var\(--loc-ui-max\)/);
  assert.match(componentCss,/\.loc-card,\.loc-panel,\.loc-bubble\{padding:/);
  assert.match(uiCss,/\.loc-card,\.loc-panel,\.loc-bubble,\.scope-card/,
    'original card/theme contract supplies border-radius, background, box shadow');
  assert.match(shellCss,/\.loc-next-main>\.loc-panel\.rune-skin-lab\{/);
  assert.match(shellCss,/max-width:none;\s*margin:0;/,
    'old 1120/1180/1260px independent maximum widths must not re-narrow the text box');
  assert.match(shellCss,/\.loc-next-main>\.loc-panel\.rune-art-shell\{/,
    'original-art presentations keep their canonical dark palette');
  assert.doesNotMatch(shellCss,/\.loc-next-main\.rune-skin-lab:is\(/,
    'no improvised outer border/background/shadow on main');
  assert.doesNotMatch(stageCss,/\.loc-next-main\.rune-skin-lab\.rune-3d-shell\{/,
    'the 1880px 3D width override has been removed');
  assert.doesNotMatch(stageCss,/width:min\(calc\(100% - clamp\(16px,3vw,56px\)\),1880px\)/,
    'no second, bespoke page-width equation on top of LOC');
  assert.match(stageCss,/\.rune-3d-stage:not\(\[data-ritual-phase="atlas"\]\)\{\s*background:#000;/,
    'the approved pure-black cinematic canvas is unaffected by the native panel');
  assert.doesNotMatch(navCss,/\.scope-global:has\(~ \.loc-next-main\.rune-3d-shell\[data-rune-3d-preview\]\)/,
    'independent global navigation is unchanged');
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
  assert.ok(settings.includes("option('home',uiT('uiExtra.globalSettings.homeSettings'))"));
  assert.ok(settings.includes("option('files',native?uiT('uiExtra.globalSettings.localFiles'):uiT('uiExtra.globalSettings.documentImport'))"));
  assert.ok(settings.includes("option('personal',uiT('uiExtra.globalSettings.personalHome'))"));
  assert.ok(settings.includes("option('manage',uiT('uiExtra.globalSettings.manageMenu'))"));
  assert.match(settings,/activeSection==='home'/);
  assert.match(settings,/activeSection==='files'/);
  assert.match(settings,/activeSection==='personal'/);
  assert.match(settings,/activeSection==='manage'/);
  assert.match(settings,/scope-settings-favorite-preview/);
  assert.match(settings,/deviceNavigation\.MOBILE_HOME_STORAGE_KEY/);
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
  assert.match(legacy,/href="\/settings\/\?section=account"/);
  assert.match(legacy,/if\(!account\.user\)/);
  assert.match(legacy,/account\.canManageScopeSync\('loc'\)/);
  assert.doesNotMatch(legacy,/account\.signIn\(/);
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
  assert.match(settings,/\['lrunes',\.\.\.\(deviceNavigation\.mobileFavoriteEnabled/);
  assert.match(settings,/deviceNavigation\.MOBILE_HOME_STORAGE_KEY/);
  assert.match(home,/<PrivateLocalFiles\/>/);
  assert.doesNotMatch(home,/文化統計與作品全文搜尋|搜尋已匯入檔案名稱|尚未匯入作品/);
});

test('retired private browser-only workbench cannot be reached from Settings',()=>{
  const settings=fs.readFileSync('app/loc/GlobalSettings.jsx','utf8');
  assert.doesNotMatch(settings,/private-import/);
  assert.equal(fs.existsSync('app/private-import/page.jsx'),false);
  assert.equal(fs.existsSync('app/loc/PrivateXArchiveWeb.jsx'),false);
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
