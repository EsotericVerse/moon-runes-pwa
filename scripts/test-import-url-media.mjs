import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {archiveAttachmentReferences,createArchiveEvidenceCollector,prepareArchiveMedia,isArchiveMediaUrl} from '../app/loc/archive-media-evidence.mjs';
import {normalizeImportMedia} from '../app/loc/import-batch.mjs';
import {extractImportCoordinates,importMapUrlCoordinates} from '../app/loc/import-geocoordinates.mjs';

test('Google Maps location URL resolves [latitude,longitude] without external requests',()=>{
  const url='https://www.google.com/maps/我家@25.047924,121.517081,17z';
  assert.deepEqual(importMapUrlCoordinates(url),{latitude:25.047924,longitude:121.517081});
  assert.deepEqual(extractImportCoordinates({place:{name:'我家',url}}),
    {latitude:25.047924,longitude:121.517081});
  assert.deepEqual(extractImportCoordinates({label_values:[{dict:[{dict:[{value:url}]}]}]}),
    {latitude:25.047924,longitude:121.517081});
  assert.equal(importMapUrlCoordinates('https://example.com/maps/@25.047924,121.517081,17z'),null);
});

test('article URL and image URL stay separate with no EXIF or GPS',()=>{
  const articleUrl='https://www.facebook.com/posts/123';
  const imageUrl='https://cdn.example.test/photos/abc.jpg';
  const record={url:articleUrl,attachments:[{data:[{media:{uri:'photos/abc.jpg',url:imageUrl,type:'image'}}]}]};
  const refs=archiveAttachmentReferences(record);
  assert.deepEqual(refs,[{uri:'photos/abc.jpg',mediaType:'image',url:imageUrl}]);
  const collector=createArchiveEvidenceCollector();
  collector.onRecord({platform:'facebook',sourcePath:'posts.json',attachments:refs},'TEST0001');
  const evidence=collector.rows({scopeId:'lo3rwang',archiveName:'backup.zip',archiveSize:10});
  const plan=prepareArchiveMedia(evidence,new Set(['TEST0001']));
  assert.equal(plan.media.length,1);
  assert.equal(plan.media[0].url,imageUrl);
  assert.equal(plan.media[0].__article_uid,'TEST0001');
  assert.equal(plan.exif.length,0);
  assert.equal(plan.media[0].url===articleUrl,false);
});

test('standalone media URL is not lost when no ZIP photo or EXIF exists',()=>{
  const url='https://cdn.example.test/images/direct.png';
  assert.equal(isArchiveMediaUrl(url),true);
  assert.deepEqual(archiveAttachmentReferences({url}).map(row=>row.url),[url]);
});

test('dedicated media URL wins when a media object also contains a post permalink',()=>{
  const postUrl='https://www.instagram.com/p/abc123/';
  const imageUrl='https://cdn.example.test/image?id=001';
  const result=archiveAttachmentReferences({media:[{
    url:postUrl,image_url:imageUrl,type:'image'
  }]});
  assert.equal(result.length,1);
  assert.equal(result[0].url,imageUrl);
  assert.equal(result[0].mediaType,'image');
  const normalized=normalizeImportMedia([{url:postUrl,image_url:imageUrl}],{
    article_uid:'TEST0001'
  });
  assert.equal(normalized.records[0].url,imageUrl);
});


test('reimport never updates a saved media URL and still refuses conflicting UID URLs',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(panel,/updateRows\(galaxyMedia/);
  assert.match(panel,/媒體 UID 已存在，但網址不同/);
});


test('media timestamp retains own source time, otherwise inherits post time',()=>{
  const linked='2020-09-01T02:00:00.000Z';
  const own=normalizeImportMedia([{url:'https://example.test/own.jpg',
    creation_timestamp:1577836800}],{createtime:linked,article_uid:'ART00001'});
  assert.equal(own.records[0].createtime,'2020-01-01T00:00:00.000Z');
  const inherited=normalizeImportMedia([{url:'https://example.test/inherited.jpg'}],
    {createtime:linked,article_uid:'ART00001'});
  assert.equal(inherited.records[0].createtime,linked);
  const unknown=normalizeImportMedia([{url:'https://example.test/unlinked.jpg'}]);
  assert.equal(unknown.records[0].createtime,null);
});

test('full importer passes article dates to ZIP and linked media-only records',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/const articleTimes=new Map\(analyzed\.valid\.map\(row=>\[String\(row\.uid\),row\.createtime\]\)\)/);
  assert.match(panel,/archiveEvidence,new Set\(knownArticleIds\.keys\(\)\),articleTimes/);
  assert.match(panel,/createtime:record\.createtime\|\|articleTimes\.get\(owner\)\|\|null/);
});
