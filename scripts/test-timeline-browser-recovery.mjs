import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {saveTimelineReviewSession,loadTimelineReviewSession,timelineReviewCacheOversized} from '../app/loc/timeline-review-session.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const fakeStorage=()=>{
  const data=new Map();
  return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
};
const base={scopeId:'lo3rwang',owner:'test-owner',groupChoices:{},itemChoices:{},excluded:{},completedCount:0};

test('Timeline JSON parsing and anchor matching run in a browser Worker',async()=>{
  const calls=[];
  globalThis.self={postMessage:value=>calls.push(value)};
  const worker=await import('../app/loc/timeline-analysis.worker.mjs');
  const anchors=[{uid:'0001',title:'Test',trace_type:'space_anchor',address:[121.4567,25.0123]}];
  const visit={semanticSegments:[{startTime:'2026-10-01T09:00:00+08:00',endTime:'2026-10-01T10:00:00+08:00',visit:{topCandidate:{placeLocation:{latLng:'25.0123°,121.4567°'}}}}]};
  const summary=worker.analyzeTimelineDocument(visit,anchors);
  assert.equal(summary.visitCount,1);
  assert.equal(summary.matched.windows[0].candidates[0].uid,'0001');
  await globalThis.self.onmessage({data:{file:{text:async()=>JSON.stringify(visit)},anchors}});
  assert.equal(calls[0].ok,true);
  await globalThis.self.onmessage({data:{file:{text:async()=>'{broken'},anchors}});
  assert.equal(calls[1].ok,false);
  const ui=read('app/loc/TimelinePlaceManager.jsx');
  assert.doesNotMatch(ui,/JSON\.parse\(await selectedFile\.text\(\)\)/);
  assert.match(ui,/new Worker\(new URL\('\.\/timeline-analysis\.worker\.mjs'/);
  assert.match(ui,/abortWorker\(\);setAnalyzing\(false\)/);
});

test('large stale review cache cannot block the management page and is not deleted',()=>{
  const storage=fakeStorage(),key='loc-timeline-review:lo3rwang';
  storage.setItem(key,'x'.repeat(3*1024*1024+1));
  assert.equal(timelineReviewCacheOversized(storage,'lo3rwang'),true);
  assert.equal(loadTimelineReviewSession(storage,base),null);
  assert.equal(storage.getItem(key).length,3*1024*1024+1);
});

test('small optional review saves stay recoverable without raw GPS coordinates',()=>{
  const storage=fakeStorage();
  const analysis={ready:[{uid:'11111111',title:'Article',coordinates:['25.0123,121.4567'],commonAnchors:['0001'],candidates:[{uid:'0001',title:'Test',meters:8}]}],disputes:[],unchanged:[]};
  assert.equal(saveTimelineReviewSession(storage,{...base,analysis}),true);
  const loaded=loadTimelineReviewSession(storage,base);
  assert.equal(loaded.analysis.ready.length,1);
  assert.equal(loaded.analysis.ready[0].coordinates,undefined);
  assert.equal(loaded.analysis.ready[0].commonAnchors,undefined);
  assert.equal(loaded.analysis.ready[0].candidates[0].uid,'0001');
});

test('oversized new review cannot overwrite an existing valid snapshot',()=>{
  const storage=fakeStorage(),key='loc-timeline-review:lo3rwang';
  const analysis={ready:[{uid:'11111111'}],disputes:[],unchanged:[]};
  assert.equal(saveTimelineReviewSession(storage,{...base,analysis}),true);
  const previous=storage.getItem(key);
  assert.equal(saveTimelineReviewSession(storage,{...base,analysis:{ready:[{uid:'22222222',title:'x'.repeat(9*1024*1024)}],disputes:[],unchanged:[]}}),false);
  assert.equal(storage.getItem(key),previous);
});
