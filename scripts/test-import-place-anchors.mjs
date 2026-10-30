import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareImportPlaceAnchors,importedPlaceId} from '../app/loc/import-place-anchors.mjs';
import {importGeoKey} from '../app/loc/import-geocoordinates.mjs';

const loc=(name,lat,lng)=>({
  location:name,
  __importCoordinates:lat==null?null:{latitude:lat,longitude:lng}
});
function fakeTrace(initial=[]){
  const rows=[...initial];let reads=0,writes=0;
  const relation=name=>{
    assert.equal(name,'silver.lo3rwang_trace');
    return {
      select(cols){
        assert.equal(cols,'uid,title,address');
        return {eq(){return {order(){return {async range(start,end){
          reads++;return {data:rows.slice(start,end+1),error:null};
        }};}};}};
      },
      insert(){
        writes++;
        throw Error('Import must never create Trace anchors without manual curation');
      }
    };
  };
  return {relation,rows,get reads(){return reads;},get writes(){return writes;}};
}

test('opt-in restoration creates one anchor per exact source coordinate, never from LOC location',async()=>{
 const rows=[];let inserts=0;
 const relation=table=>{
   assert.equal(table,'silver.lo3rwang_trace');
   return {
     select:()=>({eq:()=>({order:()=>({range:async(start,end)=>({
       data:rows.slice(start,end+1),error:null
     })})})}),
     insert:batch=>({select:async()=>{
       inserts+=batch.length;
       const saved=batch.map((row,i)=>({...row,uid:'AB'+String(i+12)}));
       rows.push(...saved);
       return {data:saved.map(row=>({uid:row.uid,address:row.address})),error:null};
     }})
   };
 };
 const first={location:'LOC 自訂名稱',__importPlaceName:'Facebook 原始地點',
   __importPlaceAddress:'原始地址',__importCoordinates:{latitude:25.05338,longitude:121.49086}};
 const duplicate={...first,__importPlaceName:'另一個名稱'};
 const unnamed={location:'LOC 使用者自行填寫',__importCoordinates:{latitude:25.05339,longitude:121.49086}};
 const created=await prepareImportPlaceAnchors([first,duplicate,unnamed],{
   scopeId:'lo3rwang',relation,createMissing:true
 });
 assert.equal(created.created,1);
 assert.equal(created.unmatchedCoordinates,1);
 assert.equal(inserts,1);
 assert.equal(rows[0].title,'Facebook 原始地點');
 assert.deepEqual(rows[0].address,[121.49086,25.05338]);
 assert.equal(rows[0].description.address,'原始地址');
 assert.equal(rows[0].hidden_depth,0,'new Facebook anchors stay hidden until reviewed');
 assert.equal(importedPlaceId({incoming:first,byCoordinate:created.byCoordinate}),'AB12');
 assert.equal(importedPlaceId({incoming:unnamed,byCoordinate:created.byCoordinate}),null);
 const repeated=await prepareImportPlaceAnchors([first],{
   scopeId:'lo3rwang',relation,createMissing:true
 });
 assert.equal(repeated.created,0);
 assert.equal(repeated.reused,1);
 assert.equal(inserts,1);
});

test('same exact coordinates reuse an existing Trace anchor without a location name',async()=>{
  const db=fakeTrace([{uid:'AB12',title:'人工整理地點',address:[121.49086,25.05338]}]);
  const named=loc('其他名稱',25.05338,121.49086);
  const unnamed=loc(null,25.05338,121.49086);
  const result=await prepareImportPlaceAnchors([named,unnamed],{
    scopeId:'lo3rwang',relation:db.relation
  });
  assert.equal(result.reused,1);
  assert.equal(result.created,0);
  assert.equal(result.unmatchedCoordinates,0);
  assert.equal(db.writes,0);
  assert.equal(importedPlaceId({incoming:named,byCoordinate:result.byCoordinate}),'AB12');
  assert.equal(importedPlaceId({incoming:unnamed,byCoordinate:result.byCoordinate}),'AB12');
  assert.equal(importGeoKey(named.__importCoordinates),'[121.49086,25.05338]');
});

test('a different coordinate pair never matches the same name or creates an anchor',async()=>{
  const db=fakeTrace([{uid:'AB12',title:'商店',address:[121.5,25.04]}]);
  const record=loc('商店',25.05,121.6);
  const result=await prepareImportPlaceAnchors([record],{scopeId:'lo3rwang',relation:db.relation});
  assert.equal(result.created,0);
  assert.equal(result.reused,0);
  assert.equal(result.unmatchedCoordinates,1);
  assert.equal(result.skipped,1);
  assert.equal(db.writes,0);
  assert.equal(importedPlaceId({incoming:record,byCoordinate:result.byCoordinate}),null);
});

test('duplicate new coordinate pairs are counted once for manual curation',async()=>{
  const db=fakeTrace();
  const a=loc(null,25.05,121.6),b=loc('另一個地名',25.05,121.6);
  const result=await prepareImportPlaceAnchors([a,b],{scopeId:'lo3rwang',relation:db.relation});
  assert.equal(result.unmatchedCoordinates,1);
  assert.equal(result.created,0);
  assert.equal(db.writes,0);
});

