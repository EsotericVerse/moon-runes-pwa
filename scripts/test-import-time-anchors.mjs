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
    {location:'台北車站',__importCheckin:true,createtime:'2024-02-01T08:00:00.000Z'},
    {location:'台北車站',createtime:'2024-02-01T20:00:00.000Z'},
    {__importPlaceName:'咖啡廳',__importVisitTimes:['2024-02-02T13:00:00.000Z','2024-02-03T00:00:00.000Z']},
    {__importPlaceName:'咖啡廳',__importVisitTimes:['2024-02-02T13:00:00.000Z']},
    {location:'深夜打卡',__importCheckin:true,createtime:'2024-02-03T20:30:00.000Z'},
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
    {location:'既有地點',__importCheckin:true,createtime:'2024-02-01T09:00:00.000Z'},
    {location:'新地點',__importCheckin:true,createtime:'2024-02-02T09:00:00.000Z'},
    {location:'另一個地點',__importCheckin:true,createtime:'2024-02-03T09:00:00.000Z'},
    {location:'同一天',__importCheckin:true,createtime:'2024-02-03T10:00:00.000Z'}
  ];
  const first=await prepareImportTimeAnchors(records,{scopeId:'lo3rwang',timeTable:'silver.lo3rwang_time',relation:db.relation});
  assert.equal(first.created,2);
  assert.equal(first.reused,1);
  assert.deepEqual(db.rows.slice(2).map(row=>[row.uid,row.address,row.type,row.invisible]),[
    ['0003','2024-02-02','anchor',false],
    ['0004','2024-02-03','anchor',false]
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
  assert.equal((await prepareImportTimeAnchors([{location:'X',__importCheckin:true,createtime:'2023-01-01'}],{
    scopeId:'local',relation:fail
  })).created,0);
});

test('standalone visit importer keeps original per-visit timestamps and writes Time dates',async()=>{
  const {readFileSync}=await import('node:fs');
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/__importVisitTimes:time\?\[/);
  assert.match(panel,/const dates=await prepareImportTimeAnchors\(candidates,/);
  assert.match(panel,/recordImportPlaceVisits\(visits,\{/);
  assert.match(panel,/prepareImportTimeAnchors\(\[\.\.\.anchorRecords,\.\.\.geoAnchorRecords\]/);
});

test('the physical Time relation is supplied by Scope registry and is never guessed',async()=>{
  const calls=[];
  const relation=table=>{
    calls.push(table);
    return {select:()=>({order:()=>({range:async()=>({data:[],error:null})})}),
      insert:rows=>({select:async()=>({data:rows.map(({uid,address})=>({uid,address})),error:null})})};
  };
  const inputs=[{location:'已打卡',__importCheckin:true,createtime:'2025-07-01T08:00:00Z'}];
  await prepareImportTimeAnchors(inputs,{
    scopeId:'lo3rwang',timeTable:'silver.lo3rwang_time_archive',relation
  });
  assert.deepEqual(calls,['silver.lo3rwang_time_archive','silver.lo3rwang_time_archive']);
  await assert.rejects(()=>prepareImportTimeAnchors(inputs,{
    scopeId:'lo3rwang',relation
  }),/尚未解析正確的 Scope Time 資料表/);
});


test('an article location is an import check-in; date wins over timestamp',()=>{
  assert.deepEqual(importCheckinDates([
    {location:'文章地點',date:'2024-04-05',createtime:'2024-04-01T10:00:00Z'},
    {location:'另一篇文章',__importCoordinates:{latitude:25,longitude:121},
      createtime:'2024-04-02T10:00:00Z'},
    {location:'明確打卡',__importCheckin:true,createtime:'2024-04-03T10:00:00Z'},
    {__importPlaceName:'獨立打卡',__importVisitTimes:['2024-04-04T12:00:00Z']}
  ]),['2024-04-02','2024-04-03','2024-04-04','2024-04-05']);
});

test('an existing period does not conceal a missing exact date anchor',async()=>{
  const db=memoryTime([
    {uid:'0001',type:'anchor',address:'2024-01-01',anchor_ids:[]},
    {uid:'0002',type:'anchor',address:'2024-01-31',anchor_ids:[]},
    {uid:'0003',type:'period',address:null,anchor_ids:['0001','0002']},
    {uid:'0004',type:'era',address:null,anchor_ids:['0003']}
  ]);
  const events=[
    {location:'期間內',__importCheckin:true,createtime:'2024-01-12T04:30:00Z'},
    {location:'端點日期',__importCheckin:true,createtime:'2024-01-31T04:30:00Z'},
    {location:'超出期間',__importCheckin:true,createtime:'2024-02-03T04:30:00Z'}
  ];
  const first=await prepareImportTimeAnchors(events,{
    scopeId:'lo3rwang',timeTable:'silver.lo3rwang_time',relation:db.relation
  });
  assert.equal(first.created,2);
  assert.equal(first.reused,1);
  assert.equal(db.rows.at(-1).address,'2024-02-03');
  const next=await prepareImportTimeAnchors(events,{
    scopeId:'lo3rwang',timeTable:'silver.lo3rwang_time',relation:db.relation
  });
  assert.equal(next.created,0);
  assert.equal(next.reused,3);
});
