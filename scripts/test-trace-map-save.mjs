import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const manager=()=>read('app/loc/TraceRouteManager.jsx');

test('route selector uses canonical path and trace, not retired road type',()=>{
 const page=manager(),db=read('app/modular/features/trace/trace-data.js');
 assert.match(page,/openNew\('path'\)/);
 assert.match(page,/openNew\('trace'\)/);
 assert.match(db,/type='path'/);
 assert.match(db,/validatedConnections/);
 for(const source of [page,db])assert.doesNotMatch(source,/['"]space_road['"]/);
});
test('route editor loads only owned Scope records and IDs; no county required',()=>{
 const page=manager();
 assert.match(page,/account\.canManageScopeSync\(owner\)/);
 assert.match(page,/\.filter\(row=>row\.source_scope===owner\)/);
 assert.match(page,/readTraceMapIndex\(owner,\{includeHidden:own\}\)/);
 assert.match(page,/traceMapIndexKey\(owner,\{includeHidden:own\}\)/);
 assert.match(page,/enabled:TRACE_SCOPES.includes\(owner\)&&own/);
 assert.doesNotMatch(page,/readTraceMapIndex\(scopeId,\{includeHidden:own\}\)/);
 assert.match(page,/readCurrentTraceAnchors\(owner,currentMemberUids/);
 assert.match(page,/readAllTraceAnchors\(owner/);
 assert.doesNotMatch(page,/countyOptions|selectedCounty|county_id/);
});
function saveHarness({writeFails=false,readMiss=false}={}){
 const page=manager(),start=page.indexOf('  const save=async event=>{');
 const end=page.indexOf('  const remove=async row=>{',start);
 assert.ok(start>=0&&end>start);
 const code=page.slice(start,end).trim().replace(/^const save=/,'').replace(/;\s*$/,'');
 const written=[],notice=[],receipt={current:null};
 let reads=0,cleared=0;
 const row={uid:'R001',source_scope:'lo3rwang',trace_type:'path',
   title:'旅程',anchor_list:['A001','B002'],route_list:[],invisible:false};
 const args={
  busy:false,own:true,editorOpen:true,setBusy:()=>{},setNotice:v=>notice.push(v),setError:()=>{},
  title:'旅程',type:'path',queue:['A001','B002'],MAX_ROAD:80,
  invisible:false,routeUids:[],
  pairs:[],MAX_LINES:400,validPair:()=>true,chosenIds:['A001','B002'],
  anchorMap:new Map([['A001',{}],['B002',{}]]),owner:'lo3rwang',description:'',
  allAnchors:[{uid:'A001',source_scope:'lo3rwang'},{uid:'B002',source_scope:'lo3rwang'}],
  savedReceipt:null,editingUid:'',
  addTraceMap:async input=>{if(writeFails)throw Error('授權寫入被拒');written.push(input);return {uid:'R001'};},
  updateTraceMap:async()=>{throw Error('Unexpected update');},
  setSavedReceipt:v=>{args.savedReceipt=v;},
  index:{mutate:async()=>{reads++;return readMiss?[]:[row];}},
  clear:()=>{cleared++;},setSelectedUid:()=>{},setEditorOpen:()=>{},setShowMap:()=>{},
  refresh:async()=>{}
 };
 const keys=Object.keys(args);
 const construct=()=>new Function(...keys,'return ('+code+')')(...keys.map(k=>args[k]));
 return {execute:()=>construct()(),written,notice,args,get reads(){return reads;},get cleared(){return cleared;}};
}
test('actual save handler writes ordered Queue and waits for readback',async()=>{
 const h=saveHarness();
 assert.equal(await h.execute(),true);
 assert.deepEqual(h.written[0].anchorUids,['A001','B002']);
 assert.equal(h.written[0].type,'path');
 assert.equal(h.reads,1);assert.equal(h.cleared,1);
});
test('failed readback preserves draft and does not insert a duplicate',async()=>{
 const h=saveHarness({readMiss:true});
 assert.equal(await h.execute(),false);assert.equal(h.written.length,1);
 assert.equal(h.cleared,0);
 assert.equal(await h.execute(),false);
 assert.equal(h.written.length,1);
 assert.match(h.notice.at(-1),/保留草稿/);
});
test('failed database write preserves draft',async()=>{
 const h=saveHarness({writeFails:true});
 assert.equal(await h.execute(),false);
 assert.equal(h.written.length,0);assert.equal(h.cleared,0);
 assert.match(h.notice.at(-1),/授權寫入被拒/);
});
test('new spatial connections validate Scope membership and 4-char UID',()=>{
 const source=read('app/modular/features/trace/trace-data.js');
 assert.match(source,/const VALID_ID=\/\^\[A-Za-z0-9\]\{4\}\$\//);
 assert.match(source,/row\.source_scope===id/);
 assert.match(source,/連線含不存在或跨 Scope 的地點/);
 assert.match(source,/new Set\(list\)\.size!==list\.length/);
 assert.match(source,/pair\[0\]===pair\[1\]/);
});

test('route owner can click visible map anchors to append the ordered Queue',()=>{
 const page=manager();
 assert.match(page,/onAnchorSelect=\{addMapSelectedAnchor\}/);
 assert.match(page,/spatialData=\{\{anchors:allAnchors,maps:preview\?\[preview,\.\.\.records\.filter/);
 assert.match(page,/setQueue\(items=>items\.includes\(uid\)\|\|items\.length>=MAX_ROAD/);
 assert.match(page,/!editorOpen&&showMap&&preview/);
 const start=page.indexOf('  const addMapSelectedAnchor=anchor=>{');
 const end=page.indexOf('  const refresh=async()=>{',start);
 assert.ok(start>=0&&end>start);
 const source=page.slice(start,end).trim().replace(/^const addMapSelectedAnchor=/,'')
   .replace(/;\s*$/,'');
 const state={queue:[],spool:[]},args={
   busy:false,own:true,editorOpen:true,anchorMap:new Map([['A001',{}],['B002',{}],['C003',{}]]),
   type:'path',MAX_ROAD:80,MAX_LINES:400,mapStart:'',
   setSpool(fn){state.spool=fn(state.spool);},
   setQueue(fn){state.queue=fn(state.queue);},
   setMapStart(){},setPairs(){}
 };
 const handler=new Function(...Object.keys(args),'return ('+source+')')(...Object.values(args));
 handler({uid:'A001'});handler({uid:'A001'});handler({uid:'B002'});
 handler({uid:'NONEXIST'});
 assert.deepEqual(state.queue,['A001','B002']);
 assert.deepEqual(state.spool,['A001','B002']);
});
