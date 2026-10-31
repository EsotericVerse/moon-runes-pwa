import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDatabaseClient} from '../app/loc/db-contract.mjs';

function makeClient({failAt=0}={}){
  const calls=[];
  const whitelist=new Set(['uid','title','content','place_id','url','media_link']);
  let rpcCount=0;
  const rpc=async(name,args)=>{
    assert.equal(name,'management_write');
    calls.push(args);
    rpcCount++;
    if(failAt===rpcCount)return {error:{message:'mock database unavailable'}};
    if(args.p_operation==='update_batch'){
      assert.ok(args.p_rows.every(row=>Object.keys(row).every(key=>whitelist.has(key))));
      return {data:{count:args.p_rows.length},error:null};
    }
    if(args.p_operation==='update'){
      assert.deepEqual(args.p_filters.map(f=>[f.column,f.operator]),
        [['uid','eq']]);
      assert.equal(typeof args.p_filters[0].value,'string');
      assert.ok(!Object.hasOwn(args.p_values,'uid'));
      return {data:{count:1},error:null};
    }
    throw Error('unexpected operation '+args.p_operation);
  };
  const db=createDatabaseClient({
    publicClient:{schema:()=>({})},
    authClient:{schema:()=>({rpc})},
    auth:{getSession:async()=>({data:{session:null}}),
      getUser:async()=>({data:{user:null}}),
      signInWithOAuth:async()=>({error:null}),
      signOut:async()=>({error:null})}
  });
  return {db,calls};
}

test('reimport five times: old and supplemental columns never enter an invalid batch',async()=>{
  const {db,calls}=makeClient();
  const rows=[
    {uid:'AAA00001',content:'new body'},
    {uid:'BBB00002',site_id:'fb-1',location:'原始地點',title:'標題'},
    {uid:'CCC00003',ref_id:'AAA00001',source_id:'AAA00001',target_id:['AAA00001']}
  ];
  for(let i=0;i<5;i++)
    assert.equal((await db.updateImportRows('silver.lo3rwang_galaxy',rows)).count,3);
  assert.equal(calls.length,15);
  assert.deepEqual(calls.slice(0,3).map(call=>call.p_operation),
    ['update_batch','update','update']);
  assert.deepEqual(calls[1].p_values,
    {site_id:'fb-1',location:'原始地點',title:'標題'});
  assert.deepEqual(calls[2].p_values,
    {ref_id:'AAA00001',source_id:'AAA00001',target_id:['AAA00001']});
});

test('regular article updates remain one batch',async()=>{
  const {db,calls}=makeClient();
  const result=await db.updateImportRows('silver.lo3rwang_galaxy',[
    {uid:'AAA00001',title:'new title'},
    {uid:'BBB00002',place_id:'AB12'},
    {uid:'CCC00003',media_link:['M0000001']}
  ]);
  assert.equal(result.count,3);
  assert.equal(calls.length,1);
  assert.equal(calls[0].p_operation,'update_batch');
});

test('unknown columns and duplicate UIDs fail before any write',async()=>{
  const {db,calls}=makeClient();
  await assert.rejects(()=>db.updateImportRows('silver.lo3rwang_galaxy',[
    {uid:'AAA00001',site_id:'fb-1'},
    {uid:'AAA00001',title:'duplicate'}
  ]),/無效文章更新資料/);
  await assert.rejects(()=>db.updateImportRows('silver.lo3rwang_galaxy',[
    {uid:'AAA00001',arbitrary_new_column:'not permitted'}
  ]),/無效文章更新資料/);
  await assert.rejects(()=>db.updateImportRows('silver.loc',[
    {uid:'AAA00001',title:'unauthorized target'}
  ]),/文章批次更新資料表無效/);
  assert.equal(calls.length,0);
});

test('RPC errors report the original failure and possible partial writes',async()=>{
  const {db,calls}=makeClient({failAt:2});
  await assert.rejects(()=>db.updateImportRows('silver.lo3rwang_galaxy',[
    {uid:'AAA00001',title:'first batch'},
    {uid:'BBB00002',site_id:'fb-2'}
  ]),error=>{
    assert.match(error.message,/已確認成功 1 筆/);
    assert.match(error.message,/mock database unavailable/);
    assert.match(error.message,/部分寫入/);
    return true;
  });
  assert.equal(calls.length,2);
});

test('import UI reports failure stage instead of claiming everything was unsaved',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/lastImportStage=stage/);
  assert.match(panel,/之前成功的批次可能已寫入/);
  assert.match(panel,/writeBatch:batch=>insertImportRows\(galaxyMedia,batch\)/);
});
