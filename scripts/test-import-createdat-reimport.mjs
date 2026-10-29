import test from 'node:test';
import assert from 'node:assert/strict';
import {extractImportCreatedAt} from '../app/loc/import-batch.mjs';
import {dedupeIncomingImport,matchExistingImportByCreatedAt,insertImportBatches} from '../app/loc/import-duplicate-check.mjs';

test('Threads source timestamps are extracted from root and nested media',()=>{
  assert.equal(extractImportCreatedAt({createAt:'2024-08-01T00:00:00Z'}),'2024-08-01T00:00:00.000Z');
  assert.equal(extractImportCreatedAt({media:[{creation_timestamp:1722470400}]}),'2024-08-01T00:00:00.000Z');
  assert.equal(extractImportCreatedAt({text:'missing date'}),null);
});
test('createdAt matches an existing record even with different UID and revised text',async()=>{
  const rows=[{uid:'NEWuid01',site:'Threads',createtime:'2024-08-01T00:00:00Z',content:'updated'}];
  const matched=await matchExistingImportByCreatedAt(rows,{readSeconds:async()=>[
    {uid:'OLDuid01',site:'Threads',createtime:'2024-08-01T00:00:00Z',content:'original'}]});
  assert.equal(matched.get('NEWuid01').uid,'OLDuid01');
});
test('missing original timestamps do not perform date lookups or collapse records',async()=>{
  const rows=[{uid:'Aa000001',site:'Threads',createtime:null,content:'a'},
    {uid:'Aa000002',site:'Threads',createtime:null,content:'b'}];
  assert.equal(dedupeIncomingImport(rows).unique.length,2);
  const matches=await matchExistingImportByCreatedAt(rows,{readSeconds:()=>{throw Error('must not query');}});
  assert.equal(matches.size,0);
});
test('ambiguous same-time candidates are resolved only by matching content',async()=>{
  const input=[{uid:'NEWuid01',site:'Threads',createtime:'2024-08-01T00:00:00Z',content:'changed'}];
  const old=[
    {uid:'OLDuid01',site:'Threads',createtime:'2024-08-01T00:00:00Z',content:'first'},
    {uid:'OLDuid02',site:'Threads',createtime:'2024-08-01T00:00:00Z',content:'second'}
  ];
  assert.equal((await matchExistingImportByCreatedAt(input,{readSeconds:async()=>old})).size,0);
  const matched=await matchExistingImportByCreatedAt([{...input[0],content:'second'}],{readSeconds:async()=>old});
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
