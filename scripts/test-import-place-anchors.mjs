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

test('Trace reuses exact coordinates even with different names; distant same names remain distinct',async()=>{
  const db=memoryTrace([{uid:'AB12',title:'人工整理地點',address:[121.49086,25.05338]}]);
  const far=named('人工整理地點',25.9,121.9);
  const spaced=named('  人工整理地點 ',null,null);
  const otherNameSameCoords=named('其他名稱',25.05338,121.49086);
  const result=await prepareImportPlaceAnchors([far,spaced,otherNameSameCoords],{
    scopeId:'lo3rwang',relation:db.relation,createMissing:false
  });
  assert.equal(result.reused,2);
  assert.equal(result.created,0);
  assert.equal(db.inserts,0);
  assert.equal(importedPlaceId({incoming:far,byName:result.byName,byCoordinate:result.byCoordinate}),null);
  assert.equal(importedPlaceId({incoming:spaced,byName:result.byName}),'AB12');
  assert.equal(importedPlaceId({incoming:otherNameSameCoords,byName:result.byName,byCoordinate:result.byCoordinate}),'AB12');
});

test('different source names with the identical GPS pair share one new Trace anchor',async()=>{
  const db=memoryTrace();
  const a=named('舊地名',25.02,121.55),b=named('新地名',25.02,121.55);
  const result=await prepareImportPlaceAnchors([a,b],{
    scopeId:'lo3rwang',relation:db.relation,createMissing:true
  });
  assert.equal(result.created,1);
  assert.equal(db.inserts,1);
  assert.equal(importedPlaceId({incoming:a,byName:result.byName,byCoordinate:result.byCoordinate}),
    importedPlaceId({incoming:b,byName:result.byName,byCoordinate:result.byCoordinate}));
});

test('the article location text is the name when no source place name exists',async()=>{
  const db=memoryTrace([{uid:'AB12',title:'商店',address:[121.5,25.04]}]);
  const record={location:'商店'};
  const result=await prepareImportPlaceAnchors([record],{scopeId:'lo3rwang',relation:db.relation});
  assert.equal(importedPlaceId({incoming:record,byName:result.byName}),'AB12');
});

test('new distinct named coordinates create separate Trace anchors without losing GPS',async()=>{
  const db=memoryTrace([{uid:'AAAA',title:'台北車站',address:[121.5170,25.0478]}]);
  const station=named('台北車站',25.05,121.52);
  const cafeA=named(' 咖啡 店',25.1,121.6);
  const cafeB=named('咖啡 店',25.2,121.7);
  const nameOnly=named('只有名稱',null,null);
  const result=await prepareImportPlaceAnchors([station,cafeA,cafeB,nameOnly],{
    scopeId:'lo3rwang',relation:db.relation,createMissing:true
  });
  assert.equal(db.inserts,4);
  assert.equal(result.created,4);
  assert.equal(result.unmatchedCoordinates,0);
  const cafes=db.rows.filter(row=>row.title==='咖啡 店');
  assert.equal(cafes.length,2);
  assert.deepEqual(cafes.map(row=>row.address),[[121.6,25.1],[121.7,25.2]]);
  assert.equal(cafes[0].invisible,false);
  const stationUid=importedPlaceId({incoming:station,byName:result.byName,byCoordinate:result.byCoordinate});
  assert.ok(stationUid&&stationUid!=='AAAA');
  const cafeUid=importedPlaceId({incoming:cafeA,byName:result.byName,byCoordinate:result.byCoordinate});
  assert.ok(cafeUid);
  const cafeOther=importedPlaceId({incoming:cafeB,byName:result.byName,byCoordinate:result.byCoordinate});
  assert.ok(cafeOther&&cafeOther!==cafeUid);
  assert.ok(importedPlaceId({incoming:nameOnly,byName:result.byName}));
  const again=await prepareImportPlaceAnchors([cafeA],{scopeId:'lo3rwang',relation:db.relation,createMissing:true});
  assert.equal(again.created,0);
  assert.equal(db.inserts,4);
});

test('reversed insert response still maps the correct Trace UID to each coordinate',async()=>{
  const db=memoryTrace();
  const relation=table=>{
    const api=db.relation(table);
    return {...api,insert:rows=>({select:async()=>{
      const result=await api.insert(rows).select('uid,title,address');
      return {...result,data:[...result.data].reverse()};
    }})};
  };
  const a=named('重名地點',25.1,121.1),b=named('重名地點',25.2,121.2);
  const resolved=await prepareImportPlaceAnchors([a,b],{
    scopeId:'lo3rwang',relation,createMissing:true
  });
  const uidA=importedPlaceId({incoming:a,byName:resolved.byName,byCoordinate:resolved.byCoordinate});
  const uidB=importedPlaceId({incoming:b,byName:resolved.byName,byCoordinate:resolved.byCoordinate});
  assert.equal(resolved.created,2);
  assert.ok(uidA&&uidB&&uidA!==uidB);
  assert.deepEqual(db.rows.find(x=>x.uid===uidA).address,[121.1,25.1]);
  assert.deepEqual(db.rows.find(x=>x.uid===uidB).address,[121.2,25.2]);
});

