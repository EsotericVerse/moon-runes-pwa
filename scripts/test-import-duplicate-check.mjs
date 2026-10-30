import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dedupeIncomingImport,matchExistingImportByCreatedAt} from '../app/loc/import-duplicate-check.mjs';

const original={uid:'OLD00001',site:'Threads',createtime:'2026-10-27T07:48:32.000Z',content:'original'};

test('duplicate incoming timestamps are compared to the second without converting to milliseconds',()=>{
  const rows=[original,
    {...original,uid:'DUP00001',site:'Facebook',createtime:'2026-10-27T07:48:32.999Z',content:'revised'},
    {...original,uid:'NEXT0001',createtime:'2026-10-27T07:48:33.000Z'}
  ];
  const result=dedupeIncomingImport(rows);
  assert.deepEqual(result.unique.map(row=>row.uid),['OLD00001','NEXT0001']);
  assert.equal(result.aliases.get('DUP00001'),'OLD00001');
  assert.equal(result.duplicates,1);
});

test('records without a valid timestamp are not collapsed or sent to an untimed content lookup',async()=>{
  const rows=[{...original,uid:'NONE0001',createtime:null},
    {...original,uid:'NONE0002',createtime:null}];
  assert.equal(dedupeIncomingImport(rows).unique.length,2);
  const matched=await matchExistingImportByCreatedAt(rows,{
    readTimestamps:async()=>{throw Error('timestamp lookup should not run');}
  });
  assert.equal(matched.size,0);
});

test('existing records are looked up by original timestamp, ignoring site and generated UID',async()=>{
  const input=[{...original,uid:'NEW00001',content:'updated'}];
  const queried=[];
  const matched=await matchExistingImportByCreatedAt(input,{
    readTimestamps:async timestamps=>{
      queried.push(...timestamps);
      return [{...original,createtime:'2026-10-27T07:48:32+00:00',site:'Facebook'}];
    }
  });
  assert.deepEqual(queried,['2026-10-27T07:48:32.000Z']);
  assert.equal(matched.get('NEW00001')?.uid,'OLD00001');
});

test('two existing posts in the same second are not overwritten arbitrarily',async()=>{
  const input=[{...original,uid:'NEW00001',content:'other'}];
  const matched=await matchExistingImportByCreatedAt(input,{
    readTimestamps:async()=>[{...original,uid:'OLD00001'},
      {...original,uid:'OLD00002',content:'different'}]
  });
  assert.equal(matched.size,0);
});

test('import source has no millisecond conversion or untimed-content SQL precheck',()=>{
  const helper=readFileSync(new URL('../app/loc/import-duplicate-check.mjs',import.meta.url),'utf8');
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(helper,/Date\.parse|importEpochMs|importSecond\(|findExistingImportDuplicates|matchExistingWithoutCreatedAt/);
  assert.match(panel,/urlSafeInBatches\(timestamps,'createtime'\)/);
  assert.doesNotMatch(panel,/new Date\(ms\)\.toISOString|matchExistingWithoutCreatedAt|\.ilike\('site',source\)/);
  assert.doesNotMatch(panel,/\.gte\('createtime'|\.lt\('createtime'/);
});
