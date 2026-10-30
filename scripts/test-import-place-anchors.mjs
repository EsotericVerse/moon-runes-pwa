import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareImportPlaceAnchors,importedPlaceId,recordImportPlaceVisits} from '../app/loc/import-place-anchors.mjs';

const named=(name,lat,lng)=>({__importPlaceName:name,__importCoordinates:{latitude:lat,longitude:lng}});
function memoryTrace(initial=[]){
  const rows=[...initial];let inserts=0;
  const relation=table=>{
    assert.equal(table,'silver.lo3rwang_trace');
    return {
      select:()=>({eq:()=>({order:()=>({range:async(start,end)=>({data:rows.slice(start,end+1),error:null})})})}),
      insert:batch=>({select:async()=>{
        inserts+=batch.length;
        const saved=batch.map((row,i)=>({...row,uid:'N'+String(rows.length+i+100)}));
        rows.push(...saved);
        return {data:saved.map(row=>({uid:row.uid,title:row.title,address:row.address})),error:null};
      }})
    };
  };
  return {relation,rows,get inserts(){return inserts;}};
}

test('the place name is the identity: an existing anchor with the same name is reused, coordinates ignored',async()=>{
  const db=memoryTrace([{uid:'AB12',title:'人工整理地點',address:[121.49086,25.05338]}]);
  const far=named('人工整理地點',25.9,121.9);
  const spaced=named('  人工整理地點 ',null,null);
  const otherNameSameCoords=named('其他名稱',25.05338,121.49086);
  const result=await prepareImportPlaceAnchors([far,spaced,otherNameSameCoords],{
    scopeId:'lo3rwang',relation:db.relation
  });
  assert.equal(result.reused,1);
  assert.equal(result.created,0);
  assert.equal(db.inserts,0);
  assert.equal(importedPlaceId({incoming:far,byName:result.byName}),'AB12');
  assert.equal(importedPlaceId({incoming:spaced,byName:result.byName}),'AB12');
  assert.equal(importedPlaceId({incoming:otherNameSameCoords,byName:result.byName}),null);
});

test('the article location text is the name when no source place name exists',async()=>{
  const db=memoryTrace([{uid:'AB12',title:'商店',address:[121.5,25.04]}]);
  const record={location:'商店'};
  const result=await prepareImportPlaceAnchors([record],{scopeId:'lo3rwang',relation:db.relation});
  assert.equal(importedPlaceId({incoming:record,byName:result.byName}),'AB12');
});

test('opt-in creation makes one hidden anchor per new name, with the first coordinates',async()=>{
  const db=memoryTrace([{uid:'AAAA',title:'台北車站',address:[121.5170,25.0478]}]);
  const station=named('台北車站',25.05,121.52);
  const cafeA=named(' 咖啡 店',25.1,121.6);
  const cafeB=named('咖啡 店',25.2,121.7);
  const nameOnly=named('只有名稱',null,null);
  const result=await prepareImportPlaceAnchors([station,cafeA,cafeB,nameOnly],{
    scopeId:'lo3rwang',relation:db.relation,createMissing:true
  });
  assert.equal(db.inserts,1);
  assert.equal(result.created,1);
  assert.equal(result.unmatchedCoordinates,1);
  const cafe=db.rows.at(-1);
  assert.equal(cafe.title,'咖啡 店');
  assert.deepEqual(cafe.address,[121.6,25.1]);
  assert.equal(cafe.hidden_depth,0);
  assert.equal(importedPlaceId({incoming:station,byName:result.byName}),'AAAA');
  const cafeUid=importedPlaceId({incoming:cafeA,byName:result.byName});
  assert.ok(cafeUid);
  assert.equal(importedPlaceId({incoming:cafeB,byName:result.byName}),cafeUid);
  assert.equal(importedPlaceId({incoming:nameOnly,byName:result.byName}),null);
  const again=await prepareImportPlaceAnchors([cafeA],{scopeId:'lo3rwang',relation:db.relation,createMissing:true});
  assert.equal(again.created,0);
  assert.equal(db.inserts,1);
});

test('a new name without coordinates is never created and never guessed',async()=>{
  const db=memoryTrace();
  const result=await prepareImportPlaceAnchors([named('新地點',null,null)],{
    scopeId:'lo3rwang',relation:db.relation,createMissing:true
  });
  assert.equal(result.created,0);
  assert.equal(db.inserts,0);
  assert.equal(result.unmatchedCoordinates,1);
});

