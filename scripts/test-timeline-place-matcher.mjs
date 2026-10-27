import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 timelineVisitWindows,timelineCoordinates,matchTimelineWindows,accumulateTimelineArticles
} from '../app/loc/timeline-place-matcher.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const row=(uid,title,lat,lng)=>({uid,title,trace_type:'space_anchor',address:[lng,lat]});

test('new Google phone Timeline uses visits, ignores movements, preserves offset',()=>{
 const document={semanticSegments:[
  {startTime:'2026-10-01T09:00:00+08:00',endTime:'2026-10-01T10:00:00+08:00',
   visit:{topCandidate:{placeLocation:{latLng:'25.0123°, 121.4567°'},probability:0.8}}},
  {startTime:'2026-10-01T10:00:00+08:00',endTime:'2026-10-01T11:00:00+08:00',
   activity:{start:{latLng:'25.0100°, 121.4510°'}}}
 ]};
 const result=timelineVisitWindows(document);
 assert.equal(result.length,1);
 assert.equal(result[0].from,'2026-10-01T01:00:00.000Z');
 assert.equal(result[0].uncertain,false);
});
test('legacy Timeline placeVisit and E7 coordinates work',()=>{
 const old={timelineObjects:[{placeVisit:{location:{latitudeE7:250123000,longitudeE7:1214567000},
 duration:{startTimestamp:'2026-10-01T00:00:00Z',endTimestamp:'2026-10-01T01:00:00Z'}}}]};
 const v=timelineVisitWindows(old);
 assert.equal(v.length,1);
 assert.equal(v[0].lat,25.0123);
 assert.equal(v[0].lng,121.4567);
 assert.deepEqual(timelineCoordinates('geo:25.0123,121.4567'),{lat:25.0123,lng:121.4567});
});
test('outside 500m stays empty; two inside 500m become disputed',()=>{
 const windows=timelineVisitWindows({semanticSegments:[{startTime:'2026-01-01T00:00:00Z',
 endTime:'2026-01-01T01:00:00Z',visit:{topCandidate:{placeLocation:{latLng:'25°,121°'}}}}]});
 const anchors=[row('A001','甲',25,121),row('A002','乙',25,121.001),row('B003','遠方',26,121)];
 const match=matchTimelineWindows(windows,anchors);
 assert.equal(match.windows.length,1);
 assert.deepEqual(match.windows[0].candidates.map(c=>c.uid),['A001','A002']);
 assert.equal(match.windows[0].disputed,true);
 assert.equal(matchTimelineWindows(windows,[anchors[2]]).withoutAnchor,1);
});
test('article is auto eligible only when one anchor and no prior ID',()=>{
 const window={candidates:[{uid:'A001',title:'甲',meters:20}],disputed:false};
 const rows=[{uid:'11111111',title:'文章',createtime:'2026-01-01T00:10:00Z',place_id:null,window},
  {uid:'22222222',title:'已存在',createtime:'2026-01-01T00:10:00Z',place_id:'B002',window},
  {uid:'33333333',title:'相同',createtime:'2026-01-01T00:10:00Z',place_id:'A001',window}];
 const result=accumulateTimelineArticles(rows);
 assert.deepEqual(result.ready.map(x=>x.uid),['11111111']);
 assert.deepEqual(result.disputes.map(x=>x.uid),['22222222']);
 assert.deepEqual(result.unchanged.map(x=>x.uid),['33333333']);
});
test('overlapping visits to different places never auto apply a guessed ID',()=>{
 const hit=(placeId)=>({uid:'11111111',title:'文章',createtime:'2026-01-01T00:10:00Z',
 place_id:null,window:{candidates:[{uid:placeId,title:placeId,meters:20}],disputed:false}});
 const x=accumulateTimelineArticles([hit('A001'),hit('B002')]);
 assert.equal(x.ready.length,0);
 assert.equal(x.disputes.length,1);
});
test('UI is owner-only, conflict choices start skipped, source_place never written',()=>{
 const ui=read('app/loc/TimelinePlaceManager.jsx');
 const page=read('app/loc/PlaceManagement.jsx');
 const migration=read('supabase/migrations/20261027225000_timeline_place_id_review.sql');
 assert.match(page,/地點整理 · Google Timeline JSON 匯入／糾紛點/);
 assert.match(ui,/readAllTraceAnchors\(scopeId,\{includeHidden:true\}\)/);
 assert.match(ui,/if\(!window\.confirm\(/);
 assert.match(ui,/const \[decisions,setDecisions\]=useState\(\{\}\)/);
 assert.match(ui,/p_scope_id:scopeId,p_updates:batch/);
 assert.match(ui,/disputes:previous\.disputes\.filter\(row=>!resolved\.has\(row\.uid\)\)/);
 assert.doesNotMatch(migration,/SET source_place|SET\s+source_place|g\.source_place/);
 assert.match(migration,/g\.place_id IS NOT DISTINCT FROM \$3/);
 assert.match(migration,/silver\.can_manage_scope\(p_scope_id\)/);
});
