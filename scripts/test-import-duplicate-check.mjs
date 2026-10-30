import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dedupeIncomingImport,matchExistingImportByCreatedAt,insertImportBatches} from '../app/loc/import-duplicate-check.mjs';

const original={uid:'OLD00001',site:'Threads',createtime:'2026-10-27T07:48:32.000Z',content:'original'};

test('same-platform duplicates collapse without merging separate Facebook and Threads posts',()=>{
  const rows=[original,
    {...original,uid:'DUP00001',site:'Threads',createtime:'2026-10-27T07:48:32.999Z'},
    {...original,uid:'FACEBOOK',site:'Facebook',createtime:'2026-10-27T07:48:32.999Z'},
    {...original,uid:'DISTINCT',createtime:'2026-10-27T07:48:32.123Z',content:'different post'},
    {...original,uid:'NEXT0001',createtime:'2026-10-27T07:48:33.000Z'}
  ];
  const result=dedupeIncomingImport(rows);
  assert.deepEqual(result.unique.map(row=>row.uid),['OLD00001','FACEBOOK','DISTINCT','NEXT0001']);
  assert.equal(result.aliases.get('DUP00001'),'OLD00001');
  assert.equal(result.aliases.get('FACEBOOK'),'FACEBOOK');
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

test('indexed candidate lookup retains second identity and streams results',()=>{
  const helper=readFileSync(new URL('../app/loc/import-duplicate-check.mjs',import.meta.url),'utf8');
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(helper,/Date\.parse|importEpochMs|findExistingImportDuplicates|matchExistingWithoutCreatedAt/);
  assert.match(panel,/urlSafeInBatches\(lookup,column\)/);
  assert.match(panel,/\.in\(column,batch\)/);
  assert.match(panel,/consumePage\(page\)/);
  assert.doesNotMatch(panel,/collected\.push\(\.\.\.page\)/);
  assert.doesNotMatch(panel,/\.gte\('createtime'|\.lt\('createtime'/);
});

test('an existing article is reserved for its actual same-second content match',async()=>{
  const incoming=[
    {...original,uid:'CHANGED1',content:'changed text'},
    {...original,uid:'NEW00001',createtime:'2026-10-27T07:48:32.500Z',content:'original'}
  ];
  const matched=await matchExistingImportByCreatedAt(incoming,{
    readTimestamps:async times=>{
      assert.deepEqual(times,[incoming[0].createtime,incoming[1].createtime]);
      return [original];
    }
  });
  assert.equal(matched.get('NEW00001')?.uid,'OLD00001');
  assert.equal(matched.has('CHANGED1'),false);
});

test('insert result includes only successfully written article UIDs',async()=>{
  const inserted=await insertImportBatches([
    {uid:'AA000001'},{uid:'AA000002'},{uid:'AA000003'}
  ],{
    writeBatch:async rows=>{
      if(rows.some(row=>row.uid==='AA000002'))
        throw Error('duplicate key value violates unique constraint "galaxy_pkey"');
      return {count:rows.length};
    }
  });
  assert.deepEqual([...inserted.insertedUids],['AA000001','AA000003']);
  assert.deepEqual([...inserted.conflictedUids],['AA000002']);
  assert.equal(inserted.inserted,2);
});

test('media association never presumes that a conflicted new article exists',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/for\(const uid of result\.insertedUids\)knownArticleIds\.set\(uid,uid\)/);
  assert.match(panel,/const savedUid=knownArticleIds\.get\(canonical\)/);
  assert.match(panel,/if\(savedUid\)knownArticleIds\.set/);
  assert.match(panel,/__article_uid:knownArticleIds\.get\(String\(record\.__article_uid\|\|''\)\)\|\|null/);
});
