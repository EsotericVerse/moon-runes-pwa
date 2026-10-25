import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyTraceAnchors,locatableTraceAnchor,TRACE_OTHER_REGION} from '../app/modular/features/trace/trace-spatial-classification.mjs';

const fakeCounty=(lng,lat)=>lng>121?'新北市':'高雄市';
const anchor=(uid,title,longitude,latitude)=>({uid,title,longitude,latitude,trace_type:'anchor',source_scope:'lo3rwang'});

test('spatial grouping is county → anchors and never displays an all-anchor list',()=>{
  const list=[anchor('AAAAAAAA','老家',120.3,22.6),anchor('BBBBBBBB','車站',121.5,25),
    anchor('CCCCCCCC','海外站點',-118.24,34.05)];
  const groups=classifyTraceAnchors(list,(lng,lat)=>lng<0?TRACE_OTHER_REGION:fakeCounty(lng,lat));
  assert.deepEqual([...groups.keys()],['新北市','高雄市',TRACE_OTHER_REGION]);
  assert.deepEqual(groups.get('新北市').map(x=>x.uid),['BBBBBBBB']);
  assert.deepEqual(groups.get('高雄市').map(x=>x.uid),['AAAAAAAA']);
  assert.deepEqual(groups.get(TRACE_OTHER_REGION).map(x=>x.uid),['CCCCCCCC']);
});

test('missing coordinates cannot be added as a saved map stop',()=>{
  const data=[anchor('AAAAAAAA','正常',121.5,25),anchor('BBBBBBBB','未定位',null,null),
    anchor('CCCCCCCC','無效',999,22),anchor('DDDDDDDD','空字串','',22),
    {trace_type:'map',uid:'EEEEEEEE',title:'別條路線',longitude:120,latitude:22}];
  const groups=classifyTraceAnchors(data,fakeCounty);
  assert.deepEqual([...groups.values()].flat().map(x=>x.uid),['AAAAAAAA']);
  assert.equal(locatableTraceAnchor(data[1]),false);
  assert.equal(locatableTraceAnchor(data[3]),false);
});

test('selecting the county/anchor only changes React selection, never the queue',()=>{
  const editor=readFileSync(new URL('../app/loc/TraceManagement.jsx',import.meta.url),'utf8');
  const map=editor.slice(editor.indexOf('function MapEditor('));
  assert.match(map,/onChange=\{event=>\{setCounty\(event\.target\.value\);setPointUid\(''\);\}\}/);
  assert.match(map,/onChange=\{event=>setPointUid\(event\.target\.value\)\}/);
  assert.match(map,/onClick=\{addToQueue\}>＋<\/button>/);
  const add=map.slice(map.indexOf('const addToQueue=()=>{'),map.indexOf('  const setAllExpanded=',map.indexOf('const addToQueue=()=>{')));
  assert.match(add,/setSelected\(ids=>\[\.\.\.ids,pointUid\]\)/);
  assert.doesNotMatch(add,/setSelected\(ids=>\[\.\.\.ids,pointUid,pointUid\]/);
  assert.match(map,/selected\.includes\(row\.uid\)/);
});
