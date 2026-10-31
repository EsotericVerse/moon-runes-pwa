import test from 'node:test';
import assert from 'node:assert/strict';
import {importCheckinDates,prepareImportTimeAnchors} from '../app/loc/import-time-anchors.mjs';

function memoryTime(initial=[]){
  const rows=[...initial],calls=[];
  return {
    rows,calls,
    relation:table=>{
      assert.equal(table,'silver.lo3rwang_time');
      return {
        select:()=>({order:()=>({range:async(start,end)=>({
          data:rows.slice(start,end+1),error:null
        })})}),
        insert:batch=>({select:async()=>{
          calls.push(batch);
          rows.push(...batch);
          return {data:batch.map(({uid,address})=>({uid,address})),error:null};
        }})
      };
    }
  };
}
test('check-in dates are daily and deduplicated; missing names and dates are ignored',()=>{
  assert.deepEqual(importCheckinDates([
    {location:'台北車站',createtime:'2024-02-01T08:00:00.000Z'},
    {location:'台北車站',createtime:'2024-02-01T20:00:00.000Z'},
    {__importPlaceName:'咖啡廳',__importVisitTimes:['2024-02-02T13:00:00.000Z','2024-02-03T00:00:00.000Z']},
    {__importPlaceName:'咖啡廳',__importVisitTimes:['2024-02-02T13:00:00.000Z']},
    {location:'深夜打卡',createtime:'2024-02-03T20:30:00.000Z'},
    {location:'地名但沒有日期'},
    {createtime:'2024-02-04T00:00:00.000Z'}
  ]),['2024-02-01','2024-02-02','2024-02-03','2024-02-04']);
});

test('Time import reuses existing dates, respects all occupied UIDs, and is idempotent',async()=>{
  const db=memoryTime([
    {uid:'0001',type:'anchor',address:'2024-02-01'},
    {uid:'0002',type:'time_period',address:null}
  ]);
  const records=[
    {location:'既有地點',createtime:'2024-02-01T09:00:00.000Z'},
    {location:'新地點',createtime:'2024-02-02T09:00:00.000Z'},
    {location:'另一個地點',createtime:'2024-02-03T09:00:00.000Z'},
    {location:'同一天',createtime:'2024-02-03T10:00:00.000Z'}
  ];
  const first=await prepareImportTimeAnchors(records,{scopeId:'lo3rwang',timeTable:'silver.lo3rwang_time',relation:db.relation});
  assert.equal(first.created,2);
  assert.equal(first.reused,1);
  assert.deepEqual(db.rows.slice(2).map(row=>[row.uid,row.address,row.type,row.hidden_depth]),[
    ['0003','2024-02-02','anchor',0],
    ['0004','2024-02-03','anchor',0]
  ]);
  const again=await prepareImportTimeAnchors(records,{scopeId:'lo3rwang',timeTable:'silver.lo3rwang_time',relation:db.relation});
  assert.equal(again.created,0);
  assert.equal(again.reused,3);
  assert.equal(db.calls.length,1);
});

test('an empty or local date import never writes to remote relations',async()=>{
  const fail=()=>{throw Error('Should not query remote DB');};
  assert.equal((await prepareImportTimeAnchors([{location:'X'}],{
    scopeId:'lo3rwang',timeTable:'silver.lo3rwang_time',relation:fail
  })).created,0);
  assert.equal((await prepareImportTimeAnchors([{location:'X',createtime:'2023-01-01'}],{
    scopeId:'local',relation:fail
  })).created,0);
});

test('standalone visit importer keeps original per-visit timestamps and writes Time dates',async()=>{
  const {readFileSync}=await import('node:fs');
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/__importVisitTimes:time\?\[/);
  assert.match(panel,/const dates=await prepareImportTimeAnchors\(candidates,/);
  assert.match(panel,/recordImportPlaceVisits\(visits,\{/);
  assert.match(panel,/prepareImportTimeAnchors\(\[\.\.\.unique,\.\.\.geoAnchorRecords\]/);
});

test('the physical Time relation is supplied by Scope registry and is never guessed',async()=>{
  const calls=[];
  const relation=table=>{
    calls.push(table);
    return {select:()=>({order:()=>({range:async()=>({data:[],error:null})})}),
      insert:rows=>({select:async()=>({data:rows.map(({uid,address})=>({uid,address})),error:null})})};
  };
  const inputs=[{location:'已打卡',createtime:'2025-07-01T08:00:00Z'}];
  await prepareImportTimeAnchors(inputs,{
    scopeId:'lo3rwang',timeTable:'silver.lo3rwang_time_archive',relation
  });
  assert.deepEqual(calls,['silver.lo3rwang_time_archive','silver.lo3rwang_time_archive']);
  await assert.rejects(()=>prepareImportTimeAnchors(inputs,{
    scopeId:'lo3rwang',relation
  }),/尚未解析正確的 Scope Time 資料表/);
});
