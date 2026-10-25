import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('LOC route editor selects an authorized source Scope, never filters to empty LOC-only mirrors',()=>{
  const src=read('app/loc/TraceManagement.jsx');
  assert.match(src,/const \[routeScopeId,setRouteScopeId\]=useState\(/);
  assert.match(src,/scopeId==='loc'\s*\?editableScopes\.includes\(routeScopeId\)\?routeScopeId:editableScopes\[0\]/);
  assert.match(src,/account\.canManageScopeSync\(source\)/);
  assert.match(src,/spatial\.anchors\.filter\(row=>row\.source_scope===writeScopeId\)/);
  assert.match(src,/input=\{scopeId:writeScopeId,title,description,anchorUids:selected,anchors\}/);
  assert.match(src,/可編輯的作品範圍/);
});

test('Trace save result is confirmed by a fresh read before clearing the story and stops',()=>{
  const src=read('app/loc/TraceManagement.jsx');
  assert.match(src,/const written=editingUid\s*\?await updateTraceMap/);
  assert.match(src,/const fresh=await reload\(\)/);
  assert.match(src,/fresh\.maps\.find\(row=>row\.uid===saved\.uid/);
  assert.match(src,/setNoticeError\(true\)/);
  assert.match(src,/useEditDockForm\(\{save,isDirty:\(\)=>dirty,isBusy:\(\)=>busy\}\)/);
  const writes=read('app/modular/features/trace/trace-data.js');
  assert.match(writes,/dbAuthRelation\(relation\(id\)\)\.insert\(data\)\.select\('uid'\)\.single\(\)/);
  assert.match(writes,/chosen\.some\(uid=>!existing\.has\(uid\)\)/);
});

test('a successful route edit refreshes public Trace without changing database policy',()=>{
  const src=read('app/loc/TraceManagement.jsx');
  assert.match(src,/revalidateServerMetadata\(\)/);
  assert.match(src,/cache\.invalidate\(\{queryKey:traceKey\('loc'\)\}\)/);
  assert.match(src,/row\.source_scope===writeScopeId/);
  assert.match(src,/deleteTraceMap\(\{scopeId:map\.source_scope,uid:map\.uid\}\)/);
  assert.match(read('app/modular/features/trace/TraceMap.jsx'),/selectedRouteUid/);
  assert.match(read('app/modular/features/trace/trace-map-engine.js'),/setSavedRoute/);
});

function actualRouteSaveHarness({firstReadMiss=false,writeFails=false,cacheFails=false,edit=false}={}){
  const editor=read('app/loc/TraceManagement.jsx');
  const body=editor.slice(editor.indexOf('function MapEditor('));
  const match=body.match(/  const save=async\(\)=>\{[\s\S]*?\n  \};\n  const remove=async/);
  assert.ok(match,'MapEditor Save must remain an actual callable handler');
  const code=match[0].replace(/\n  const remove=async$/,'')
    .replace(/^  const save=/,'').trim().replace(/;$/,'');
  const written=[],messages=[];
  let reads=0,resets=0;
  const pendingSavedRef={current:null};
  const args={
    busy:false,editorOpen:true,setBusy:()=>{},setNotice:msg=>messages.push(msg),
    setNoticeError:()=>{},writeScopeId:'lo3rwang',
    title:'成長路線測試',description:'保留原始故事',
    selected:['ABC12345','DEF67890'],
    anchors:[{uid:'ABC12345',source_scope:'lo3rwang'},{uid:'DEF67890',source_scope:'lo3rwang'}],
    editingUid:edit?'A1B2C3D4':'',pendingSavedRef,
    updateTraceMap:async payload=>{written.push({type:'update',payload});return {uid:'A1B2C3D4'};},
    addTraceMap:async payload=>{
      if(writeFails)throw Error('受保護寫入被拒絕');
      written.push({type:'insert',payload});
      return {uid:'A1B2C3D4'};
    },
    reload:async()=>{
      reads++;
      if(firstReadMiss&&reads===1)return {maps:[]};
      return {maps:[{uid:'A1B2C3D4',source_scope:'lo3rwang',
        title:'成長路線測試',description:'保留原始故事',
        anchor_uids:['ABC12345','DEF67890']}]};
    },
    setExpandedIds:()=>{},reset:()=>{resets++;pendingSavedRef.current=null;},
    setEditorOpen:()=>{},revalidateServerMetadata:async()=>true,
    cache:{invalidate:async()=>{if(cacheFails)throw Error('cache temporarily unavailable');}},
    traceKey:scope=>['scope-trace',scope]
  };
  const keys=Object.keys(args);
  const save=new Function(...keys,'return ('+code+');')(...keys.map(k=>args[k]));
  return {save,written,messages,get reads(){return reads;},get resets(){return resets;}};
}

test('actual Trace save handler writes to selected source and confirms a fresh read',async()=>{
  const task=actualRouteSaveHarness();
  assert.equal(await task.save(),true);
  assert.equal(task.written.length,1);
  assert.equal(task.written[0].type,'insert');
  assert.equal(task.written[0].payload.scopeId,'lo3rwang');
  assert.deepEqual(task.written[0].payload.anchorUids,['ABC12345','DEF67890']);
  assert.equal(task.resets,1);
  assert.match(task.messages.at(-1),/重新讀取確認/);
});

test('actual handler never double inserts after readback delay',async()=>{
  const task=actualRouteSaveHarness({firstReadMiss:true});
  assert.equal(await task.save(),false);
  assert.equal(task.resets,0,'preserve draft while unconfirmed');
  assert.equal(await task.save(),true,'retry readback, not insert');
  assert.equal(task.written.length,1);
  assert.equal(task.reads,2);
});

test('actual handler preserves draft on rejected write, and cache failure does not erase a successful save',async()=>{
  const rejected=actualRouteSaveHarness({writeFails:true});
  assert.equal(await rejected.save(),false);
  assert.equal(rejected.resets,0);
  assert.equal(rejected.written.length,0);
  assert.match(rejected.messages.at(-1),/寫入被拒絕/);
  const cached=actualRouteSaveHarness({cacheFails:true,edit:true});
  assert.equal(await cached.save(),true);
  assert.equal(cached.written[0].type,'update');
  assert.equal(cached.resets,1);
});
