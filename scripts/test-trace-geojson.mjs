import test from 'node:test';
import assert from 'node:assert/strict';
import {spaceGraphGeojson} from '../app/modular/features/trace/space-graph-geojson.mjs';

const scope='lo3rwang';
const place=(uid,coordinates=null)=>({uid,source_scope:scope,trace_type:'anchor',
  title:uid,...(coordinates?{address:coordinates}:{})});
const a=place('A001',[121,25]),b=place('B002',[120,24]),
  missing=place('C003'),d=place('D004',[119,23]);
const route=(uid,ids)=>({uid,source_scope:scope,type:'space_period',anchor_list:ids});
const r1=route('R001',['A001','B002','C003']);
const r2=route('R002',['D004','A001']);
const trace={uid:'T001',source_scope:scope,type:'space_trace',anchor_list:['R001','R002']};
const records=[a,b,missing,d,r1,r2,trace];
const ofType=(geo,type)=>geo.features.filter(x=>x.geometry.type===type);

test('points alone never imply a line or an arbitrary land polygon',()=>{
  const geo=spaceGraphGeojson(['A001','B002'],records,{scopeId:scope});
  assert.equal(ofType(geo,'Point').length,2);
  assert.equal(ofType(geo,'LineString').length,0);
  assert.equal(ofType(geo,'Polygon').length,0);
});
test('one saved route retains stops, but no segment to unknown GPS',()=>{
  const geo=spaceGraphGeojson(r1,records);
  assert.deepEqual(ofType(geo,'Point').map(p=>p.properties.order),[1,2]);
  assert.deepEqual(ofType(geo,'LineString').map(f=>f.properties.route_id),['R001']);
});
test('trace preserves multiple separate routes without bridging route boundaries',()=>{
  const geo=spaceGraphGeojson(trace,records);
  assert.equal(ofType(geo,'LineString').length,2);
  assert.deepEqual(ofType(geo,'LineString').map(f=>f.properties.route_id),['R001','R002']);
  assert.equal(ofType(geo,'Polygon').length,0);
});
test('source Scope boundaries prevent another owner from supplying missing stops',()=>{
  const imposter=place('C003',[118,20]);imposter.source_scope='lrunes';
  const geo=spaceGraphGeojson(r1,[...records,imposter]);
  assert.equal(ofType(geo,'LineString').length,1);
  assert.deepEqual(ofType(geo,'Point').map(f=>f.properties.uid),['A001','B002']);
});
test('empty and legacy route inputs have safe behavior',()=>{
  assert.deepEqual(spaceGraphGeojson(null,records).features,[]);
  const legacy={uid:'L001',source_scope:scope,trace_type:'map',anchor_uids:['A001','B002']};
  assert.equal(ofType(spaceGraphGeojson(legacy,records),'LineString').length,1);
});
