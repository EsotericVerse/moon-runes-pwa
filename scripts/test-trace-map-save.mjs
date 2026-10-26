import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const manager=()=>read('app/loc/TraceRouteManager.jsx');

test('route manager reads only selected Frame, never scans all anchors to open map editor',()=>{
  const entry=read('app/loc/TraceManagement.jsx');
  const page=manager();
  const db=read('app/modular/features/trace/trace-data.js');
  assert.match(entry,/enabled:enabled&&mode!=='map'/);
  assert.match(entry,/mode==='map'\)return <TraceRouteManager/);
  assert.doesNotMatch(entry,/function MapEditor\(/);
  assert.match(page,/readTraceMapIndex\(scopeId\)/);
  assert.match(page,/readCurrentTraceAnchors\(activeScope,current\.anchor_list/);
  assert.match(page,/enabled:Boolean\(current\)/);
  assert.match(page,/readTraceAnchorSuggestions\(activeScope,debouncedQuery,8\)/);
  assert.match(page,/enabled:editorOpen&&Boolean\(debouncedQuery\)/);
  assert.doesNotMatch(page,/readTraceData\(|readAllTraceAnchors\(/);
  assert.match(db,/search_scope_trace_place_names/);
  assert.doesNotMatch(page,/countyOptions|readTraceAddressReferences|createReferenceAnchor/);
});

test('Category/Class/Group/Item routes use shared hierarchy and saved Frame index; article search remains separate',()=>{
  const page=manager();
  const db=read('app/modular/features/trace/trace-data.js');
  const results=read('app/modular/features/trace/trace-panel-filters.mjs');
  assert.match(page,/routeClasses\(maps,categoryFilter\)/);
  assert.match(page,/routeGroups\(maps,categoryFilter,classFilter\)/);
  assert.match(page,/searchTraceRoutes\(maps,/);
  assert.match(page,/validateTraceRouteLabels\(category,className,group\)/);
  assert.match(db,/validateTraceRouteLabels\(category,className,group\)/);
  assert.match(db,/anchor_list:chosen/);
  assert.match(db,/nativeOnly/);
  assert.match(results,/column:'place_id'/);
  assert.doesNotMatch(results,/column:'content'/);
  assert.match(page,/將選取錨點加入 Queue/);
  assert.match(page,/MAX_STOPS=80/);
});

function saveHarness({edit=false,firstReadMiss=false,writeFails=false,cacheFails=false}={}){
  const page=manager();
  const start=page.indexOf('  const save=async event=>{');
  const end=page.indexOf('  const remove=async map=>{',start);
  assert.ok(start>0&&end>start,'actual selected-Frame save handler exists');
  const code=page.slice(start,end).trim().replace(/^const save=/,'').replace(/;\s*$/,'');
  const written=[],messages=[],states=[];
  let reads=0,clears=0;
  const expected={uid:'MAP00001',source_scope:'lo3rwang',title:'成長路線測試',
    description:'保留路線',category:'旅遊',class:'夜市',class_group:'北部',
    anchor_list:['AAA00001','BBB00002']};
  const args={
    busy:false,canEdit:true,editorOpen:true,setBusy:x=>states.push(x),
    setNotice:x=>messages.push(x),setIsError:()=>{},
    validateTraceRouteLabels:(cat,cls,grp)=>({category:cat,class:cls,class_group:grp}),
    normalize:value=>String(value||'').trim(),
    queue:['AAA00001','BBB00002'],MAX_STOPS:80,missing:[],activeScope:'lo3rwang',
    title:'成長路線測試',description:'保留路線',category:'旅遊',className:'夜市',group:'北部',
    anchors:new Map([
      ['AAA00001',{uid:'AAA00001',source_scope:'lo3rwang'}],
      ['BBB00002',{uid:'BBB00002',source_scope:'lo3rwang'}]
    ]),
    editingUid:edit?'MAP00001':'',pendingSaved:{current:null},
    referenceDraft:null,pendingReference:{current:null},
    addTraceMap:async input=>{
      if(writeFails)throw Error('授權寫入被拒絕');
      written.push({method:'insert',input});return {uid:'MAP00001'};
    },
    updateTraceMap:async input=>{
      if(writeFails)throw Error('授權寫入被拒絕');
      written.push({method:'update',input});return {uid:'MAP00001'};
    },
    index:{mutate:async()=>{reads++;return firstReadMiss&&reads===1?[]:[expected];}},
    setSelectedUid:()=>{},clearEntry:()=>{clears++;},setEditorOpen:()=>{},
    setShowMap:()=>{},refreshFrame:async()=>{if(cacheFails)throw Error('cache unavailable');}
  };
  const keys=Object.keys(args);
  const save=new Function(...keys,'return ('+code+');')(...keys.map(key=>args[key]));
  return {save,written,messages,states,get reads(){return reads;},get clears(){return clears;}};
}
test('actual save handler writes ordered UIDs and Class/Group then confirms readback',async()=>{
  const task=saveHarness();
  assert.equal(await task.save({switching:true}),true);
  assert.equal(task.written.length,1);
  assert.equal(task.written[0].input.scopeId,'lo3rwang');
  assert.equal(task.written[0].input.category,'旅遊');
  assert.equal(task.written[0].input.className,'夜市');
  assert.equal(task.written[0].input.group,'北部');
  assert.deepEqual(task.written[0].input.anchorUids,['AAA00001','BBB00002']);
  assert.equal(task.reads,1);
  assert.equal(task.clears,1);
  assert.match(task.messages.at(-1),/重新讀取確認/);
});
test('readback delay never double-inserts and keeps editing draft',async()=>{
  const task=saveHarness({firstReadMiss:true});
  assert.equal(await task.save({switching:true}),false);
  assert.equal(task.written.length,1);
  assert.equal(task.clears,0);
  assert.match(task.messages.at(-1),/保留草稿/);
  assert.equal(await task.save({switching:true}),true);
  assert.equal(task.reads,2);
  assert.equal(task.written.length,1);
  assert.equal(task.clears,1);
});
test('write rejection preserves draft; confirmed save survives secondary cache failure',async()=>{
  const denied=saveHarness({writeFails:true});
  assert.equal(await denied.save({switching:true}),false);
  assert.equal(denied.written.length,0);
  assert.equal(denied.clears,0);
  assert.match(denied.messages.at(-1),/授權寫入被拒絕/);
  const cached=saveHarness({edit:true,cacheFails:true});
  assert.equal(await cached.save({switching:true}),true);
  assert.equal(cached.written[0].method,'update');
  assert.equal(cached.clears,1);
  assert.match(cached.messages.at(-1),/已儲存並重新讀取確認/);
});
test('EditDock switch requires the Frame save to return exactly true',()=>{
  const dock=read('app/modular/edit-dock.jsx');
  const page=manager();
  assert.match(dock,/if\(saved!==true\)throw new Error/);
  assert.match(page,/return true;\s*\}catch\(error\)\{setIsError\(true\);setNotice\(String\(error\?\.message\|\|error\)\);return false;/);
});
test('unclassified saved Frames remain selectable without rewriting historic labels',()=>{
  const page=manager();
  assert.match(page,/const ALL_CLASSES='__trace_all_classes__'/);
  assert.match(page,/const ALL_GROUPS='__trace_all_groups__'/);
  assert.match(page,/categoryFilter!==ALL_CATEGORIES\?\{category:categoryFilter\}/);
  assert.match(page,/classFilter!==ALL_CLASSES\?\{className:classFilter\}/);
  assert.match(page,/groupFilter!==ALL_GROUPS\?\{group:groupFilter\}/);
  assert.match(page,/traceClassLabel\(value\)/);
  assert.match(page,/value\|\|'未分組'/);
  assert.doesNotMatch(page,/availableGroups\.filter\(Boolean\)/);
});

test('Trace page edit navigation opens the selected Frame by UID, not a local default',()=>{
  const feature=read('app/modular/features/Trace.jsx');
  const editor=manager();
  assert.match(feature,/section=traceMap&frame='/);
  assert.match(feature,/encodeURIComponent\(currentMap\.uid\)/);
  assert.match(editor,/index\.data\.find\(map=>map\.source_scope===activeScope&&map\.uid===requestedFrame\)/);
  assert.match(editor,/openedFrame\.current===key/);
  assert.match(editor,/edit\(target\)/);
});

test('selected Frame connects points by saved order without a road-network requirement',()=>{
  const engine=read('app/modular/features/trace/trace-map-engine.js');
  const page=manager();
  assert.match(engine,/geometry:\{type:'LineString',coordinates:/);
  assert.match(engine,/previous\.longitude/);
  assert.match(engine,/previous\.latitude/);
  assert.match(page,/兩站不需要相鄰/);
  assert.doesNotMatch(page,/router\.push|featureNavigationHref/);
});

test('LOC Frame management uses existing Scope-owned UIDs without auto-creating places',()=>{
  const page=manager();
  assert.match(page,/useState\(scopeId\)/);
  assert.doesNotMatch(page,/useState\(scopeId==='loc'\?'lo3rwang':scopeId\)/);
  assert.match(page,/readTraceMapIndex\(scopeId\)/);
  assert.match(page,/readCurrentTraceAnchors\(activeScope,current\.anchor_list,/);
  assert.match(page,/account\.canManageScopeSync\(activeScope\)/);
  assert.doesNotMatch(page,/createReferenceAnchor|readTraceAddressReferences|forceNewIdentity/);
});

test('searches are bounded, address-aware, read-only and escape OR metacharacters',async()=>{
  const file=read('app/modular/features/trace/trace-data.js');
  const match=file.match(/export async function readTraceAddressReferences[\s\S]*?\n\}/);
  assert.ok(match);
  const calls=[];
  const query={
    select(...v){calls.push(['select',...v]);return this;},
    eq(...v){calls.push(['eq',...v]);return this;},
    neq(...v){calls.push(['neq',...v]);return this;},
    not(...v){calls.push(['not',...v]);return this;},
    or(...v){calls.push(['or',...v]);return this;},
    order(...v){return this;},
    async limit(v){calls.push(['limit',v]);return {data:[],error:null};},
  };
  const dbPublicClient={schema:()=>({from:table=>{
    calls.push(['from',table]);return query;
  }})};
  const scopeId=x=>{assert.ok(['loc','lo3rwang','lrunes'].includes(x));return x;};
  const readReference=new Function('dbPublicClient','sourceId','verified',
    match[0].replace('export async function','async function')+';return readTraceAddressReferences'
  )(dbPublicClient,scopeId,response=>response.data);
  assert.deepEqual(await readReference('loc','新北市(二),文化路'),[]);
  assert.ok(calls.some(call=>call[0]==='neq'&&call[1]==='scope_id'&&call[2]==='loc'));
  assert.ok(calls.some(call=>call[0]==='or'&&call[1].includes('"%新北市(二),文化路%"')));
  assert.ok(calls.some(call=>call[0]==='limit'&&call[1]===8));
  assert.equal(calls.filter(call=>call[0]==='from').length,1);
});

test('Frame editor never auto-inserts extra anchors from cross-Scope suggestions',()=>{
 const page=manager();
 assert.doesNotMatch(page,/pendingReference|referenceDraft|createReferenceAnchor/);
 assert.match(page,/onClick=\{addPoint\}>＋/);
});

test('LOC native duplicate checks never enumerate foreign public-union anchors',async()=>{
  const data=read('app/modular/features/trace/trace-data.js');
  assert.match(data,/readAllTraceAnchors\(scopeId,\{nativeOnly=false\}=\{\}\)/);
  assert.match(data,/if\(union&&nativeOnly\)request=request\.eq\('scope_id','loc'\)/);
  assert.match(data,/const anchors=await readAllTraceAnchors\(id,\{nativeOnly:id==='loc'\}\)/);
  assert.match(data,/comparableAnchors\(\{anchors\},id,excludeUid\)/);
  const code=data.match(/export async function readAllTraceAnchors[\s\S]*?\n\}/);
  assert.ok(code,'own-anchor reader should be executable');
  const calls=[];
  const query={
    select(){return this;},
    eq(key,value){calls.push([key,value]);return this;},
    order(){return this;},
    async range(){return {data:[{uid:'OWN00001',scope_id:'loc',trace_type:'anchor'}],error:null};}
  };
  const dbPublicClient={schema:()=>({from:()=>query})};
  const reader=new Function('dbPublicClient','sourceId','verified','TRACE_DISPLAY_COLUMNS',
    code[0].replace('export async function','async function')+';return readAllTraceAnchors'
  )(dbPublicClient,x=>x,response=>response.data,'uid,trace_type');
  const result=await reader('loc',{nativeOnly:true});
  assert.ok(calls.some(([key,value])=>key==='scope_id'&&value==='loc'));
  assert.equal(result[0].source_scope,'loc');
});

test('category/Class/Group/Frame flow retains legacy unclassified routes',async()=>{
  const base=read('app/loc/model/class-group-items.mjs');
  const labels=read('app/modular/features/trace/trace-route-classes.mjs');
  assert.match(base,/export function categoryClassGroupIndex/);
  assert.match(labels,/categoryClassGroupIndex\(maps/);
  assert.match(labels,/traceCategoryOf=route=>normalizeClassificationText\(route\?\.category\)/);
  const managerSource=manager();
  assert.match(managerSource,/availableCategories=useMemo/);
  assert.match(managerSource,/setCategory\(map.category\|\|''\)/);
  assert.match(managerSource,/category:labels.category/);
  assert.match(managerSource,/normalize\(found.category\)!==labels.category/);
  const db=read('app/modular/features/trace/trace-data.js');
  assert.match(db,/created_at,category,"class",class_group/);
  assert.match(db,/validatedTraceMapValues\(\{scopeId:id,title,description,category,className,group/);
});

test('one autocomplete suggestion is not implicitly selected before the user chooses it',()=>{
  const page=manager();
  const expression=page.match(/const choice=([\s\S]*?);/);
  assert.ok(expression,'real autocomplete selection expression found');
  const choose=new Function('picked','pointQuery','county','suggestions',
    'return ('+expression[1]+');');
  const candidate={uid:'OWN00001',title:'同名景點',county_id:'TW-NWT'};
  assert.equal(choose(null,'同名景點','TW-NWT',[candidate]),null);
  assert.equal(choose(candidate,'同名景點','TW-NWT',[candidate]),candidate);
  assert.equal(choose(candidate,'同名景點2','TW-NWT',[candidate]),null);
});

test('public LOC Trace can view its own native Frames, not hidden behind author or union entries',()=>{
  const publicTrace=read('app/modular/features/Trace.jsx');
  const db=read('app/modular/features/trace/trace-data.js');
  assert.match(publicTrace,/<option value="loc">LOC 自有痕跡<\/option>/);
  assert.match(publicTrace,/readTraceMapIndex\(scopeId\)/);
  assert.match(publicTrace,/readCurrentTraceAnchors\(periodScopeId,currentMap\.anchor_list,\s*\{nativeOnly:periodScopeId==='loc'\}\)/);
  assert.match(publicTrace,/readAllTraceAnchors\(periodScopeId,\{nativeOnly:periodScopeId==='loc'\}\)/);
  assert.match(publicTrace,/traceMapIndexKey\(scopeId\)/);
  assert.match(db,/export const traceMapIndexKey=\(scopeId,\{nativeOnly=false\}=\{\}\)=>/);
  assert.match(db,/nativeOnly\?\['trace-map-index',scopeId,'native'\]/);
});

test('LOC public Trace auto discovers an existing author Frame without moving its UID',()=>{
  const page=read('app/modular/features/Trace.jsx');
  assert.match(page,/readTraceMapIndex\(scopeId\)/);
  assert.match(page,/const visibleScopes=\['loc','lo3rwang','lrunes'\]/);
  assert.match(page,/visibleScopes\.find\(id=>allMaps\.some\(row=>row\.source_scope===id\)\)/);
  assert.match(page,/allMaps\.filter\(row=>row\.source_scope===periodScopeId\)/);
  assert.match(page,/<option value="auto">自動顯示已儲存痕跡<\/option>/);
  assert.match(page,/<option value="lo3rwang">作者作品<\/option>/);
  assert.match(page,/readCurrentTraceAnchors\(periodScopeId,currentMap\.anchor_list,/);
});
test('LOC manager discovers existing author Frames in one safe union index',()=>{
  const managerSource=manager();
  assert.match(managerSource,/readTraceMapIndex\(scopeId\)/);
  assert.match(managerSource,/const maps=.*filter\(row=>row\.source_scope===activeScope\)/);
  assert.match(managerSource,/const allSavedFrames=.*index\.data/);
  assert.match(managerSource,/已儲存的其他範圍痕跡圖/);
  assert.match(managerSource,/setActiveScope\(row\.source_scope\)/);
});
test('Trace Map cannot resize or escape its parent layout at narrow mobile widths',()=>{
  const map=read('app/modular/features/trace/TraceMap.jsx');
  const css=read('app/styles/features.css');
  assert.match(map,/Math\.min\(availableWidth,Math\.max\(/);
  assert.doesNotMatch(css,/width:calc\(100% \+ 1\.5rem\)/);
  assert.doesNotMatch(css,/max-width:calc\(100% \+ 1\.5rem\)/);
  assert.match(css,/\.loc-trace-map-shell\{[^}]*max-width:100%/);
  assert.match(css,/\.loc-trace-panel\{[^}]*max-width:100%/);
});

test('LOC trace management entry shows existing Frame manager before anchor editor',()=>{
  const source=read('app/loc/ScopeManagement.jsx');
  assert.match(source,/useManagementSection\(options,isLoc\?'traceMap':''\)/);
  assert.match(source,/section==='traceMap'\?<TraceManagementPanel scopeId=\{routeScopeId\} mode="map"/);
});
