import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const engine=readFileSync(new URL('../app/modular/features/trace/trace-map-engine.js',import.meta.url),'utf8')
  .replace(/^import .*?from 'maplibre-gl';\n/m,'')
  .replace(/setWorkerUrl\(new URL\([\s\S]*?\.toString\(\)\);/,'')
  .replace(/^export /gm,'');

function setup({anchors=[],onAnchorSelect=()=>{}}={}){
  const maps=[];
  class Bounds{
    constructor(){this.points=[];}
    extend(point){this.points.push(point);return this;}
  }
  class FakeMap {
    constructor(options){this.options=options;this.sources={};this.layers=[];
      this.callbacks={};this.bounds=[];this.fly=[];maps.push(this);}
    addControl(){}
    once(name,fn){this.callbacks[name]=fn;}
    on(name,layer,fn){if(typeof layer==='function'){fn=layer;layer='';}
      this.callbacks[name+'|'+layer]=fn;}
    addSource(id,value){this.sources[id]={...value,setData:data=>{this.sources[id].data=data;}};}
    addLayer(value){this.layers.push(value);}
    getSource(id){return this.sources[id];}
    getContainer(){return {clientWidth:1200};}
    getCanvas(){return {style:{cursor:''}};}
    fitBounds(bounds,options){this.bounds.push({points:bounds.points,options});}
    flyTo(options){this.fly.push(options);}
    resize(){}
    remove(){this.removed=true;}
  }
  class Noop{}
  const make=new Function('Map','Marker','Popup','NavigationControl','LngLatBounds','setWorkerUrl',
    engine+'\nreturn createTraceMap');
  const createTraceMap=make(FakeMap,Noop,Noop,Noop,Bounds,()=>{});
  const instance=createTraceMap({},{anchors,onAnchorSelect});
  const map=maps[0];
  map.callbacks.load();
  return {instance,map};
}
const anchors=[
  {uid:'AAAA0001',source_scope:'lo3rwang',trace_type:'anchor',title:'第一站',
    description:'歷史名稱：舊站名。',longitude:120.2,latitude:22.8},
  {uid:'BBBB0002',source_scope:'lo3rwang',trace_type:'anchor',title:'第二站',
    longitude:121.5,latitude:25.1},
  {uid:'CCCC0003',source_scope:'lo3rwang',trace_type:'anchor',title:'第三站',
    longitude:121.51,latitude:25.05}
];
test('saved route plots all numbered stops and preserves segment order',()=>{
  const {instance,map}=setup({anchors});
  instance.setSavedRoute({trace_type:'map',anchor_uids:anchors.map(a=>a.uid)});
  const features=map.sources['loc-trace-user-routes'].data.features;
  assert.deepEqual(features.filter(f=>f.geometry.type==='Point')
    .map(f=>f.properties.order),[1,2,3]);
  assert.equal(features.filter(f=>f.geometry.type==='LineString').length,2);
  assert.ok(map.bounds.some(call=>call.points.length===3));
  instance.destroy();
});
test('clearing route removes line and no saved anchors never shows sample markers',()=>{
  const {instance,map}=setup({anchors});
  instance.setSavedRoute({trace_type:'map',anchor_uids:anchors.map(a=>a.uid)});
  instance.setSavedRoute(null);
  assert.deepEqual(map.sources['loc-trace-user-routes'].data.features,[]);
  assert.equal(map.sources['loc-trace-extrusions'],undefined);
  instance.setAnchors([]);
  assert.deepEqual(map.sources['loc-trace-saved-anchors'].data.features,[]);
  instance.destroy();
});
test('pin clicks preserve full original record including historical place names',()=>{
  let selected=null;
  const {instance,map}=setup({anchors,onAnchorSelect:anchor=>{selected=anchor;}});
  map.callbacks['click|loc-trace-saved-point-layer']({
    features:[{properties:{uid:anchors[0].uid,source_scope:'lo3rwang'}}]});
  assert.equal(selected?.description,'歷史名稱：舊站名。');
  instance.destroy();
});