test('a new named place without coordinates is created with a null address',async()=>{
  const db=memoryTrace();
  const result=await prepareImportPlaceAnchors([named('新地點',null,null)],{
    scopeId:'lo3rwang',relation:db.relation,createMissing:true
  });
  assert.equal(result.created,1);
  assert.equal(db.inserts,1);
  assert.equal(result.unmatchedCoordinates,0);
  assert.equal(db.rows[0].address,null);
});

test('old control characters in location normalize only the Trace label, not Galaxy text',async()=>{
  const db=memoryTrace();
  const raw={location:'台北\u001F車站'};
  const result=await prepareImportPlaceAnchors([raw],{
    scopeId:'lo3rwang',relation:db.relation,createMissing:true
  });
  assert.equal(result.created,1);
  assert.equal(db.rows[0].title,'台北 車站');
  assert.equal(raw.location,'台北\u001F車站');
  assert.ok(importedPlaceId({incoming:raw,byName:result.byName}));
});

test('an existing article place_id is never overwritten',async()=>{
  const db=memoryTrace([{uid:'AB12',title:'existing',address:[121.5,25.04]}]);
  const record=named('existing',25.04,121.5);
  const result=await prepareImportPlaceAnchors([record],{scopeId:'lo3rwang',relation:db.relation});
  assert.equal(importedPlaceId({incoming:record,existing:{place_id:'AB13'},byName:result.byName}),null);
  assert.equal(importedPlaceId({incoming:record,existing:{place_id:null},byName:result.byName,byCoordinate:result.byCoordinate}),'AB12');
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
    scopeId:'lo3rwang',relation,allowMissing:true,createMissing:false
  });
  assert.equal(missing.skipped,1);
  assert.equal(missing.unmatchedCoordinates,1);
});

test('anchor import reports a read-only scan without inserting rows',async()=>{
  const db=memoryTrace();
  const states=[];
  await prepareImportPlaceAnchors([named('地點',25.05,121.6)],{
    scopeId:'lo3rwang',relation:db.relation,createMissing:false,onProgress:state=>states.push(state)
  });
  assert.deepEqual(states.map(p=>[p.phase,p.completed,p.total]),[
    ['讀取現有空間定錨',0,0],
    ['讀取現有空間定錨',0,0]
  ]);
  assert.equal(db.inserts,0);
});

test('reimports reconcile both existing and new article anchors',async()=>{
  const {readFileSync}=await import('node:fs');
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/prepareImportPlaceAnchors\(\[\.\.\.anchorRecords,\.\.\.geoAnchorRecords\]/);
  assert.match(panel,/if\(restoredPlace\)changes\.place_id=restoredPlace/);
  assert.match(panel,/prepareImportTimeAnchors\(\[\.\.\.anchorRecords,\.\.\.geoAnchorRecords\]/);
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

test('the panel records existing and imported check-in times without double-adding old articles',async()=>{
  const {readFileSync}=await import('node:fs');
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/\.\.\.placeVisits,/);
  assert.match(panel,/newArticleVisits\.filter\(visit=>result\.insertedUids\.has\(visit\.articleUid\)\)/);
  assert.match(panel,/recordImportPlaceVisits\(savedVisits,\{/);
  assert.ok(panel.indexOf('recordImportPlaceVisits(savedVisits')>panel.indexOf('await flushNewArticles();\n      const savedVisits'));
});

test('import progress touches the edit Session, so a long read-only comparison phase cannot idle-lock mid-import',async()=>{
  const {readFileSync}=await import('node:fs');
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/import \{touchEditorSession\} from '\.\/edit-session-ttl\.mjs';/);
  assert.match(panel,/if\(!nativeLocal\)try\{touchEditorSession\(window\.sessionStorage\);\}catch\{\}/);
  // The touch must live inside showProgress itself, not only at one call site,
  // since the comparison phase's only hook into run() is its onProgress callback.
  assert.ok(panel.indexOf('touchEditorSession(window.sessionStorage)')>panel.indexOf('const showProgress='));
  assert.ok(panel.indexOf('touchEditorSession(window.sessionStorage)')<panel.indexOf('setProgress({stage,completed,total,'));
});
