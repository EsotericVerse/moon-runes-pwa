import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dedupeIncomingImport,matchExistingImportBySiteId,insertImportBatches} from '../app/loc/import-duplicate-check.mjs';

const original={uid:'OLD00001',site:'Threads',site_id:'threads-1',
  createtime:'2026-10-27T07:48:32.000Z',title:'A',content:'original'};

test('site_id is metadata, not a source-level duplicate identity',()=>{
  const rows=[original,
    {...original,uid:'DUP00001',createtime:'2027-01-01T00:00:00Z'},
    {...original,uid:'FACEBOOK',site:'Facebook'},
    {...original,uid:'DISTINCT',site_id:'threads-2'},
    {...original,uid:'NEXT0001',site_id:'threads-3'},
    {...original}];
  const result=dedupeIncomingImport(rows);
  assert.deepEqual(result.unique.map(row=>row.uid),
    ['OLD00001','DUP00001','FACEBOOK','DISTINCT','NEXT0001']);
  assert.equal(result.duplicates,1);
});
test('different IDs do not collapse even with identical timestamps and content',()=>{
  const rows=[original,{...original,uid:'SECOND01',site_id:'threads-2'}];
  assert.equal(dedupeIncomingImport(rows).unique.length,2);
});
test('same site_id with different UID and body stays separate',()=>{
  const result=dedupeIncomingImport([original,{...original,uid:'NEW00001',content:'different'}]);
  assert.equal(result.unique.length,2);
});
test('same UID with different content is rejected',()=>{
  assert.throws(()=>dedupeIncomingImport([original,{...original,content:'different'}]),
    /相同 UID 對應不同來源文章/);
});
test('same timestamp without site_id does not collapse separate source UIDs',()=>{
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
  assert.match(helper,/Date\.parse/);
  assert.doesNotMatch(helper,/importEpochMs|findExistingImportDuplicates|matchExistingWithoutCreatedAt/);
  assert.match(panel,/readImportCandidatesByTimeWindows\(times,\{/);
  assert.match(panel,/urlSafeInBatches\(uids,'uid'\)/);
  assert.doesNotMatch(panel,/\.ilike\('site',site\)\.in\(column,batch\)/);
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
test('every db helper the import panel calls is imported from db-client',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  const imported=panel.match(/import \{([^}]*)\} from '\.\/db-client\.mjs'/)[1].split(',').map(name=>name.trim());
  for(const name of ['insertRows','insertImportRows','updateRows','updateImportRows'])
    if(new RegExp('\\b'+name+'\\(').test(panel))
      assert.ok(imported.includes(name),name+' is called but not imported');
});
