import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dedupeIncomingImport,matchExistingImportBySiteId,insertImportBatches} from '../app/loc/import-duplicate-check.mjs';

const original={uid:'OLD00001',site:'Threads',site_id:'threads-1',
  createtime:'2026-10-27T07:48:32.000Z',title:'A',content:'original'};

test('a repeated genuine source ID is the same article even if the import UID changes',()=>{
  const rows=[original,
    {...original,uid:'DUP00001',createtime:'2027-01-01T00:00:00Z'},
    {...original,uid:'FACEBOOK',site:'Facebook'},
    {...original,uid:'DISTINCT',site_id:'threads-2'},
    {...original,uid:'NEXT0001',site_id:'threads-3'},
    {...original}];
  const result=dedupeIncomingImport(rows);
  assert.deepEqual(result.unique.map(row=>row.uid),
    ['OLD00001','FACEBOOK','DISTINCT','NEXT0001']);
  assert.equal(result.duplicates,2);
  assert.equal(result.aliases.get('DUP00001'),'OLD00001');
});
test('duplicate source copies retain a missing check-in on the canonical article',()=>{
  const rows=[
    {...original,location:null,__importVisitTimes:['2026-10-26T06:00:00Z']},
    {...original,uid:'NEW00001',location:'台北車站',date:'2026-10-27',
      __importCheckin:true,__importCoordinates:{latitude:25,longitude:121},
      __importVisitTimes:['2026-10-27T06:00:00Z']}
  ];
  const result=dedupeIncomingImport(rows);
  assert.equal(result.unique.length,1);
  assert.equal(result.unique[0].location,'台北車站');
  assert.equal(result.unique[0].date,'2026-10-27');
  assert.equal(result.unique[0].__importCheckin,true);
  assert.deepEqual(result.unique[0].__importCoordinates,{latitude:25,longitude:121});
  assert.deepEqual(result.unique[0].__importVisitTimes,['2026-10-26T06:00:00Z','2026-10-27T06:00:00Z']);
});
test('a duplicate cannot overwrite an existing explicit location',()=>{
  const result=dedupeIncomingImport([
    {...original,location:'第一地點'},
    {...original,uid:'NEW00001',location:'第二地點'}
  ]);
  assert.equal(result.unique[0].location,'第一地點');
});
test('different IDs do not collapse even with identical timestamps and content',()=>{
  const rows=[original,{...original,uid:'SECOND01',site_id:'threads-2'}];
  assert.equal(dedupeIncomingImport(rows).unique.length,2);
});
test('same native source ID uses one canonical UID even with revised text',()=>{
  const result=dedupeIncomingImport([original,{...original,uid:'NEW00001',content:'different'}]);
  assert.equal(result.unique.length,1);
  assert.equal(result.aliases.get('NEW00001'),'OLD00001');
});
test('same UID with different content is rejected',()=>{
  assert.throws(()=>dedupeIncomingImport([original,{...original,content:'different'}]),
    /相同 UID 對應不同來源文章/);
});
test('same site, timestamp and normalized text without a source ID is deduplicated',()=>{
  const rows=[{...original,site_id:null},
    {...original,site_id:null,uid:'NEW00001',content:'original!'}];
  const result=dedupeIncomingImport(rows);
  assert.equal(result.unique.length,1);
  assert.equal(result.aliases.get('NEW00001'),'OLD00001');
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
test('import preview shows web addresses as links, not raw URL text',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/<LinkedImportText text=\{record\.title\|\|record\.uid\}\/>/);
  assert.match(panel,/<LinkedImportText text=\{record\.content\} limit=\{180\}\/>/);
  assert.match(panel,/rel="noopener noreferrer">連結<\/a>/);
});


test('same file name is only a display label; repeat parsing uses source identity not random import UID',async()=>{
  // Two parses of the same source can use different random Galaxy UIDs.
  const first={...original,uid:'FIRST001',site_id:'fb-1',site:'Facebook'};
  const second={...first,uid:'REPEAT02'};
  // Re-parsing generates a new local UID; matching is against the saved source ID.
  const matches=await matchExistingImportBySiteId([second],{
    readSiteIds:async()=>[first]
  });
  assert.equal(matches.get(second.uid)?.uid,first.uid);
  assert.equal(dedupeIncomingImport([second]).unique.length,1);
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/const incoming=dedupeIncomingImport\(analyzed\.valid\);/);
  assert.match(panel,/const matchesById=existingCandidates\.length\?await matchExistingImportBySiteId\(/);
});

test('native post IDs do not require expensive body normalization for deduplication',()=>{
  const row={...original,uid:'SINGLE01'};
  Object.defineProperty(row,'content',{get(){throw Error('unexpected content normalization');}});
  assert.equal(dedupeIncomingImport([row]).unique.length,1);
});

test('archive selection does not count ZIP entries in an unused extra scan',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(panel,/zipEntryCount\(file\)/);
});

test('ID-based media lookup stops after a short page instead of making an empty request',async()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  const section=panel.slice(panel.indexOf('async function readExistingByIds('),
    panel.indexOf('// Shared idempotent media attachment write'));
  let requests=0;
  const relation=()=>({select:()=>({in:()=>({order:()=>({
    range:async start=>{
      requests++;
      return {data:start?[]:[{uid:'A'}],error:null};
    }
  })})})});
  const reader=new Function('dbAuthRelation','MAX_ROWS','urlSafeInBatches',
    section+'\nreturn readExistingByIds;')(relation,500,function*(values){yield values;});
  assert.equal((await reader('galaxy','uid','uid',['A'],'failed')).length,1);
  assert.equal(requests,1);
});