test('a matching name without source coordinates never guesses a place ID',async()=>{
  const db=fakeTrace([{uid:'AB12',title:'商店',address:[121.5,25.04]}]);
  const record=loc('商店');
  const result=await prepareImportPlaceAnchors([record],{scopeId:'lo3rwang',relation:db.relation});
  assert.equal(result.created,0);
  assert.equal(result.skipped,1);
  assert.equal(importedPlaceId({incoming:record,byCoordinate:result.byCoordinate,byName:result.byName}),null);
});

test('invalid coordinates do not create or match an anchor',async()=>{
  const db=fakeTrace([{uid:'AB12',title:'商店',address:[121.5,25.04]}]);
  const record=loc('商店',95,121.5);
  const result=await prepareImportPlaceAnchors([record],{scopeId:'lo3rwang',relation:db.relation});
  assert.equal(result.skipped,1);
  assert.equal(result.reused,0);
  assert.equal(db.reads,0);
});

test('an existing article place_id is never overwritten by imported coordinates',async()=>{
  const db=fakeTrace([{uid:'AB12',title:'existing',address:[121.5,25.04]}]);
  const record=loc(null,25.04,121.5);
  const result=await prepareImportPlaceAnchors([record],{scopeId:'lo3rwang',relation:db.relation});
  assert.equal(importedPlaceId({incoming:record,existing:{place_id:'AB13'},byCoordinate:result.byCoordinate}),null);
  assert.equal(importedPlaceId({incoming:record,existing:{place_id:null},byCoordinate:result.byCoordinate}),'AB12');
});

test('local import and missing Trace table do not block article import',async()=>{
  const fail=()=>{throw Error('No database call expected');};
  const local=await prepareImportPlaceAnchors([loc(null,25,121)],{scopeId:'local',relation:fail});
  assert.equal(local.created,0);
  assert.equal(local.unmatchedCoordinates,1);
  const relation=()=>({select:()=>({eq:()=>({order:()=>({range:async()=>({
    data:null,error:{code:'42P01',message:'missing'}
  })})})})});
  const missing=await prepareImportPlaceAnchors([loc(null,25,121)],{
    scopeId:'lo3rwang',relation,allowMissing:true
  });
  assert.equal(missing.skipped,1);
  assert.equal(missing.unmatchedCoordinates,1);
});

test('anchor import reports a read-only scan without inserting rows',async()=>{
  const db=fakeTrace();
  const states=[];
  await prepareImportPlaceAnchors([loc(null,25.05,121.6)],{
    scopeId:'lo3rwang',relation:db.relation,onProgress:state=>states.push(state)
  });
  assert.deepEqual(states.map(p=>[p.phase,p.completed,p.total]),[
    ['讀取現有空間定錨',0,0],
    ['讀取現有空間定錨',0,0]
  ]);
  assert.equal(db.writes,0);
});
test('anchors are prepared for new articles only and identity is the exact coordinate pair',async()=>{
  const {readFileSync}=await import('node:fs');
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/const needsAnchor=unique\.filter\(record=>!existingBySiteId\.has\(record\.uid\)\)/);
  const {importGeoKey}=await import('../app/loc/import-geocoordinates.mjs');
  assert.equal(importGeoKey({latitude:25.05338,longitude:121.49086}),
    importGeoKey({latitude:'25.05338',longitude:'121.490860'}));
  assert.notEqual(importGeoKey({latitude:25.05338,longitude:121.49086}),
    importGeoKey({latitude:25.05339,longitude:121.49086}));
});
const named=(name,lat,lng)=>({__importPlaceName:name,__importCoordinates:{latitude:lat,longitude:lng}});
test('same place name reuses an existing anchor and one new anchor serves every same-name coordinate',async()=>{
  const rows=[{uid:'AAAA',title:'台北車站',address:[121.5170,25.0478]}];
  let inserted=[];
  const relation=()=>({
    select:()=>({eq:()=>({order:()=>({range:async(s,e)=>({data:rows.slice(s,e+1),error:null})})})}),
    insert:batch=>({select:async()=>{
      inserted=batch;
      return {data:batch.map((row,i)=>({uid:'NEW'+i+'X'.repeat(0),address:row.address})),error:null};
    }})
  });
  const result=await prepareImportPlaceAnchors([
    named('台北車站',25.0500,121.5200),
    named(' 咖啡 店',25.1,121.6),
    named('咖啡 店',25.2,121.7)
  ],{scopeId:'lo3rwang',relation,createMissing:true});
  assert.equal(result.byCoordinate.get(importGeoKey({latitude:25.05,longitude:121.52})),'AAAA');
  assert.equal(inserted.length,1);
  const first=result.byCoordinate.get(importGeoKey({latitude:25.1,longitude:121.6}));
  assert.ok(first);
  assert.equal(result.byCoordinate.get(importGeoKey({latitude:25.2,longitude:121.7})),first);
});
