test('empty site never creates a timestamp pool and social articles use random IDs',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  const before=panel.indexOf('const distinctSites=[...new Set(analyzed.valid.map(');
  const oldRows=panel.indexOf('const oldRows=analyzed.valid.filter(');
  const incoming=panel.indexOf('const incoming={');
  const match=panel.indexOf('await matchExistingImportByCreatedAt(existingCandidates,');
  assert.ok(before>=0&&before<oldRows&&oldRows<incoming&&incoming<match);
  assert.match(panel,/oldRows\.length\?dedupeIncomingImport\(oldRows\)/);
  assert.match(panel,/const existingCandidates=deduped\.unique;/);
  assert.match(panel,/existingCandidates\.length\?await matchExistingImportByCreatedAt/);
  assert.match(panel,/remapArchiveArticleUids\(\s*linked\.map\(entry=>entry\.row\),createUid8,issuedArticleUids\)/);
  assert.doesNotMatch(panel,/facebookBackupImportUid\(row\)/);
  assert.doesNotMatch(panel,/facebookArchiveUid\(stableThreadsKey\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractImportCreatedAt,createImportBatchSizer,estimateImportMinutes} from '../app/loc/import-batch.mjs';
import {dedupeIncomingImport,matchExistingImportBySiteId,matchExistingImportByCreatedAt,isUnchangedImportBeforeWrite,insertImportBatches} from '../app/loc/import-duplicate-check.mjs';

const post=(uid,site='Threads',site_id='post-100',content='original')=>({
  uid,site,site_id,createtime:'2024-08-01T00:00:00Z',title:'Title',content,url:null
});
test('timestamps are preserved as article metadata and available for fallback',()=>{
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
test('missing site_id does not invoke native ID query',async()=>{
  const rows=[post('NOID0001','Facebook',null),post('NOID0002','Facebook',null,'different')];
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
test('database lookup limits site and time before matching, preserving curated site and location',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(panel,/matchExistingImportBySiteId\(unique,/);
  assert.match(panel,/urlSafeInBatches\(values,column\)/);
  assert.match(panel,/\.eq\('site',site\)\.in\(column,batch\)/);
  assert.match(panel,/\.gte\('createtime',timeWindow\.start\)/);
  assert.match(panel,/\.lte\('createtime',timeWindow\.end\)/);
  assert.match(panel,/matchExistingImportByCreatedAt\(existingCandidates,/);
  assert.match(panel,/consumePage\(page\)/);
  assert.match(panel,/if\(!page\.length\)break/);
  assert.match(panel,/await updateImportRows\(galaxy,updateQueue\)/);
  assert.doesNotMatch(panel,/importTaipeiDate|existingByUid/);
  assert.doesNotMatch(panel,/changes\.location=|changes\.site=|changes\.site_id=/);
});
test('import progress displays source ID and fallback time matching',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/showProgress\('準備匯入文章'\)/);
  assert.doesNotMatch(panel,/精確比對網站與 site_id/);
  assert.match(panel,/onProgress:p=>showProgress\('依網站與發文時間比對'/);
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
test('no-op guard cannot hide edits, coordinates, source ID changes or media',()=>{
  const record=post('IN000001','Facebook','fb-1');
  const saved={...record,uid:'OLD00001',place_id:null};
  const matches=new Map([[record.uid,saved]]);
  assert.equal(isUnchangedImportBeforeWrite([record],matches),true);
  assert.equal(isUnchangedImportBeforeWrite([{...record,content:'changed'}],matches),false);
  assert.equal(isUnchangedImportBeforeWrite([{...record,site_id:'fb-2'}],matches),true);
  assert.equal(isUnchangedImportBeforeWrite([{...record,site:'Threads'}],matches),false);
  assert.equal(isUnchangedImportBeforeWrite([{...record,site_id:null}],matches),true);
  assert.equal(isUnchangedImportBeforeWrite([{...record,site_id:null,createtime:'2024-08-02T00:00:00Z'}],matches),false);
  assert.equal(isUnchangedImportBeforeWrite([{...record,
    __importCoordinates:{latitude:25.05338,longitude:121.49086}}],matches),false);
  assert.equal(isUnchangedImportBeforeWrite([record],matches,{hasMedia:true}),false);
  assert.equal(isUnchangedImportBeforeWrite([record,{...record,uid:'NEW00002'}],matches),false);
});
test('site and timestamp match despite different content and absent site_id',async()=>{
  const incoming=post('NEW00001','Facebook',null,'修改後內容');
  const saved=post('OLD00001','Facebook',null,'原始內容');
  const calls=[];
  const matches=await matchExistingImportByCreatedAt([incoming],{
    readTimestamps:async (times,consumePage,site)=>{
      calls.push([site,times]);
      consumePage([post('OTHER001','Threads',null,'修改後內容'),saved]);
    }
  });
  assert.deepEqual(calls,[['Facebook',['2024-08-01T00:00:00.000Z']]]);
  assert.equal(matches.get('NEW00001')?.uid,'OLD00001');
  assert.equal(isUnchangedImportBeforeWrite([incoming],matches),false);
});
test('same source and timestamp match regardless of body and optional site_id',async()=>{
  const incoming=post('NEW00001','Facebook','fb-123','different content');
  const matches=await matchExistingImportByCreatedAt([incoming],{
    readTimestamps:async()=>[post('OLD00001','Facebook',null,'original')]
  });
  assert.equal(matches.get('NEW00001')?.uid,'OLD00001');
  assert.equal(isUnchangedImportBeforeWrite([incoming],matches),false);
});
test('native site_id never blocks timestamp matching',async()=>{
  const incoming=post('NEW00001','Facebook','fb-123','original');
  const matches=await matchExistingImportByCreatedAt([incoming],{
    readTimestamps:async()=>[post('OLD00001','Facebook','fb-999','original')]
  });
  assert.equal(matches.get('NEW00001')?.uid,'OLD00001');
});
test('multiple persisted articles at the same source timestamp are ambiguous',async()=>{
  const incoming=post('NEW00001','Facebook',null,'same text');
  await assert.rejects(()=>matchExistingImportByCreatedAt([incoming],{
    readTimestamps:async()=>[post('OLD00001','Facebook',null,'same text'),
      post('OLD00002','Facebook',null,'different text')]
  }),/無法唯一比對/);
});
test('ID-less records without a valid timestamp cannot be matched',async()=>{
  const incoming={...post('NEW00001','Facebook',null),createtime:null};
  const matches=await matchExistingImportByCreatedAt([incoming],{
    readTimestamps:async()=>{throw Error('missing timestamp must not query');}
  });
  assert.equal(matches.size,0);
});
test('import retry uses non-notifying insert but keeps database permission gate',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  const contract=readFileSync(new URL('../app/loc/db-contract.mjs',import.meta.url),'utf8');
  const client=readFileSync(new URL('../app/loc/db-client.mjs',import.meta.url),'utf8');
  assert.match(panel,/writeBatch:batch=>insertImportRows\(galaxy,/);
  assert.doesNotMatch(panel,/writeBatch:batch=>insertRows\(galaxy,/);
  assert.match(contract,/const insertImportRows=insertRowsUnchecked;/);
  assert.match(contract,/const insertRows=withWriteNotice\(insertRowsUnchecked\);/);
  assert.match(contract,/const result=await managementWriteUnchecked\(\{\s*p_table:table,\s*p_operation:'insert',/);
  assert.match(contract,/function insertRowsUnchecked\(table,rows\)\{/);
  assert.match(contract,/preflightWrite\(payload\?\.p_table\)/);
  assert.match(client,/insertRows,insertImportRows,updateRows/);
});
test('an empty site bypasses timestamp matching before any candidate reads',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  const siteProbe=panel.indexOf('const distinctSites=[...new Set(unique.map(');
  const pool=panel.indexOf('const existingCandidates=unique.filter(');
  const match=panel.indexOf('await matchExistingImportByCreatedAt(existingCandidates,');
  assert.ok(siteProbe>0&&siteProbe<pool&&pool<match);
  assert.match(panel,/existingCandidates\.length\?await matchExistingImportByCreatedAt\(existingCandidates,/);
  assert.match(panel,/:new Map\(\)/);
  assert.match(panel,/\.select\('uid'\)\.eq\('site',site\)\.limit\(1\)/);
  assert.doesNotMatch(panel,/changes\.site_id=record\.site_id/);
  assert.match(panel,/await updateRows\(galaxy,\{site_id:record\.site_id\}/);
});
test('native site_id lookups are grouped by platform before database reads',async()=>{
  const rows=[post('NEW00001','Facebook','same-id'),post('NEW00002','Threads','same-id')];
  const sites=[];
  await matchExistingImportBySiteId(rows,{readSiteIds:async(ids,consumePage,site)=>{
    sites.push([site,ids]);return [];
  }});
  assert.deepEqual(sites,[['Facebook',['same-id']],['Threads',['same-id']]]);
});
test('multiple incoming posts at same second remain distinct and cannot overwrite one saved row',async()=>{
  const incoming=[post('A0000001','Facebook',null),post('B0000002','Facebook',null)];
  assert.equal(dedupeIncomingImport(incoming).unique.length,2);
  await assert.rejects(()=>matchExistingImportByCreatedAt(incoming,{
    readTimestamps:async()=>[post('OLD00001','Facebook',null)]
  }),/無法唯一比對/);
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
