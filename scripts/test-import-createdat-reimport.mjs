import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractImportCreatedAt,createImportBatchSizer,estimateImportMinutes} from '../app/loc/import-batch.mjs';
import {dedupeIncomingImport,matchExistingImportBySiteId,matchExistingImportBySiteAndTime,isUnchangedImportBeforeWrite,insertImportBatches} from '../app/loc/import-duplicate-check.mjs';

const post=(uid,site='Threads',site_id='post-100',content='original')=>({
  uid,site,site_id,createtime:'2024-08-01T00:00:00Z',title:'Title',content,url:null
});
test('timestamps remain article metadata and are available for fallback matching',()=>{
  assert.equal(extractImportCreatedAt({createAt:'2024-08-01T00:00:00Z'}),'2024-08-01T00:00:00.000Z');
  assert.equal(extractImportCreatedAt({media:[{creation_timestamp:1722470400}]}),'2024-08-01T00:00:00.000Z');
  assert.equal(extractImportCreatedAt({text:'missing date'}),null);
});
test('site_id matches despite changed Galaxy UID, timestamp and content',async()=>{
  const incoming=post('NEW00001','Threads','post-100','revised');
  incoming.createtime='2026-01-01T00:00:00Z';
  const saved=post('OLD00001','Threads','post-100','original');
  const matches=await matchExistingImportBySiteId([incoming],{readSiteIds:async (site,ids)=>{
    assert.equal(site,'Threads');
    assert.deepEqual(ids,['post-100']);
    return [saved];
  }});
  assert.equal(matches.get(incoming.uid)?.uid,'OLD00001');
});
test('same timestamp and text with different site_id cannot match',async()=>{
  const incoming=post('NEW00001','Threads','post-200');
  const matches=await matchExistingImportBySiteId([incoming],{
    readSiteIds:async()=>[post('OLD00001','Threads','post-100')]
  });
  assert.equal(matches.size,0);
});
test('Facebook and Threads cannot match even when their source IDs are identical',async()=>{
  const incoming=post('NEW00001','Threads','12345');
  const matches=await matchExistingImportBySiteId([incoming],{
    readSiteIds:async()=>[post('FB000001','Facebook','12345')]
  });
  assert.equal(matches.size,0);
});
test('missing site_id uses same-site timestamp plus exact content',async()=>{
  const incoming=post('NOID0001','Facebook',null,'Facebook archive post');
  const saved=post('OLD00001','Facebook',null,'Facebook archive post');
  assert.equal(dedupeIncomingImport([incoming]).unique.length,1);
  const idMatches=await matchExistingImportBySiteId([incoming],{
    readSiteIds:async()=>{throw Error('Missing ID must not query site_id');}
  });
  assert.equal(idMatches.size,0);
  const matches=await matchExistingImportBySiteAndTime([incoming],{
    readSiteTimes:async(site,times)=>{
      assert.equal(site,'Facebook');
      assert.deepEqual(times,['2024-08-01T00:00:00.000Z']);
      return [saved];
    }
  });
  assert.equal(matches.get(incoming.uid)?.uid,'OLD00001');
  assert.equal(isUnchangedImportBeforeWrite([incoming],matches),true);
});
test('site_id lookup groups queries by source site before fetching',async()=>{
  const rows=[post('A0000001','Facebook','same-id'),post('B0000001','Threads','same-id')];
  const calls=[];
  const matches=await matchExistingImportBySiteId(rows,{
    readSiteIds:async(site,ids)=>{
      calls.push([site,ids]);
      return [post(site==='Facebook'?'OLD00001':'OLD00002',site,'same-id')];
    }
  });
  assert.deepEqual(calls,[['Facebook',['same-id']],['Threads',['same-id']]]);
  assert.equal(matches.size,2);
});
test('timestamp fallback never crosses platforms or matches changed content',async()=>{
  const incoming=post('NEW00001','Facebook',null,'original');
  const matches=await matchExistingImportBySiteAndTime([incoming],{
    readSiteTimes:async()=>[
      post('THREAD01','Threads',null,'original'),
      post('CHANGED1','Facebook',null,'edited'),
      post('WITHID01','Facebook','fb-native','original')
    ]
  });
  assert.equal(matches.size,0);
});
test('timestamp fallback resolves different posts within the same second by content',async()=>{
  const first=post('NEW00001','Facebook',null,'first');
  const second=post('NEW00002','Facebook',null,'second');
  const matches=await matchExistingImportBySiteAndTime([first,second],{
    readSiteTimes:async(site,times)=>{
      assert.equal(site,'Facebook');
      assert.equal(times.length,1);
      return [post('OLD00001','Facebook',null,'first'),
        post('OLD00002','Facebook',null,'second')];
    }
  });
  assert.equal(matches.get('NEW00001')?.uid,'OLD00001');
  assert.equal(matches.get('NEW00002')?.uid,'OLD00002');
});
test('ambiguous same-time same-content posts are never merged arbitrarily',async()=>{
  const incoming=post('NEW00001','Facebook',null,'identical');
  const matches=await matchExistingImportBySiteAndTime([incoming],{
    readSiteTimes:async()=>[
      post('OLD00001','Facebook',null,'identical'),
      post('OLD00002','Facebook',null,'identical')
    ]
  });
  assert.equal(matches.size,0);
});
test('native site_id always outranks timestamp fallback',async()=>{
  const withId=post('NEW00001','Facebook','fb-100','original');
  const matches=await matchExistingImportBySiteAndTime([withId],{
    readSiteTimes:async()=>{throw Error('Native ID must not query timestamp');}
  });
  assert.equal(matches.size,0);
});
test('missing site_id and timestamp cannot match',async()=>{
  const withoutTime={...post('NEW00001','Facebook',null,'original'),createtime:null};
  const matches=await matchExistingImportBySiteAndTime([withoutTime],{
    readSiteTimes:async()=>{throw Error('Missing timestamp must not query');}
  });
  assert.equal(matches.size,0);
});
test('duplicate persisted platform and site_id fails before writing',async()=>{
  const incoming=post('NEW00001','Instagram','ig-1');
  await assert.rejects(()=>matchExistingImportBySiteId([incoming],{
    readSiteIds:async()=>[post('OLD00001','Instagram','ig-1'),
      post('OLD00002','Instagram','ig-1')]
  }),/多筆相同平台與 site_id/);
});
test('paged lookup ignores all unrelated source platforms without accumulating pages',async()=>{
  const incoming=post('NEW00001','Facebook','fb-100');
  const matches=await matchExistingImportBySiteId([incoming],{
    readSiteIds:async(site,ids,consumePage)=>{
      assert.equal(site,'Facebook');
      assert.deepEqual(ids,['fb-100']);
      for(let i=0;i<50;i++)consumePage([post('OTH'+i,'Threads','fb-100')]);
      consumePage([post('OLD00001','Facebook','fb-100')]);
    }
  });
  assert.equal(matches.get(incoming.uid)?.uid,'OLD00001');
});
test('source ID lookup reports progress without timestamps',async()=>{
  const rows=[post('AA000001','Facebook','fb-1'),post('AA000002','Threads','th-2')];
  const progress=[];
  await matchExistingImportBySiteId(rows,{
    readSiteIds:async()=>[],onProgress:p=>progress.push([p.completed,p.total])
  });
  assert.deepEqual(progress,[[0,2],[1,2],[2,2]]);
});
test('database lookup scopes both site_id and timestamp to site, preserving curated fields',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/matchExistingImportBySiteId\(unique,/);
  assert.match(panel,/matchExistingImportBySiteAndTime\(unique,/);
  assert.match(panel,/\.eq\('site',site\)\.in\('site_id',batch\)/);
  assert.match(panel,/\.eq\('site',site\)\.in\('createtime',batch\)/);
  assert.match(panel,/urlSafeInBatches\(siteIds,'site_id'\)/);
  assert.match(panel,/\.in\('site_id',batch\)/);
  assert.match(panel,/consumePage\(page\)/);
  assert.match(panel,/if\(!page\.length\)break/);
  assert.match(panel,/await updateImportRows\(galaxy,updateQueue\)/);
  assert.doesNotMatch(panel,/matchExistingImportByCreatedAt|importTaipeiDate|existingByUid|readTimestamps/);
  assert.doesNotMatch(panel,/changes\.location=|changes\.site=|changes\.site_id=/);
});
test('import progress displays source identity rather than publishing time',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/showProgress\('準備匯入文章'\)/);
  assert.match(panel,/onProgress:p=>showProgress\('精確比對平台與 site_id'/);
  assert.match(panel,/onProgress:p=>showProgress\('同平台時間與內容比對'/);
  assert.match(panel,/showProgress\('準備空間定錨'\)/);
  assert.match(panel,/showProgress\('更新既有文章'/);
  assert.match(panel,/showProgress\('新增文章'/);
  assert.match(panel,/showProgress\('整理媒體資料'\)/);
  assert.match(panel,/progress\.percent===null\?<progress max="100"/);
});
test('batch controller scales with throughput',()=>{
  const s=createImportBatchSizer();
  assert.equal(s.size,256);
  assert.equal(s.observe(256,5000),512);
  assert.equal(s.observe(512,5000),1024);
  assert.equal(s.observe(1024,20000),512);
});
test('pre-write import estimate uses only parsed counts',()=>{
  assert.equal(estimateImportMinutes({articles:0,media:0}),null);
  assert.deepEqual(estimateImportMinutes({articles:1}),{min:1,max:3});
  const withMedia=estimateImportMinutes({articles:35795,media:1000});
  assert.ok(withMedia.min>=8&&withMedia.max>32);
});
test('unchanged site_id match exits before anchor and article writes',async()=>{
  const record=post('IN000001','Facebook','fb-1');
  const saved={...record,uid:'OLD00001',place_id:null};
  const matches=await matchExistingImportBySiteId([record],{readSiteIds:async()=>[saved]});
  assert.equal(isUnchangedImportBeforeWrite([record],matches),true);
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  const guard=panel.indexOf('if(isUnchangedImportBeforeWrite(unique,existingMatches,');
  assert.ok(guard>panel.indexOf('const existingMatches=new Map('));
  assert.ok(guard<panel.indexOf('const placeAnchors=await prepareImportPlaceAnchors('));
  assert.ok(guard<panel.indexOf('await updateImportRows(galaxy,updateQueue)'));
});
test('no-op guard cannot hide edits, coordinates, missing IDs or media',()=>{
  const record=post('IN000001','Facebook','fb-1');
  const saved={...record,uid:'OLD00001',place_id:null};
  const matches=new Map([[record.uid,saved]]);
  assert.equal(isUnchangedImportBeforeWrite([record],matches),true);
  assert.equal(isUnchangedImportBeforeWrite([{...record,content:'changed'}],matches),false);
  assert.equal(isUnchangedImportBeforeWrite([{...record,site_id:'fb-2'}],matches),false);
  assert.equal(isUnchangedImportBeforeWrite([{...record,site:'Threads'}],matches),false);
  assert.equal(isUnchangedImportBeforeWrite([{...record,site_id:null}],matches),false);
  assert.equal(isUnchangedImportBeforeWrite([{...record,
    __importCoordinates:{latitude:25.05338,longitude:121.49086}}],matches),false);
  assert.equal(isUnchangedImportBeforeWrite([record],matches,{hasMedia:true}),false);
  assert.equal(isUnchangedImportBeforeWrite([record,{...record,uid:'NEW00002'}],matches),false);
});
test('primary-key conflicts do not become site_id matches',async()=>{
  const inserted=[];
  const result=await insertImportBatches([{uid:'AAA00001'},{uid:'AAA00002'},{uid:'AAA00003'}],{
    writeBatch:async rows=>{
      if(rows.some(row=>row.uid==='AAA00002'))
        throw Error('duplicate key value violates unique constraint "galaxy_pkey"');
      inserted.push(...rows);return {count:rows.length};
    }
  });
  assert.deepEqual(inserted.map(row=>row.uid),['AAA00001','AAA00003']);
  assert.equal(result.conflicts,1);
});
