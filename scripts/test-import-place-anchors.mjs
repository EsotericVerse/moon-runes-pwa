import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareImportPlaceAnchors,importedPlaceId,importPlaceKey} from '../app/loc/import-place-anchors.mjs';

function fakeTrace(initial=[]){
  const rows=[...initial];let seq=1,reads=0,writes=0;
  const relation=name=>{
    assert.equal(name,'silver.lo3rwang_trace');
    return {
      select(){
        return {eq(_column,type){
          assert.equal(type,'space_anchor');
          return {order(){return {async range(start,end){
            reads++;
            return {data:rows.slice(start,end+1),error:null};
          }};}};
        }};
      },
      insert(batch){
        writes++;
        assert.ok(batch.length<=80);
        assert.ok(batch.every(row=>row.trace_type==='space_anchor'&&row.address===null&&row.hidden_depth===-1));
        const created=batch.map(row=>({uid:String(seq++).padStart(4,'0'),...row}));
        rows.push(...created);
        return {async select(){return {data:created.map(({uid,title})=>({uid,title})),error:null};}};
      }
    };
  };
  return {relation,rows,get reads(){return reads;},get writes(){return writes;}};
}

test('normal import creates no-coordinate anchors in bulk and gives articles place IDs',async()=>{
  const db=fakeTrace();
  const imported=[{location:'台北車站',createtime:null},{location:'台北車站'},
    {location:'高雄車站'},{location:null}];
  const result=await prepareImportPlaceAnchors(imported,{scopeId:'lo3rwang',relation:db.relation});
  assert.equal(result.created,2);
  assert.equal(db.writes,1);
  assert.equal(db.rows[0].address,null);
  assert.equal(importedPlaceId({incoming:imported[0],byName:result.byName}),'0001');
  assert.equal(importedPlaceId({incoming:imported[2],byName:result.byName}),'0002');
  assert.equal(importedPlaceId({incoming:imported[3],byName:result.byName}),null);
});

test('reimport reuses an existing matching Scope anchor without creating another',async()=>{
  const db=fakeTrace([{uid:'AB12',trace_type:'space_anchor',title:'台北車站'}]);
  const result=await prepareImportPlaceAnchors([{location:' 台北車站 '}],{
    scopeId:'lo3rwang',relation:db.relation});
  assert.equal(result.created,0);
  assert.equal(result.reused,1);
  assert.equal(result.byName.get(importPlaceKey('台北車站')),'AB12');
  assert.equal(db.writes,0);
});

test('ambiguous same-title anchors do not guess a place ID or make a third copy',async()=>{
  const db=fakeTrace([{uid:'AB12',title:'台北車站'}, {uid:'CD34',title:' 台北車站 '}]);
  const result=await prepareImportPlaceAnchors([{location:'台北車站'}],{
    scopeId:'lo3rwang',relation:db.relation});
  assert.equal(result.skipped,1);
  assert.equal(importedPlaceId({incoming:{location:'台北車站'},byName:result.byName}),null);
  assert.equal(db.writes,0);
});

test('existing article place_id and location remain authoritative',()=>{
  const lookup=new Map([[importPlaceKey('新地點'),'ZZ99'],[importPlaceKey('舊地點'),'ZZ98']]);
  assert.equal(importedPlaceId({incoming:{location:'新地點'},existing:{location:'舊地點',place_id:'AB12'},byName:lookup}),null);
  assert.equal(importedPlaceId({incoming:{location:'新地點'},existing:{location:'舊地點',place_id:null},byName:lookup}),'ZZ98');
});

test('missing location and local-only imports never need a Trace table',async()=>{
  const error=()=>{throw new Error('No database call expected')};
  const a=await prepareImportPlaceAnchors([{location:null}],{scopeId:'lo3rwang',relation:error});
  const b=await prepareImportPlaceAnchors([{location:'台北車站'}],{scopeId:'local',relation:error});
  assert.equal(a.created+b.created,0);
});

test('absent custom Trace table does not block the article import',async()=>{
  const relation=()=>({select:()=>({eq:()=>({order:()=>({range:async()=>({
    data:null,error:{code:'42P01',message:'relation missing'}})})})})});
  const result=await prepareImportPlaceAnchors([{location:'打卡'}],{
    scopeId:'lo3rwang',relation,allowMissing:true});
  assert.equal(result.skipped,1);
});
