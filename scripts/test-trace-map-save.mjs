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
  assert.match(page,/readTraceMapIndex\(activeScope,/);
  assert.match(page,/readCurrentTraceAnchors\(activeScope,current\.anchor_uids/);
  assert.match(page,/enabled:Boolean\(current\)/);
  assert.match(page,/readTraceAnchorSuggestions\(activeScope,county,debouncedQuery,8\)/);
  assert.match(page,/enabled:editorOpen&&Boolean\(county&&debouncedQuery\)/);
  assert.doesNotMatch(page,/readTraceData\(|readAllTraceAnchors\(/);
  assert.match(db,/request\.ilike\('title',pattern\)/);
  assert.match(db,/uid\.eq\./);
});

test('Class/Group and route names use the saved Frame index; article search remains separate',()=>{
  const page=manager();
  const db=read('app/modular/features/trace/trace-data.js');
  const results=read('app/modular/features/trace/trace-panel-filters.mjs');
  assert.match(page,/routeClasses\(maps\)/);
  assert.match(page,/routeGroups\(maps,classFilter\)/);
  assert.match(page,/searchTraceRoutes\(maps,/);
  assert.match(page,/validateTraceRouteLabels\(className,group\)/);
  assert.match(db,/validateTraceRouteLabels\(className,group\)/);
  assert.match(db,/anchor_uids:chosen/);
  assert.match(db,/nativeOnly/);
  assert.match(results,/column:'source_place'/);
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
    description:'保留路線',class:'跟朋友',class_group:'夜市',
    anchor_uids:['AAA00001','BBB00002']};
  const args={
    busy:false,canEdit:true,editorOpen:true,setBusy:x=>states.push(x),
    setNotice:x=>messages.push(x),setIsError:()=>{},
    validateTraceRouteLabels:(cls,grp)=>({class:cls,class_group:grp}),
    normalize:value=>String(value||'').trim(),
    queue:['AAA00001','BBB00002'],MAX_STOPS:80,missing:[],activeScope:'lo3rwang',
    title:'成長路線測試',description:'保留路線',className:'跟朋友',group:'夜市',
    anchors:new Map([
      ['AAA00001',{uid:'AAA00001',source_scope:'lo3rwang'}],
      ['BBB00002',{uid:'BBB00002',source_scope:'lo3rwang'}]
    ]),
    editingUid:edit?'MAP00001':'',pendingSaved:{current:null},
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
  assert.equal(task.written[0].input.className,'跟朋友');
  assert.equal(task.written[0].input.group,'夜市');
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
  assert.match(editor,/index\.data\.find\(map=>map\.uid===requestedFrame\)/);
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