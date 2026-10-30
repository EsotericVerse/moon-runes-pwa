import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {comparableImportText,importEpochMs,dedupeIncomingImport,findExistingImportDuplicates,matchExistingWithoutCreatedAt} from '../app/loc/import-duplicate-check.mjs';

const base={uid:'ABCDEFGH',site:'Threads',createtime:'2026-10-27T15:48:32.000+08:00',content:'天氣真好！\n\n再見。'};

test('identical original timestamps are deduplicated independently of site, title and content',()=>{
  const rows=[base,
    {...base,uid:'OTHER001',site:'Facebook',title:'different',content:'changed'},
    {...base,uid:'OTHER002',createtime:'2026-10-27T07:48:32.000Z',content:'revised'},
    {...base,uid:'OTHER003',createtime:'2026-10-27T07:48:32.001Z'}];
  const result=dedupeIncomingImport(rows);
  assert.deepEqual(result.unique.map(row=>row.uid),['ABCDEFGH','OTHER003']);
  assert.equal(result.duplicates,2);
  assert.equal(result.aliases.get('OTHER001'),'ABCDEFGH');
  assert.equal(result.aliases.get('OTHER002'),'ABCDEFGH');
});

test('epoch milliseconds are numbers, timezone-independent, and distinct at the millisecond boundary',()=>{
  assert.equal(importEpochMs('2026-10-27T15:48:32.123+08:00'),importEpochMs('2026-10-27T07:48:32.123Z'));
  assert.notEqual(importEpochMs('2026-10-27T07:48:32.123Z'),importEpochMs('2026-10-27T07:48:32.124Z'));
  assert.equal(importEpochMs(null),null);
  assert.equal(comparableImportText('AA。\n\nBB!'),comparableImportText('aa bb'));
});

test('without createdAt, exact metadata still resolves duplicate content without a site requirement',async()=>{
  const missing={...base,uid:'NODATE01',createtime:null};
  const saved={...base,uid:'SAVED001',site:'Facebook'};
  const matched=await matchExistingWithoutCreatedAt([missing],{
    readContents:async contents=>{
      assert.deepEqual(contents,[base.content]);
      return [saved];
    }
  });
  assert.equal(matched.get('NODATE01')?.uid,'SAVED001');
});

test('missing-time records with different article metadata are not merged',async()=>{
  const missing={...base,uid:'NODATE01',createtime:null};
  const rows=[missing,{...missing,uid:'NODATE02',location:'different'},{...missing,uid:'NODATE03',content:'different'}];
  const result=dedupeIncomingImport(rows);
  assert.equal(result.unique.length,3);
  const matched=await matchExistingWithoutCreatedAt(rows,{
    readContents:async()=>[{...base,uid:'SAVED001'}]
  });
  assert.deepEqual([...matched.keys()],['NODATE01']);
});

test('missing-time copies of dated posts are reconciled without collapsing other dates',()=>{
  const missing={...base,uid:'NO-TIME1',createtime:null};
  const dated={...base,uid:'SAME0002',createtime:'2026-10-28T07:48:32Z'};
  const result=dedupeIncomingImport([missing,base,dated,{...missing,uid:'NO-TIME2'}]);
  assert.deepEqual(result.unique.map(row=>row.uid),['ABCDEFGH','SAME0002']);
  assert.equal(result.aliases.get('NO-TIME1'),'ABCDEFGH');
  assert.equal(result.aliases.get('NO-TIME2'),'ABCDEFGH');
});

test('saved duplicate detection takes exact epoch milliseconds without source constraints',async()=>{
  const calls=[];
  const matched=await findExistingImportDuplicates([base],{
    readTimestamps:async times=>{
      calls.push(times);
      return [{...base,uid:'SAVED001',site:'Facebook',createtime:'2026-10-27T07:48:32.000Z'},
        {...base,uid:'NEAR0001',createtime:'2026-10-27T07:48:32.001Z'}];
    }
  });
  assert.deepEqual(calls,[[Date.parse(base.createtime)]]);
  assert.equal(matched.get('ABCDEFGH'),'SAVED001');
});

test('the import panel uses equality IN on TIMESTAMPTZ with no OR ranges or site filters',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/\.in\('createtime',batch\)/);
  assert.doesNotMatch(panel,/\.ilike\('site',source\)/);
  assert.doesNotMatch(panel,/\.or\(or\)/);
  assert.doesNotMatch(panel,/\.gte\('createtime'/);
  assert.doesNotMatch(panel,/\.lt\('createtime'/);
  assert.match(panel,/encodeURIComponent\(value\)\.length<=5000/);
});
