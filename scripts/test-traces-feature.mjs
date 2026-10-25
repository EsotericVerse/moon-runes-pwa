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
  assert.match(feature,/<TraceMap spatialData=/);
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
  assert.match(react,/searchTracePlaces/);
  assert.match(react,/focusCoordinates/);
  assert.match(engine,/loc-trace-picked-area/);
  assert.match(engine,/setRadius/);
  assert.match(engine,/setAnchors/);
  assert.match(engine,/loc-trace-saved-anchors/);
});

test('Trace management selects spatial coordinates from map clicks and sample stations',()=>{
  const engine=read('app/modular/features/trace/trace-map-engine.js');
  const react=read('app/modular/features/trace/TraceMap.jsx');
  const editor=read('app/loc/TraceManagement.jsx');
  const scope=read('app/loc/ScopeManagement.jsx');
  const admin=read('app/loc/views/AdminHomeView.jsx');
  const traceRoute=read('app/trace/manage/page.jsx');
  assert.match(editor,/onLocationPick=\{\(\{lng,lat,name\}\)=>\{/);
  assert.match(editor,/if\(name\)setTitle\(current=>current\.trim\(\)\?current:name\)/);
  assert.match(engine,/if\(canPickLocation\)pickLocation\(place\.lng,place\.lat,place\.name\)/);
  assert.match(react,/export default function TraceMap\(\{onLocationPick=null,onAnchorSelect=null,onRouteSelect=null,selectedRouteUid=''/);
  assert.match(react,/onLocationPick:selectingLocation\?coords=>/);
  assert.match(engine,/map\.on\('click',event=>pickLocation\(event\.lngLat\.lng,event\.lngLat\.lat\)\)/);
  assert.match(engine,/if\(canPickLocation\)pickLocation\(place\.lng,place\.lat,place\.name\)/);
  assert.match(engine,/pickedMarker\.on\('dragend'/);
  assert.match(engine,/pickedMarker\?\.remove\(\)/);
  assert.match(editor,/新增空間定錨點/);
  assert.match(scope,/shortLabel:'空間定錨點'/);
  assert.doesNotMatch(admin,/shortLabel:'空間定錨點'/);
  assert.match(traceRoute,/forcedView="manage" forcedScope="loc"/);
});

test('Only canonical public Trace and management routes exist',()=>{
  for(const path of [
    'app/trace/page.jsx','app/lrunes/trace/page.jsx',
    'app/lo3rwang/trace/page.jsx','app/scope-shell/trace/page.jsx'
  ])assert.match(read(path),/forcedView="trace"/,path);
  for(const path of [
    'app/trace/manage/page.jsx',
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

test('Check-in backfill uses only empty source_place and user-confirmed date range',()=>{
  const editor=read('app/loc/PlaceBatchFill.jsx');
  const manager=read('app/loc/ScopeManagement.jsx');
  const trace=read('app/loc/TraceManagement.jsx');
  assert.match(manager,/value:'placeFill'/);
  assert.match(manager,/dynamic\(\(\)=>import\('\.\/PlaceBatchFill'\)/);
  assert.match(editor,/selectCultureTimeRows\(scope\)/);
  assert.match(editor,/p_start_date:startDate,p_end_date:endDate/);
  assert.match(editor,/p_apply:false/);
  assert.match(editor,/p_apply:true,p_expected_count:count/);
  assert.match(editor,/window\.confirm\(/);
  assert.match(editor,/trace_place_suggestions/);
  assert.match(editor,/前後各三筆/);
  assert.match(trace,/常用 Facebook 打卡名稱/);
  assert.match(trace,/編輯既有空間定錨點/);
  assert.match(trace,/updateTraceAnchor/);
  const writes=read('app/modular/features/trace/trace-data.js');
  assert.match(writes,/export async function updateTraceAnchor/);
  assert.match(writes,/if\(id==='loc'\)request=request\.eq\('scope_id','loc'\)/);
  assert.doesNotMatch(editor,/selectAllRows\(|insertRows\(|updateRows\(/);
});


test('Trace geocoding resolves unique check-in names only on demand and inserts only verified anchors',()=>{
  const manager=read('app/loc/ScopeManagement.jsx');
  const geocode=read('app/loc/TracePlaceGeocoder.jsx');
  const trace=read('app/modular/features/trace/trace-data.js');
  assert.ok(manager.includes("section==='traceGeocode'&&routeScopeId!=='loc'"));
  assert.ok(manager.includes("section==='placeFill'&&routeScopeId!=='loc'"),'preserve date-range place filling');
  assert.ok(manager.includes("dynamic(()=>import('./TracePlaceGeocoder')"));
  assert.ok(geocode.includes(".select('source_place')"));
  assert.ok(geocode.includes(".not('source_place','is',null)"));
  assert.ok(geocode.includes(".neq('source_place','')"));
  assert.ok(geocode.includes("new Map()"),'deduplicate place names in memory');
  assert.ok(geocode.includes("MIN_SEARCH_GAP_MS=1250"));
  assert.ok(geocode.includes("localStorage.setItem"));
  assert.ok(geocode.includes("policyAccepted"),'require informed geocoder consent');
  assert.ok(geocode.includes("window.confirm("),'batch writes require explicit confirmation');
  assert.ok(geocode.includes("found[item.name]?.status==='review'"),'ambiguous places need review');
  assert.ok(geocode.includes("addTraceAnchorsBatch({scopeId,places:payload})"));
  assert.doesNotMatch(geocode,/updateRows\(|deleteRows\(|\.update\(/);
  assert.ok(trace.includes("const previous=await readTraceData(id)"),'re-read existing anchors before writing');
  assert.ok(trace.includes("pending.slice(offset,offset+80)"),'bounded bulk inserts');
  assert.ok(trace.includes("dbAuthRelation(relation(id)).insert(chunk)"),'existing authenticated RLS write path');
  assert.ok(!trace.includes("update silver.")&&!geocode.includes("update silver."),'never modify Galaxy schema or article fields');
});


test('Trace anchor quick-location button uses current place name and previews without auto-writing',()=>{
  const editor=read('app/loc/TraceManagement.jsx');
  const react=read('app/modular/features/trace/TraceMap.jsx');
  const styles=read('app/styles/features.css');
  assert.ok(editor.includes('onClick={quickLocate}'),'one quick-location button');
  assert.ok(editor.includes("searchTracePlaces(query)"),'lookup uses selected check-in name');
  assert.ok(editor.includes('exactTracePlaceMatch(query,found[0])'),'only exact single result auto-selects');
  assert.ok(editor.includes('setQuickCandidates(found)'),'ambiguous results are presented to user');
  assert.ok(editor.includes('setFocusLocation({longitude:lng,latitude:lat,name:query,radius_m:Number(radius)||500})'));
  assert.ok(editor.includes("setQuickNotice('已快速移至"),'preview is not a silent save');
  assert.ok(editor.includes('setQuickCandidates([]);setQuickNotice('),'new place name clears stale candidates');
  assert.ok(react.includes('{!selectingLocation?<><form'),'editor does not show duplicate place-search form');
  assert.ok(styles.includes('.loc-trace-quick-field'),'inline control has responsive layout');
});

test('Public Trace keeps anchor and route results inline rather than navigating to Search',()=>{
  const feature=read('app/modular/features/Trace.jsx');
  const map=read('app/modular/features/trace/TraceMap.jsx');
  const engine=read('app/modular/features/trace/trace-map-engine.js');
  const results=read('app/modular/features/trace/TracePlaceResults.jsx');
  assert.match(feature,/readTraceData\(scopeId\)/);
  assert.match(feature,/onAnchorSelect=\{anchor=>/);
  assert.match(feature,/onRouteSelect=\{map=>/);
  assert.match(feature,/<TracePlaceResults/);
  assert.match(engine,/map\.on\('click',layer,chooseAnchor\)/);
  assert.match(map,/onAnchorSelect:!selectingLocation\?anchor=>/);
  assert.match(map,/selectedRouteUid/);
  assert.match(results,/文章列表/);
  assert.match(results,/時間長河/);
  assert.match(results,/基本報表/);
  assert.doesNotMatch(feature,/featureNavigationHref|router\.push/);
});


test('Search recommendations execute real queries and only suggest loaded place names',()=>{
  const search=read('app/modular/features/Search.jsx');
  const blocks=read('app/loc/ScopeEditableBlocks.jsx');
  assert.match(search,/function searchFromSuggestion\(/);
  assert.match(search,/onSuggestionClick=\{term=>searchFromSuggestion\(term\)\}/);
  assert.match(search,/executeSearch\(term,null,\{overrideOptions:/);
  assert.match(search,/suggestedPlaces=useMemo\(/);
  assert.match(search,/searchFromSuggestion\(place,\{placeOnly:true/);
  assert.match(search,/<datalist id="scope-search-loaded-titles">/);
  assert.match(blocks,/blocksToPlainText\(html\)\.split/);
  assert.match(blocks,/!slot\.entities\.some\(entity=>recommendationTerm\(entity\.text\)\)/);
});

test('Trace shares cached Time-period navigation with Culture and Statistics',()=>{
  const trace=read('app/modular/features/Trace.jsx');
  const culture=read('app/modular/features/Culture.jsx');
  const stats=read('app/modular/features/Statistics.jsx');
  assert.match(trace,/queryKey:\['culture-time-periods',periodScopeId\]/);
  assert.match(trace,/readNumericIsr\(periodScopeId,'periods'\)/);
  assert.match(trace,/\[periodKey,setPeriodKey\]=useState\('latest'\)/);
  assert.match(trace,/periodKey==='all'\?null:selectedPeriod/);
  assert.match(trace,/period=\{periodKey==='all'\?null:selectedPeriod\|\|null\}/);
  assert.match(trace,/onAnchorSelect=\{anchor=>/);
  assert.match(trace,/空間定錨點不代表該時期曾造訪/);
  assert.match(culture,/queryKey:\['culture-time-periods',scopeId\]/);
  assert.match(stats,/queryKey:\['culture-time-periods',scopeId\]/);
});

test('Culture and Statistics share only published flat classification lists',()=>{
  const catalog=read('app/modular/published-source-taxonomy.js');
  const culture=read('app/modular/features/Culture.jsx');
  const stats=read('app/modular/features/Statistics.jsx');
  const sourceNames=read('app/loc/source-classification.mjs');
  assert.match(catalog,/publishedSourceCategoryCatalog/);
  assert.match(catalog,/SOURCE_DISPLAY_ALIASES/);
  assert.match(catalog,/'其他':'others'/);
  assert.match(catalog,/'方格子vocus':'vocus'/);
  assert.match(catalog,/'無名wretch':'wretch'/);
  assert.match(culture,/const publishedTaxonomy=useMemo\(\(\)=>publishedSourceTaxonomy\(scopeId\),\[scopeId\]\)/);
  assert.match(culture,/enabled:!publishedTaxonomy/);
  assert.match(stats,/publishedSourceCategoryCatalog\(scopeId\)/);
  assert.match(stats,/enabled:sourceChart&&Boolean\(scopeId\)&&!publishedCatalog/);
  assert.match(stats,/if\(isLrunesDaily\|\|mediaDimension\|\|!sourceCatalog.isSuccess\)return null/);
  assert.match(sourceNames,/sourceTaxonomyFromArrays/);
  assert.doesNotMatch(catalog,/statistics_source_categories|statistics_scope_others_groups/);
});

test('Trace overview fits every saved spatial anchor, not just the three Banqiao demos',()=>{
  const source=read('app/modular/features/trace/trace-map-engine.js');
  const overview=source.match(/^  function overview\(\)\{[\s\S]*?^  \}\n(?=\n  map\.once)/m)?.[0];
  const validAnchor=source.match(/^function isValidSavedAnchor\(anchor\)\{[\s\S]*?^\}/m)?.[0];
  assert.ok(overview&&validAnchor,'overview and coordinate validator must be present in the map engine');
  class Bounds {
    constructor(){this.points=[];}
    extend(point){this.points.push(point);}
  }
  const example=[{lng:121.46,lat:25.01},{lng:121.47,lat:25.03}];
  const run=anchors=>{
    const calls=[];
    const map={
      getContainer:()=>({clientWidth:1300}),
      fitBounds:(bounds,opts)=>calls.push({kind:'bounds',points:bounds.points,opts}),
      flyTo:opts=>calls.push({kind:'single',opts})
    };
    const go=new Function('map','LngLatBounds','savedAnchors','EXAMPLE_ANCHORS','removed','loaded','canPickLocation',validAnchor+'\n'+overview+'; return overview;');
    go(map,Bounds,anchors,example,false,true,false)();
    return calls[0];
  };
  assert.deepEqual(run([
    {trace_type:'anchor',longitude:121.5,latitude:25.1},
    {trace_type:'anchor',longitude:120.2,latitude:22.9}
  ]).points,[[121.5,25.1],[120.2,22.9]]);
  assert.deepEqual(run([
    {trace_type:'anchor',longitude:121.5,latitude:25.1}
  ]).opts.center,[121.5,25.1]);
  assert.deepEqual(run([]).opts.center,[120.98,23.73]);
  assert.deepEqual(run([{trace_type:'anchor',longitude:null,latitude:null}]).opts.center,
    [120.98,23.73]);
});

test('Trace desktop map widens, resizes with mouse or keyboard, and stays phone responsive',()=>{
  const map=read('app/modular/features/trace/TraceMap.jsx');
  const engine=read('app/modular/features/trace/trace-map-engine.js');
  const css=read('app/styles/features.css');
  assert.match(css,/\.loc-next-main:has\(\.loc-trace-panel\)/);
  assert.match(css,/width:min\(1680px/);
  assert.match(css,/\.loc-trace-resize-tools\{display:none\}/);
  assert.match(css,/\(min-width:900px\) and \(pointer:fine\)/);
  assert.match(css,/\.loc-trace-map-frame\{[\s\S]*?height:clamp\(460px,68svh,820px\)/);
  assert.match(css,/@media\(max-width:680px\)/);
  assert.match(css,/height:clamp\(400px,62svh,690px\)/);
  assert.match(map,/ResizeObserver\(\(\)=>mapRef\.current\?\.resize\(\)\)/);
  assert.match(engine,/resize:\(\)=>\{if\(!removed\)map\.resize\(\);\}/);
  assert.match(map,/onPointerDown=\{startMapResize\}/);
  assert.match(map,/onPointerMove=\{moveMapResize\}/);
  assert.match(map,/onPointerUp=\{stopMapResize\}/);
  assert.match(map,/onKeyDown=\{keyboardMapResize\}/);
  assert.match(map,/spatialData\?\.anchors\?\.some\(/);
  assert.match(map,/selectingLocation\?copy\.examples:copy\.all/);
});
