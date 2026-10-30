import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractImportCreatedAt} from '../app/loc/import-batch.mjs';
import {dedupeIncomingImport,matchExistingImportByCreatedAt,insertImportBatches} from '../app/loc/import-duplicate-check.mjs';

test('Threads source timestamps are extracted from root and nested media',()=>{
  assert.equal(extractImportCreatedAt({createAt:'2024-08-01T00:00:00Z'}),'2024-08-01T00:00:00.000Z');
  assert.equal(extractImportCreatedAt({media:[{creation_timestamp:1722470400}]}),'2024-08-01T00:00:00.000Z');
  assert.equal(extractImportCreatedAt({text:'missing date'}),null);
});
test('createdAt matches an existing record even with different UID and revised text',async()=>{
  const rows=[{uid:'NEWuid01',site:'Threads',createtime:'2024-08-01T00:00:00Z',content:'updated'}];
  const matched=await matchExistingImportByCreatedAt(rows,{readTimestamps:async()=>[
    {uid:'OLDuid01',site:'Threads',createtime:'2024-08-01T00:00:00Z',content:'original'}]});
  assert.equal(matched.get('NEWuid01').uid,'OLDuid01');
});
test('missing original timestamps do not perform date lookups or collapse records',async()=>{
  const rows=[{uid:'Aa000001',site:'Threads',createtime:null,content:'a'},
    {uid:'Aa000002',site:'Threads',createtime:null,content:'b'}];
  assert.equal(dedupeIncomingImport(rows).unique.length,2);
  const matches=await matchExistingImportByCreatedAt(rows,{readTimestamps:()=>{throw Error('must not query');}});
  assert.equal(matches.size,0);
});
test('ambiguous same-time candidates are resolved only by matching content',async()=>{
  const input=[{uid:'NEWuid01',site:'Threads',createtime:'2024-08-01T00:00:00Z',content:'changed'}];
  const old=[
    {uid:'OLDuid01',site:'Threads',createtime:'2024-08-01T00:00:00Z',content:'first'},
    {uid:'OLDuid02',site:'Threads',createtime:'2024-08-01T00:00:00Z',content:'second'}
  ];
  assert.equal((await matchExistingImportByCreatedAt(input,{readTimestamps:async()=>old})).size,0);
  const matched=await matchExistingImportByCreatedAt([{...input[0],content:'second'}],{readTimestamps:async()=>old});
  assert.equal(matched.get('NEWuid01').uid,'OLDuid02');
});
test('primary-key conflicts do not abort subsequent imported posts',async()=>{
  const inserted=[];
  const result=await insertImportBatches([{uid:'AAA00001'},{uid:'AAA00002'},{uid:'AAA00003'}],{
    writeBatch:async rows=>{
      if(rows.some(row=>row.uid==='AAA00002'))
        throw Error('duplicate key value violates unique constraint "galaxy_pkey"');
      inserted.push(...rows);return {count:rows.length};
    }
  });
  assert.deepEqual(inserted.map(r=>r.uid),['AAA00001','AAA00003']);
  assert.equal(result.conflicts,1);
  assert.equal(result.inserted,2);
});

test('site never participates in original timestamp identity',async()=>{
  const incoming=[{uid:'NEW00001',site:'Threads',createtime:'2024-08-01T00:00:00.123Z',content:'updated'}];
  const saved=[{uid:'OLD00001',site:'Facebook',createtime:'2024-08-01T00:00:00.123+00:00',content:'old'}];
  const matched=await matchExistingImportByCreatedAt(incoming,{
    readTimestamps:async timestamps=>{
      assert.deepEqual(timestamps,['2024-08-01T00:00:00.123Z']);
      return saved;
    }
  });
  assert.equal(matched.get('NEW00001')?.uid,'OLD00001');
});
test('a different second is never matched as duplicate',async()=>{
  const incoming=[{uid:'NEW00001',createtime:'2024-08-01T00:00:00.123Z',content:'body'}];
  const matched=await matchExistingImportByCreatedAt(incoming,{
    readTimestamps:async()=>[{uid:'OLD00001',createtime:'2024-08-01T00:00:01.123Z',content:'body'}]
  });
  assert.equal(matched.size,0);
});
test('multiple candidates with identical time do not overwrite unrelated articles',async()=>{
  const incoming=[{uid:'NEW00001',createtime:'2024-08-01T00:00:00.123Z',content:'new text'}];
  const old=[{uid:'OLD00001',createtime:'2024-08-01T00:00:00.123Z',content:'old 1'},
    {uid:'OLD00002',createtime:'2024-08-01T00:00:00.123Z',content:'old 2'}];
  assert.equal((await matchExistingImportByCreatedAt(incoming,{readTimestamps:async()=>old})).size,0);
});
test('normal import update preserves populated site/location and backfills blank fields',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/if\(record\.__importCoordinates&&!String\(existing\.location\|\|''\)\.trim\(\)&&String\(record\.location\|\|''\)\.trim\(\)\)/);
  assert.match(panel,/if\(!String\(existing\.site\|\|''\)\.trim\(\)&&String\(record\.site\|\|''\)\.trim\(\)\)/);
  assert.match(panel,/\.in\('createtime',batch\)/);
  assert.doesNotMatch(panel,/\.ilike\('site',source\)/);
  assert.doesNotMatch(panel,/\.or\(or\)/);
  assert.doesNotMatch(panel,/\.gte\('createtime'/);
  assert.doesNotMatch(panel,/\.lt\('createtime'/);
});

test('timestamp comparison reports progress before and after the direct query',async()=>{
  const rows=[0,1,2].map(i=>({
    uid:'EPOCH00'+i,
    createtime:new Date(Date.parse('2024-08-01T00:00:00.000Z')+i).toISOString(),
    content:'text'+i
  }));
  const steps=[];
  await matchExistingImportByCreatedAt(rows,{
    readTimestamps:async()=>[],
    onProgress:value=>steps.push(value)
  });
  assert.deepEqual(steps.map(step=>[step.completed,step.total]),[[0,3],[3,3]]);
});
test('import progress shows each phase and an indeterminate bar until measurable',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/showProgress\('準備匯入文章'\)/);
  assert.match(panel,/onProgress:p=>showProgress\('精確比對發文時間'/);
  assert.match(panel,/showProgress\('準備空間定錨'\)/);
  assert.match(panel,/showProgress\('更新既有文章'/);
  assert.match(panel,/showProgress\('新增文章'/);
  assert.match(panel,/showProgress\('整理媒體資料'\)/);
  assert.match(panel,/progress\.percent===null\?<progress max="100"/);
  assert.doesNotMatch(panel,/每 MaxRows/);
});
