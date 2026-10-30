import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractImportCreatedAt,createImportBatchSizer,estimateImportMinutes} from '../app/loc/import-batch.mjs';
import {dedupeIncomingImport,matchExistingImportBySiteId,isUnchangedImportBeforeWrite,insertImportBatches} from '../app/loc/import-duplicate-check.mjs';

const post=(uid,site='Threads',site_id='post-100',content='original')=>({
  uid,site,site_id,createtime:'2024-08-01T00:00:00Z',title:'Title',content,url:null
});
test('timestamps are retained only as article metadata',()=>{
  assert.equal(extractImportCreatedAt({createAt:'2024-08-01T00:00:00Z'}),'2024-08-01T00:00:00.000Z');
  assert.equal(extractImportCreatedAt({media:[{creation_timestamp:1722470400}]}),'2024-08-01T00:00:00.000Z');
  assert.equal(extractImportCreatedAt({text:'missing date'}),null);
});
test('site_id matches despite changed Galaxy UID, timestamp and content',async()=>{
  const incoming=post('NEW00001','Threads','post-100','revised');
  incoming.createtime='2026-01-01T00:00:00Z';
  const saved=post('OLD00001','Threads','post-100','original');
  const matches=await matchExistingImportBySiteId([incoming],{readSiteIds:async ids=>{
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
test('missing site_id is insert-only and never invokes source ID query',async()=>{
  const rows=[post('NOID0001','Facebook',null),post('NOID0002','Facebook',null)];
  assert.equal(dedupeIncomingImport(rows).unique.length,2);
  const matches=await matchExistingImportBySiteId(rows,{
    readSiteIds:async()=>{throw Error('No source ID: query must not run');}
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
    readSiteIds:async(ids,consumePage)=>{
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
  assert.deepEqual(progress,[[0,2],[2,2]]);
});
test('database lookup and update queue use site_id only, preserving curated site and location',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/matchExistingImportBySiteId\(unique,/);
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
  const guard=panel.indexOf('if(isUnchangedImportBeforeWrite(unique,existingBySiteId,');
  assert.ok(guard>panel.indexOf('const existingBySiteId=await matchExistingImportBySiteId'));
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
