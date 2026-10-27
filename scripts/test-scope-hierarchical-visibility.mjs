import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('public data queries remain isolated from manager-only hidden rows',()=>{
 const source=read('app/modular/features/trace/trace-data.js');
 assert.match(source,/includeHidden\?dbAuthClient:dbPublicClient/);
 assert.match(source,/traceMapIndexKey=\(scopeId,\{nativeOnly=false,includeHidden=false\}/);
 assert.match(source,/route_list,hidden_depth/);
 const manager=read('app/loc/TraceRouteManager.jsx');
 assert.match(manager,/readTraceMapIndex\(scopeId,\{includeHidden:own\}\)/);
 assert.match(manager,/updateTraceVisibilityBulk/);
 const anchor=read('app/loc/TraceManagement.jsx');
 assert.match(anchor,/readTraceData\(scopeId,\{includeHidden:true\}\)/);
});
test('time and space editor support three scope levels and manager bulk actions',()=>{
 const time=read('app/modular/features/CultureTimelineEditor.jsx');
 const space=read('app/loc/TraceRouteManager.jsx');
 assert.match(time,/TIME_COLUMNS=.*hidden_depth/);
 assert.match(time,/authenticated:true/);
 assert.match(time,/bulkSetVisibility/);
 assert.match(space,/bulkSelected/);
 assert.match(space,/routeUids/);
 assert.match(space,/hiddenDepth/);
});
test('database policies enforce ancestor inheritance rather than only UI filtering',()=>{
 const migration=read('supabase/migrations/20261027214000_scope_hierarchical_visibility.sql');
 assert.match(migration,/SECURITY DEFINER/);
 assert.match(migration,/CREATE POLICY/);
 assert.match(migration,/is_time_record_public/);
 assert.match(migration,/is_spatial_record_public/);
 assert.match(migration,/hidden_depth>=2/);
});
test('trace article lists do not expose hidden location metadata',()=>{
 const trace=read('app/modular/features/trace/TracePlaceResults.jsx');
 assert.doesNotMatch(trace,/checkInPlace=|source_name,source_place/);
});

test('spatial trace may be made from routes only; saved trace still draws linked stops',()=>{
  const source=read('app/modular/features/trace/trace-data.js');
  const start=source.indexOf('function validatedConnections(');
  const end=source.indexOf('// A Spatial Trace',start);
  assert.ok(start>=0&&end>start);
  const fn=new Function('idScope','VALID_ID',source.slice(start,end)+'\\nreturn validatedConnections;')(
    value=>value,/^[A-Za-z0-9]{4}$/);
  assert.deepEqual(fn({scopeId:'lo3rwang',type:'space_trace',anchorUids:[],
    anchors:[],hasRoutes:true}),[]);
  assert.throws(()=>fn({scopeId:'lo3rwang',type:'space_trace',anchorUids:[],
    anchors:[],hasRoutes:false}),/痕跡圖/);
  const manager=read('app/loc/TraceRouteManager.jsx');
  assert.match(manager,/currentRouteMembers/);
  assert.match(manager,/currentMemberUids/);
  assert.match(manager,/maps:\[preview,\.\.\.currentRouteMembers\]/);
  assert.match(manager,/type==='space_trace'&&routeUids\.length>0/);
});
