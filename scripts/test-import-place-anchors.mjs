import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareImportPlaceAnchors,importedPlaceId} from '../app/loc/import-place-anchors.mjs';

const loc=(name,lat,lng)=>({
  location:name,
  __importCoordinates:lat==null?null:{latitude:lat,longitude:lng}
});
function fakeTrace(initial=[]){
  const rows=[...initial];let seq=1,reads=0,writes=0;
  const relation=name=>{
    assert.equal(name,'silver.lo3rwang_trace');
    return {
      select(cols){
        assert.equal(cols,'uid,title,address');
        return {eq(){return {order(){return {async range(start,end){
          reads++;return {data:rows.slice(start,end+1),error:null};
        }};}};}};
      },
      insert(batch){
        writes++;assert.ok(batch.length<=80);
        assert.ok(batch.every(row=>row.trace_type==='space_anchor'&&row.address?.length===2&&row.hidden_depth===-1));
        const created=batch.map(row=>({uid:String(seq++).padStart(4,'0'),...row}));
        rows.push(...created);
        return {async select(cols){
          assert.equal(cols,'uid,address');
          return {data:created.map(({uid,address})=>({uid,address})),error:null};
        }};
      }
    };
  };
  return {relation,rows,get reads(){return reads;},get writes(){return writes;}};
}

test('same coordinates reuse existing anchor UID regardless of imported location name',async()=>{
  const db=fakeTrace([{uid:'AB12',title:'臺北車站',address:[121.517081,25.047924]}]);
  const record=loc('我家',25.047924,121.517081);
  const result=await prepareImportPlaceAnchors([record],{scopeId:'lo3rwang',relation:db.relation});
  assert.equal(result.reused,1);
  assert.equal(result.created,0);
  assert.equal(db.writes,0);
  assert.equal(importedPlaceId({incoming:record,byCoordinate:result.byCoordinate}),'AB12');
});

test('same location name with different coordinates creates another anchor',async()=>{
  const db=fakeTrace([{uid:'AB12',title:'商店',address:[121.5,25.04]}]);
  const record=loc('商店',25.05,121.6);
  const result=await prepareImportPlaceAnchors([record],{scopeId:'lo3rwang',relation:db.relation});
  assert.equal(result.created,1);
  assert.deepEqual(db.rows[1].address,[121.6,25.05]);
  assert.equal(db.rows[1].title,'商店');
  assert.equal(importedPlaceId({incoming:record,existing:{place_id:'AB12'},byCoordinate:result.byCoordinate}),'0001');
});

test('two different names at identical coordinates share exactly one anchor',async()=>{
  const db=fakeTrace();
  const a=loc('商店甲',25.05,121.6),b=loc('商店乙',25.05,121.6);
  const result=await prepareImportPlaceAnchors([a,b],{scopeId:'lo3rwang',relation:db.relation});
  assert.equal(result.created,1);
  assert.equal(db.rows.length,1);
  assert.equal(importedPlaceId({incoming:a,byCoordinate:result.byCoordinate}),
    importedPlaceId({incoming:b,byCoordinate:result.byCoordinate}));
});

test('no GPS means no anchor insert, name matching, or place_id assignment',async()=>{
  const fail=()=>{throw Error('Trace table must not be queried without coordinates');};
  const record=loc('商店');
  const result=await prepareImportPlaceAnchors([record],{scopeId:'lo3rwang',relation:fail});
  assert.equal(result.created,0);
  assert.equal(result.skipped,1);
  assert.equal(importedPlaceId({incoming:record,byCoordinate:result.byCoordinate}),null);
});

test('already correct article place_id is not updated',async()=>{
  const db=fakeTrace([{uid:'AB12',title:'商店',address:[121.5,25.04]}]);
  const record=loc('商店',25.04,121.5);
  const result=await prepareImportPlaceAnchors([record],{scopeId:'lo3rwang',relation:db.relation});
  assert.equal(importedPlaceId({incoming:record,existing:{place_id:'AB12'},byCoordinate:result.byCoordinate}),null);
});

test('local import and absent Trace table leave article import unblocked',async()=>{
  const fail=()=>{throw Error('No database call expected');};
  const local=await prepareImportPlaceAnchors([loc('我家',25,121)],{scopeId:'local',relation:fail});
  assert.equal(local.created,0);
  const relation=()=>({select:()=>({eq:()=>({order:()=>({range:async()=>({
    data:null,error:{code:'42P01',message:'missing'}
  })})})})});
  const missing=await prepareImportPlaceAnchors([loc('我家',25,121)],{
    scopeId:'lo3rwang',relation,allowMissing:true
  });
  assert.equal(missing.skipped,1);
});

test('anchor import reports real scan and insertion progress',async()=>{
  const db=fakeTrace();
  const states=[];
  await prepareImportPlaceAnchors([loc('商店甲',25.05,121.6)],{
    scopeId:'lo3rwang',relation:db.relation,onProgress:state=>states.push(state)
  });
  assert.deepEqual(states.map(p=>[p.phase,p.completed,p.total]),[
    ['讀取現有空間定錨',0,0],
    ['讀取現有空間定錨',0,0],
    ['新增空間定錨',0,1],
    ['新增空間定錨',1,1]
  ]);
});
