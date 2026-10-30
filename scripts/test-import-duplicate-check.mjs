import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dedupeIncomingImport,matchExistingImportBySiteId,matchExistingImportBySiteAndTime,insertImportBatches} from '../app/loc/import-duplicate-check.mjs';

const original={uid:'OLD00001',site:'Threads',site_id:'threads-1',
  createtime:'2026-10-27T07:48:32.000Z',title:'A',content:'original'};

test('same platform and site_id collapse even when timestamps differ',()=>{
  const rows=[original,
    {...original,uid:'DUP00001',createtime:'2027-01-01T00:00:00Z'},
    {...original,uid:'FACEBOOK',site:'Facebook'},
    {...original,uid:'DISTINCT',site_id:'threads-2'},
    {...original,uid:'NEXT0001',site_id:'threads-3'}];
  const result=dedupeIncomingImport(rows);
  assert.deepEqual(result.unique.map(row=>row.uid),['OLD00001','FACEBOOK','DISTINCT','NEXT0001']);
  assert.equal(result.aliases.get('DUP00001'),'OLD00001');
  assert.equal(result.duplicates,1);
});
test('different IDs do not collapse even with identical timestamps and content',()=>{
  const rows=[original,{...original,uid:'SECOND01',site_id:'threads-2'}];
  assert.equal(dedupeIncomingImport(rows).unique.length,2);
});
test('same platform and ID with different content aborts instead of dropping a post',()=>{
  assert.throws(()=>dedupeIncomingImport([original,{...original,uid:'NEW00001',content:'different'}]),
    /site_id 對應不同文章/);
});
test('missing source IDs never deduplicate by time, content or generated UID',()=>{
  const rows=[{...original,site_id:null},
    {...original,site_id:null,uid:'NEW00001'}];
  assert.equal(dedupeIncomingImport(rows).unique.length,2);
});
test('site_id matching preserves leading zeros and case',async()=>{
  const input=[{...original,uid:'NEW00001',site_id:'001Ab'}];
  const matches=await matchExistingImportBySiteId(input,{
    readSiteIds:async()=>[{...original,site_id:'001ab'},{...original,site_id:'1Ab'}]
  });
  assert.equal(matches.size,0);
});
test('source IDs from other platforms never match',async()=>{
  const input=[{...original,uid:'NEW00001'}];
  const matches=await matchExistingImportBySiteId(input,{
    readSiteIds:async()=>[{...original,site:'Instagram'},
      {...original,site:'Facebook'}]
  });
  assert.equal(matches.size,0);
});
test('matcher refuses duplicate incoming identities without dedupe',async()=>{
  await assert.rejects(()=>matchExistingImportBySiteId([original,{...original,uid:'NEW00001'}],{
    readSiteIds:async()=>[]
  }),/重複的來源 site_id/);
});
test('streamed site_id lookup and media mapping remain intact',()=>{
  const helper=readFileSync(new URL('../app/loc/import-duplicate-check.mjs',import.meta.url),'utf8');
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(helper,/Date\.parse|importEpochMs|findExistingImportDuplicates|matchExistingWithoutCreatedAt/);
  assert.match(panel,/urlSafeInBatches\(siteIds,'site_id'\)/);
  assert.match(panel,/\.in\('site_id',batch\)/);
  assert.match(panel,/\.eq\('site',site\)\.in\('site_id',batch\)/);
  assert.match(panel,/\.eq\('site',site\)\.in\('createtime',batch\)/);
  assert.match(panel,/consumePage\(page\)/);
  assert.doesNotMatch(panel,/collected\.push\(\.\.\.page\)/);
  assert.match(panel,/for\(const uid of result\.insertedUids\)knownArticleIds\.set\(uid,uid\)/);
  assert.match(panel,/const savedUid=knownArticleIds\.get\(canonical\)/);
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

test('missing native ID uses site and timestamp without collapsing different content',async()=>{
  const input=[{...original,uid:'NEW00001',site:'Facebook',site_id:null,content:'one'},
    {...original,uid:'NEW00002',site:'Facebook',site_id:null,content:'two'}];
  const matches=await matchExistingImportBySiteAndTime(input,{
    readSiteTimes:async(site,times)=>{
      assert.equal(site,'Facebook');
      assert.equal(times.length,1);
      return [{...input[0],uid:'OLD00001'},{...input[1],uid:'OLD00002'}];
    }
  });
  assert.equal(matches.get('NEW00001')?.uid,'OLD00001');
  assert.equal(matches.get('NEW00002')?.uid,'OLD00002');
});
