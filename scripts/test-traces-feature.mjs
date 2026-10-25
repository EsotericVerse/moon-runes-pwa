import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const pathOf=path=>new URL('../'+path,import.meta.url);
const read=path=>readFileSync(pathOf(path),'utf8');

test('Trace owns its route and Hero; explanatory Blocks remain in Search',()=>{
  const app=read('app/loc/LocApp.jsx');
  const feature=read('app/modular/features/Trace.jsx');
  const search=read('app/modular/features/Search.jsx');
  const blocks=read('app/modular/features/TraceBlocks.jsx');
  assert.match(app,/trace:Trace/);
  assert.match(feature,/<FeaturePage featureId="trace">/);
  assert.match(feature,/<TraceMap\/>/);
  assert.match(search,/import\('\.\/TraceBlocks'\)/);
  assert.match(blocks,/page="trace"/);
  assert.match(blocks,/trace-grid/);
  assert.doesNotMatch(feature,/ScopeEditableBlocks|selectGalaxy|updateRows/);
});

test('Navigation places Trace before Search and gives it an independent icon',()=>{
  const registry=read('app/modular/scope-registry.js');
  const shell=read('app/AppShell.jsx');
  const icons=read('app/modular/BottomNavIcon.jsx');
  assert.match(registry,/id:'trace'.*path:'trace'/);
  assert.match(shell,/\['culture','statics','trace','search'\]/);
  assert.match(icons,/if\(name==='trace'\)/);
  assert.match(shell,/editTabHref\('manage\/search'/);
  assert.match(shell,/editTabHref\('admin\/search'/);
  for(const [file,label] of [
    ['zh_tw.js','痕跡'],['zh_cn.js','痕迹'],['en.js','Traces'],['ja.js','軌跡']
  ]){
    const locale=read('app/i18n/'+file);
    const section=locale.split('"trace": {')[1]?.split('},')[0]||'';
    assert.ok(section.includes('"title": "'+label+'"'),file+' trace title');
  }
});

test('Trace mounts installed MapLibre from a lazy React chunk with Next.js ESM worker',()=>{
  const engine=read('app/modular/features/trace/trace-map-engine.js');
  const react=read('app/modular/features/trace/TraceMap.jsx');
  const feature=read('app/modular/features/Trace.jsx');
  assert.match(engine,/from 'maplibre-gl'/);
  assert.match(engine,/setWorkerUrl\(new URL\('maplibre-gl\/dist\/maplibre-gl-worker\.mjs',import\.meta\.url\)/);
  assert.match(react,/import 'maplibre-gl\/dist\/maplibre-gl\.css'/);
  assert.match(react,/createTraceMap\(containerRef\.current/);
  assert.match(react,/instance\?\.destroy\(\)/);
  assert.match(feature,/ssr:false/);
  assert.match(engine,/tiles\.openfreemap\.org\/styles\/liberty/);
  assert.match(engine,/fill-extrusion/);
  assert.match(engine,/EXAMPLE_ANCHORS/);
  assert.match(engine,/async function showRoadRoute\(/);
  assert.match(engine,/router\.project-osrm\.org/);
  assert.doesNotMatch(engine,/selectRows\(|updateRows\(|insertRows\(|deleteRows\(/);
  assert.doesNotMatch(engine,/unpkg\.com|LOCTraceMapModule/);
  assert.doesNotMatch(react,/document\.createElement|MODULE_SRC|MAP_CSS|LOCTraceMapModule/);
  assert.ok(!existsSync(pathOf('public/trace-map.mjs')),'CDN transport must be removed');
  assert.match(react,/示例/);
  assert.match(react,/routeBusy/);
});

test('Trace management selects spatial coordinates from map clicks and sample stations',()=>{
  const engine=read('app/modular/features/trace/trace-map-engine.js');
  const react=read('app/modular/features/trace/TraceMap.jsx');
  const editor=read('app/loc/TraceManagement.jsx');
  const scope=read('app/loc/ScopeManagement.jsx');
  const admin=read('app/loc/views/AdminHomeView.jsx');
  assert.match(editor,/onLocationPick=\{\(\{lng,lat\}\)=>\{/);
  assert.match(react,/export default function TraceMap\(\{onLocationPick=null\}\)/);
  assert.match(react,/onLocationPick:selectingLocation\?coords=>/);
  assert.match(engine,/map\.on\('click',event=>pickLocation\(event\.lngLat\.lng,event\.lngLat\.lat\)\)/);
  assert.match(engine,/if\(canPickLocation\)pickLocation\(place\.lng,place\.lat\)/);
  assert.match(engine,/pickedMarker\.on\('dragend'/);
  assert.match(engine,/pickedMarker\?\.remove\(\)/);
  assert.match(editor,/新增空間定錨點/);
  assert.match(scope,/shortLabel:'空間定錨點'/);
  assert.match(admin,/shortLabel:'空間定錨點'/);
});

test('Only canonical public Trace and management routes exist',()=>{
  for(const path of [
    'app/trace/page.jsx','app/lrunes/trace/page.jsx',
    'app/lo3rwang/trace/page.jsx','app/scope-shell/trace/page.jsx'
  ])assert.match(read(path),/forcedView="trace"/,path);
  for(const path of [
    'app/lrunes/manage/page.jsx','app/lo3rwang/manage/page.jsx',
    'app/scope-shell/manage/page.jsx'
  ])assert.match(read(path),/forcedView="manage"/,path);
  for(const path of [
    'app/lrunes/manage/search/page.jsx','app/lo3rwang/manage/search/page.jsx',
    'app/scope-shell/manage/search/page.jsx','app/admin/search/page.jsx'
  ])assert.match(read(path),/forcedView="searchManage"/,path);
  assert.match(read('app/admin/page.jsx'),/forcedScope="admin"/);
  for(const prefix of [
    'app/governance','app/lrunes/governance',
    'app/lo3rwang/governance','app/scope-shell/governance','app/local/governance'
  ])assert.ok(!existsSync(pathOf(prefix+'/page.jsx')),prefix+' must be absent');
  assert.match(read('app/sitemap.js'),/\/trace/);
  const core=read('app/modular/published-blocks/index.js');
  assert.match(core,/"loc:trace"/);
  assert.match(core,/"loc:scope_trace"/);
  // The previous group_governance data key remains a compatibility alias for
  // the Trace Hero. It is not a public governance route or a second page.
  assert.match(core,/"loc:group_governance"/);
});