test('an existing article place_id is never overwritten',async()=>{
  const db=memoryTrace([{uid:'AB12',title:'existing',address:[121.5,25.04]}]);
  const record=named('existing',25.04,121.5);
  const result=await prepareImportPlaceAnchors([record],{scopeId:'lo3rwang',relation:db.relation});
  assert.equal(importedPlaceId({incoming:record,existing:{place_id:'AB13'},byName:result.byName}),null);
  assert.equal(importedPlaceId({incoming:record,existing:{place_id:null},byName:result.byName}),'AB12');
});

test('local import and missing Trace table do not block article import',async()=>{
  const fail=()=>{throw Error('No database call expected');};
  const local=await prepareImportPlaceAnchors([named('地點',25,121)],{scopeId:'local',relation:fail});
  assert.equal(local.created,0);
  assert.equal(local.unmatchedCoordinates,1);
  const relation=()=>({select:()=>({eq:()=>({order:()=>({range:async()=>({
    data:null,error:{code:'42P01',message:'missing'}
  })})})})});
  const missing=await prepareImportPlaceAnchors([named('地點',25,121)],{
    scopeId:'lo3rwang',relation,allowMissing:true
  });
  assert.equal(missing.skipped,1);
  assert.equal(missing.unmatchedCoordinates,1);
});

test('anchor import reports a read-only scan without inserting rows',async()=>{
  const db=memoryTrace();
  const states=[];
  await prepareImportPlaceAnchors([named('地點',25.05,121.6)],{
    scopeId:'lo3rwang',relation:db.relation,onProgress:state=>states.push(state)
  });
  assert.deepEqual(states.map(p=>[p.phase,p.completed,p.total]),[
    ['讀取現有空間定錨',0,0],
    ['讀取現有空間定錨',0,0]
  ]);
  assert.equal(db.inserts,0);
});

test('anchors are prepared for new articles only',async()=>{
  const {readFileSync}=await import('node:fs');
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/const needsAnchor=unique\.filter\(record=>!existingBySiteId\.has\(record\.uid\)\)/);
});

test('check-in times are merged into the anchor times array: sorted, no duplicates, no empty writes',async()=>{
  const updates=[];
  const relation=table=>({update:values=>({eq:(c1,v1)=>({eq:async(c2,v2)=>{
    updates.push({table,values,uid:v1,type:v2});return {error:null};
  }})})});
  const timesByUid=new Map([['AB12',['2024-07-02T00:00:00.000Z']],['CD34',[]]]);
  const first=await recordImportPlaceVisits([
    {uid:'AB12',time:'2024-07-03T00:00:00Z'},
    {uid:'AB12',time:'2024-07-01T00:00:00Z'},
    {uid:'AB12',time:'2024-07-02T00:00:00Z'},
    {uid:'AB12',time:'2024-07-03T00:00:00.000Z'},
    {uid:'CD34',time:'2024-08-01T00:00:00Z'},
    {uid:'BAD',time:'2024-08-01T00:00:00Z'},
    {uid:'CD34',time:'not a date'}
  ],{relation,table:'silver.lo3rwang_trace',timesByUid});
  assert.deepEqual(first,{updated:2,added:3});
  assert.deepEqual(updates[0].values.times,[
    '2024-07-01T00:00:00.000Z','2024-07-02T00:00:00.000Z','2024-07-03T00:00:00.000Z']);
  assert.deepEqual(updates[1].values.times,['2024-08-01T00:00:00.000Z']);
  assert.equal(updates[0].type,'space_anchor');
  const again=await recordImportPlaceVisits([{uid:'AB12',time:'2024-07-01T00:00:00Z'}],
    {relation,table:'silver.lo3rwang_trace',timesByUid});
  assert.deepEqual(again,{updated:0,added:0});
  assert.equal(updates.length,2);
  await assert.rejects(()=>recordImportPlaceVisits([{uid:'AB12',time:'2025-01-01T00:00:00Z'}],{
    relation:()=>({update:()=>({eq:()=>({eq:async()=>({error:{message:'denied'}})})})}),
    table:'silver.lo3rwang_trace',timesByUid
  }),/寫入定錨打卡時間失敗/);
});

test('the panel writes check-in times only for articles that were really inserted',async()=>{
  const {readFileSync}=await import('node:fs');
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/placeVisits\.filter\(visit=>result\.insertedUids\.has\(visit\.articleUid\)\)/);
  assert.match(panel,/recordImportPlaceVisits\(savedVisits,\{/);
  assert.ok(panel.indexOf('recordImportPlaceVisits(savedVisits')>panel.indexOf('await flushNewArticles();\n      const savedVisits'));
});
