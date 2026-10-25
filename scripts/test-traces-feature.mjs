import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Traces reuses existing Governance Hero while legal Blocks stay in Search',()=>{
  const app=read('app/loc/LocApp.jsx');
  const feature=read('app/modular/features/Trace.jsx');
  const search=read('app/modular/features/Search.jsx');
  const legal=read('app/modular/features/GovernanceLegal.jsx');
  assert.match(app,/trace:Trace/);
  assert.match(feature,/<FeaturePage featureId="governance">/);
  assert.match(feature,/<TraceMap\/>/);
  assert.match(search,/import\('\.\/GovernanceLegal'\)/);
  assert.match(legal,/page="governance"/);
  assert.match(legal,/loc-grid two governance-grid/);
  assert.doesNotMatch(feature,/ScopeEditableBlocks|selectGalaxy|updateRows/);
});

test('Public feature is Trace at /trace while management paths remain separate',()=>{
  const registry=read('app/modular/scope-registry.js');
  const shell=read('app/AppShell.jsx');
  const icons=read('app/modular/BottomNavIcon.jsx');
  assert.match(registry,/id:'trace'.*traces.*path:'trace'/);
  assert.match(shell,/\['culture','statics','trace','search'\]/);
  assert.match(shell,/localWorkspace\?'governance':'traces'/);
  assert.match(icons,/if\(name==='traces'\)/);
  for(const [file,label] of [
    ['zh_tw.js','痕跡'],['zh_cn.js','痕迹'],['en.js','Traces'],['ja.js','軌跡']
  ]){
    const locale=read('app/i18n/'+file);
    const traces=locale.split('"traces": {')[1]?.split('},')[0]||'';
    assert.ok(traces.includes('"title": "'+label+'"'),file+' traces title');
  }
});

test('Demo renders geo-anchored 3D markers and on-demand road route without touching Galaxy',()=>{
  const map=read('public/trace-map.mjs');
  const react=read('app/modular/features/trace/TraceMap.jsx');
  assert.match(map,/maplibre-gl@6\.15\.0/);
  assert.match(map,/tiles\.openfreemap\.org\/styles\/liberty/);
  assert.match(map,/fill-extrusion/);
  assert.match(map,/EXAMPLE_ANCHORS/);
  assert.match(map,/async function showRoadRoute\(/);
  assert.match(map,/router\.project-osrm\.org/);
  assert.doesNotMatch(map,/selectRows\(|updateRows\(|insertRows\(|deleteRows\(/);
  assert.match(react,/MapLibre/);
  assert.match(react,/示例/);
  assert.match(react,/routeBusy/);
});

test('Canonical trace pages exist for all public mounts; old bookmarks are noindexed',()=>{
  for(const path of [
    'app/trace/page.jsx','app/lrunes/trace/page.jsx',
    'app/lo3rwang/trace/page.jsx','app/scope-shell/trace/page.jsx'
  ]){
    assert.match(read(path),/forcedView="trace"/,path);
  }
  for(const path of [
    'app/governance/page.jsx','app/lrunes/governance/page.jsx',
    'app/lo3rwang/governance/page.jsx','app/scope-shell/governance/page.jsx'
  ]){
    assert.match(read(path),/forcedView="trace"/,path);
    assert.match(read(path),/index:false/,path);
  }
  const sitemap=read('app/sitemap.js');
  assert.match(sitemap,/\/trace/);
  assert.doesNotMatch(sitemap,/['"]\/governance['"]/);
  const shell=read('app/AppShell.jsx');
  assert.match(shell,/governance\/manage\/search/);
  assert.match(shell,/governance\/manage/);
});
