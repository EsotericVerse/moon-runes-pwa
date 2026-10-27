import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
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
  assert.match(feature,/<TraceMap mapOnly=/);
  assert.match(feature,/enabled:supported&&routeListOpen/);
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

test('MapLibre is lazy and has neither paid search nor floor geometry',()=>{
 const engine=read('app/modular/features/trace/trace-map-engine.js');
 const react=read('app/modular/features/trace/TraceMap.jsx');
 assert.match(engine,/from 'maplibre-gl'/);
 assert.match(react,/import 'maplibre-gl\/dist\/maplibre-gl\.css'/);
 assert.match(react,/createTraceMap\(containerRef\.current/);
 assert.match(engine,/loc-trace-saved-anchors/);
 assert.doesNotMatch(engine,/floor_level|floor_label|loc-trace-picked-area|setRadius/);
 assert.doesNotMatch(engine,/searchTracePlaces|nominatim|photon/);
});

test('MapLibre click stores optional GPS without county or floor',()=>{
 const engine=read('app/modular/features/trace/trace-map-engine.js');
 const ui=read('app/loc/TraceManagement.jsx');
 assert.match(ui,/onLocationPick=\{\(\{lng,lat,name\}\)=>\{/);
 assert.match(ui,/if\(name\)setTitle\(t=>t\.trim\(\)\|\|name\)/);
 assert.match(ui,/文字地址（非必填）/);
 assert.match(engine,/map\.on\('click',event=>pickLocation/);
 assert.doesNotMatch(ui,/countyOptions|floor_level/);
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
  // group_trace is the sole authoritative Trace Hero. No governance alias.
  assert.match(core,/"loc:group_trace"/);
  assert.doesNotMatch(core,/"loc:group_governance"/);
});

test('review-first Facebook place backfill remains separate from Trace edits',()=>{
 const editor=read('app/loc/PlaceBatchFill.jsx'),ui=read('app/loc/TraceManagement.jsx');
 assert.match(editor,/p_apply:false/);
 assert.match(editor,/p_apply:true,p_expected_count:count/);
 assert.match(editor,/window\.confirm\(/);
 assert.match(ui,/編輯既有地點（直接搜尋標題）/);
 assert.match(ui,/updateTraceAnchor/);
});

test('paid third-party place geocoding is absent from all Trace surfaces',()=>{
 const mgr=read('app/loc/ScopeManagement.jsx');
 const editor=read('app/loc/TraceManagement.jsx');
 const map=read('app/modular/features/trace/TraceMap.jsx');
 assert.doesNotMatch(mgr,/traceGeocode|TracePlaceGeocoder/);
 assert.doesNotMatch(editor,/searchTracePlaces|quickLocate|trace-geocoding/);
 assert.doesNotMatch(map,/searchTracePlaces|lookupPlace|photon|nominatim/);
 assert.ok(!existsSync(pathOf('app/loc/TracePlaceGeocoder.jsx')));
 assert.ok(!existsSync(pathOf('app/modular/features/trace/trace-geocoding.js')));
 assert.match(mgr,/value:'placeManage'/);
 assert.match(read('app/loc/PlaceManagement.jsx'),/mode="cleanup"/);
});
test('Frame Queue uses existing selected UIDs with no county prerequisite',()=>{
 const ui=read('app/loc/TraceRouteManager.jsx');
 const db=read('app/modular/features/trace/trace-data.js');
 assert.match(ui,/import Select from 'react-select'/);
 assert.match(ui,/onClick=\{addToSpool\}/);
 assert.match(ui,/onClick=\{addRoadStop\}/);
 assert.match(ui,/readAllTraceAnchors\(owner/);
 assert.doesNotMatch(ui,/countyOptions|readTraceAddressReferences|createReferenceAnchor/);
 assert.match(db,/space_period/);
});

test('Public Trace presents on-demand selected-place articles / Culture / Statistics',()=>{
  const feature=read('app/modular/features/Trace.jsx');
  const map=read('app/modular/features/trace/TraceMap.jsx');
  const engine=read('app/modular/features/trace/trace-map-engine.js');
  const results=read('app/modular/features/trace/TracePlaceResults.jsx');
  assert.match(feature,/readTraceMapIndex\(scopeId\)/);
  assert.match(feature,/<option value="loc">LOC 自有痕跡<\/option>/);
  assert.ok(feature.indexOf('const periodScopeId=')<feature.indexOf('},[periodScopeId]);'),
    'derived Scope must be initialized before any effect dependency accesses it');
  assert.match(feature,/readCurrentTraceAnchors\(periodScopeId,currentMap\.anchor_list,/);
  assert.match(feature,/nativeOnly:periodScopeId==='loc'/);
  assert.match(feature,/onAnchorSelect=\{choosePlace\}/);
  assert.match(feature,/<TracePlaceResults place=\{reportPlace\}/);
  assert.match(feature,/\{value:'articles',label:'文章列表'\}/);
  assert.match(feature,/\{value:'timeline',label:'文化'\}/);
  assert.match(feature,/\{value:'statistics',label:'統計'\}/);
  assert.match(engine,/map\.on\('click',layer,chooseAnchor\)/);
  assert.match(map,/onAnchorSelect:!selectingLocation\?anchor=>/);
  assert.match(results,/traceArticleIdFilters\(placeIds,/);
  assert.match(results,/<CultureTimeline items=\{riverItems\}/);
  assert.match(results,/<StatisticsMultiChart type=\{chartType\}/);
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

test('Trace loads only Frame metadata at entry; content modes remain scoped and lazy',()=>{
  const trace=read('app/modular/features/Trace.jsx');
  const panel=read('app/modular/features/trace/TracePlaceResults.jsx');
  const filters=read('app/modular/features/trace/trace-panel-filters.mjs');
  const culture=read('app/modular/features/Culture.jsx');
  const stats=read('app/modular/features/Statistics.jsx');
  assert.match(trace,/\[routeListOpen\]=useState\(true\)/);
  assert.match(trace,/enabled:supported&&routeListOpen/);
  assert.match(trace,/\[timeWindow,setTimeWindow\]=useState\('all'\)/);
  assert.match(trace,/\[reportTab,setReportTab\]=useState\('articles'\)/);
  assert.match(trace,/sourceName=\{sourceName\} mediaType=\{mediaType\}/);
  assert.match(filters,/traceWindow\(window='3m'/);
  assert.match(panel,/source_name/);
  assert.match(panel,/sourceFilter/);
  // Culture owns its direct Time structure; only Statistics retains the
  // dedicated Period-navigation cache. Trace must not require either ISR.
  assert.ok(culture.includes("queryKey:['culture-timeline',scopeId]"));
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

test('Trace overview computes bounds from saved space_anchor coordinates',()=>{
 const engine=read('app/modular/features/trace/trace-map-engine.js');
 assert.match(engine,/function overview\(\)\{/);
 assert.match(engine,/\.filter\(isValidSavedAnchor\)/);
 assert.match(engine,/map\.fitBounds\(bounds/);
 assert.match(engine,/anchor\?\.trace_type!=='space_anchor'/);
});

test('Trace map resizes with mouse or keyboard while remaining inside the desktop and phone main frame',()=>{
  const map=read('app/modular/features/trace/TraceMap.jsx');
  const engine=read('app/modular/features/trace/trace-map-engine.js');
  const css=read('app/styles/features.css');
  assert.match(css,/\.loc-next-main:has\(\.loc-trace-panel\)/);
  assert.match(css,/\.loc-next-main:has\(\.loc-trace-panel\)\{min-width:0;max-width:100%;overflow-x:clip\}/);
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

test('Trace automatically loads all Scope anchors only when no saved route exists',()=>{
  const trace=read('app/modular/features/Trace.jsx');
  const map=read('app/modular/features/trace/TraceMap.jsx');
  const expression=trace.match(/const showingAll=([^;]+);/)?.[1];
  assert.ok(expression,'Trace must derive its all-anchors fallback');
  const evaluate=(currentTraceChoice,currentMap,maps)=>
    runInNewContext(expression,{currentTraceChoice,currentMap,maps});
  assert.equal(evaluate('auto',null,[]),true,'no route loads all anchors automatically');
  assert.equal(evaluate('auto',{uid:'A123'},[{uid:'A123'}]),false,'saved Current route stays lazy');
  assert.equal(evaluate('all',null,[{uid:'A123'}]),true,'manual all-anchors choice is preserved');
  assert.match(trace,/enabled:supported&&routeListOpen&&traceIndex\.data!==undefined&&\(Boolean\(currentMap\)\|\|showingAll\)/);
  assert.match(trace,/if\(!routeListOpen\|\|traceIndex\.data===undefined\)return null/);
  assert.match(trace,/anchorsQuery\.isSuccess&&periodScopeId!=='loc'/);
  assert.match(map,/autoOverviewScopeRef\.current===scope/);
  assert.match(map,/mapRef\.current\?\.overview\(\)/);
  assert.match(map,/spatialData===null\?'正在取得空間定錨點資料/);
});

test('Trace reads each real Scope table and distinguishes zero LOC rows from 581 author anchors',async()=>{
  const source=read('app/modular/features/trace/trace-data.js');
  const locRows=[],authorRows=Array.from({length:581},(_,i)=>({
    uid:String(i).padStart(4,'0'),trace_type:'space_anchor',
    title:'地點 '+i,description:{text:''},anchor_list:[],times:[],
    address:[121.5,25.02]
  }));
  const tables={loc_trace:locRows,lo3rwang_trace:authorRows,lrunes_trace:[]};
  const calls=[];
  const dbPublicClient={schema:schema=>{
    assert.equal(schema,'silver');
    return {from:table=>{
      assert.ok(Object.hasOwn(tables,table),'must use an actual Scope table: '+table);
      const call={table,columns:'',from:0,to:749,conditions:[],ids:null};
      calls.push(call);
      const query={
        select(columns){call.columns=columns;return this;},
        order(){return this;},
        range(from,to){call.from=from;call.to=to;return this;},
        eq(key,value){call.conditions.push([key,value]);return this;},
        in(_key,ids){call.ids=ids;return this;},
        limit(){return this;},
        then(resolve,reject){
          let rows=tables[table].filter(row=>call.conditions.every(([key,v])=>row[key]===v));
          if(call.ids)rows=rows.filter(row=>call.ids.includes(row.uid));
          return Promise.resolve({data:rows.slice(call.from,call.to+1),error:null}).then(resolve,reject);
        }
      };
      return query;
    }};
  }};
  const executable=source.replace(/^import [^\n]*\n/gm,'')
    .replace(/\bexport (?=(?:const|async function))/g,'');
  const {readTraceData,readTraceMapIndex,readAllTraceAnchors,readCurrentTraceAnchors}
    =new Function('dbPublicClient',executable+
      '\nreturn {readTraceData,readTraceMapIndex,readAllTraceAnchors,readCurrentTraceAnchors};')(dbPublicClient);
  assert.deepEqual(await readTraceData('loc'),{anchors:[],maps:[]});
  assert.deepEqual(await readTraceMapIndex('loc'),[]);
  assert.equal((await readTraceData('lo3rwang')).anchors.length,581);
  assert.equal((await readAllTraceAnchors('lo3rwang')).length,581);
  locRows.push({...authorRows[0],uid:'A001'});
  const matched=await readCurrentTraceAnchors('loc',['A001']);
  assert.equal(matched.length,1);
  assert.equal(matched[0].source_scope,'loc');
  assert.ok(calls.some(call=>call.table==='loc_trace'),'empty LOC must be queried');
  assert.ok(calls.some(call=>call.table==='lo3rwang_trace'),'author scope must be queried');
  assert.ok(calls.every(call=>!call.columns.includes('scope_id')),'no nonexistent union column');
});
