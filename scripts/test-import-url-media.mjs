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


test('rune draw is a Galaxy media subtype with meta_tags text, not a separate article',()=>{
  const result=normalizeImportMedia([{
    media_type:'runes',title:'抽牌結果',
    meta_tags:'{"cards":[{"rune":"月","direction":"正位","position":1}]}'
  }],{article_uid:'ART00001'});
  assert.equal(result.records.length,1);
  assert.equal(result.records[0].media_type,'runes');
  assert.equal(result.records[0].title,'抽牌結果');
  assert.equal(result.records[0].url,null);
  assert.match(result.records[0].meta_tags,/"rune":"月"/);
  assert.equal(result.records[0].__article_uid,'ART00001');
  assert.equal(result.references.length,0);
});

test('image description stays on galaxy_media.meta_tags and preserves its own URL',()=>{
  const result=normalizeImportMedia([{
    media_type:'image',title:'旅行照片',url:'https://example.test/image.jpg',
    description:'傍晚的橋面'
  }],{article_uid:'ART00001'});
  assert.equal(result.records.length,1);
  assert.equal(result.records[0].meta_tags,'傍晚的橋面');
  assert.equal(result.records[0].url,'https://example.test/image.jpg');
  assert.equal(result.records[0].__article_uid,'ART00001');
});


test('legacy rune_references are interpreted as rune media without a Galaxy article',()=>{
  const legacy={cards:[{rune:'土',direction:'半逆',position:1}]};
  const normalized=normalizeImportMedia([{rune_references:legacy}],{article_uid:'ART00001'});
  assert.equal(normalized.records.length,1);
  assert.equal(normalized.records[0].media_type,'runes');
  assert.deepEqual(normalized.records[0].rune_references,legacy);
  assert.equal(normalized.records[0].__article_uid,'ART00001');
  const importer=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(importer,/const \{rune_references,\.\.\.record\}=source/);
  assert.match(importer,/media_type:'runes',title:'抽牌結果'/);
  assert.match(importer,/existingRuneByArticle/);
  assert.doesNotMatch(importer,/writeBatch:batch=>insertRows\(galaxyMedia,batch\.map\(record=>\(\{/);
});


test('top-level rune references attach to existing text articles or stand alone as media',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.ok(panel.includes("if(content&&runeResultText)mediaRecords.push({"));
  assert.ok(panel.includes("media_type:'runes',title:'抽牌結果'"));
  assert.ok(panel.includes("const type=String(value('media_type')||(runeResultText?'runes':'')).trim();"));
  assert.ok(panel.includes("media_type:type,title:rawTitle||(type==='runes'?'抽牌結果':null)"));
  assert.ok(panel.includes("existingRuneByArticle"));
});


test('nested media descriptions preserve JSON rather than object-to-string corruption',()=>{
  const tags={alt:'台北夜景',camera:'mobile'};
  const image=normalizeImportMedia([{media_type:'image',url:'https://example.test/night.jpg',meta_tags:tags}],{article_uid:'ART00001'});
  assert.equal(image.records[0].meta_tags,JSON.stringify(tags));
  const spread={cards:[{rune:'月',direction:'正位'}]};
  const rune=normalizeImportMedia([{media_type:'runes',meta_tags:spread}],{article_uid:'ART00001'});
  assert.equal(rune.records[0].meta_tags,JSON.stringify(spread));
  assert.equal(rune.records.length,1);
});


test('retired EXIF private storage never causes a partial article/media import',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(panel,/\.rpc\('save_archive_media_exif'/);
  assert.match(panel,/const exifNotSaved=archivePlan\.exif\.length/);
  assert.match(panel,/私人 EXIF .*未寫入/);
  // No private coordinates or camera time are redirected into public text.
  assert.doesNotMatch(panel,/meta_tags:.*archivePlan\.exif/);
  assert.match(panel,/prepareArchiveMedia\(/);
  assert.match(panel,/syncImportedMedia\(/);
});


test('no-URL media may reuse an exact owner-linked record, never title alone',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/const mediaEvidenceKey=\(item,owner\)=>/);
  assert.match(panel,/!owner\|\|!type\|\|!metadata\|\|!title\|\|!Number\.isFinite\(stamp\)/);
  assert.match(panel,/const existingOwnerMediaByKey=new Map\(\)/);
  assert.match(panel,/const storedEvidenceUid=evidenceKey\?existingOwnerMediaByKey\.get\(evidenceKey\):null/);
  assert.match(panel,/if\(storedEvidenceUid\)\{attach\(owner,storedEvidenceUid\);continue;\}/);
  assert.match(panel,/if\(evidenceKey\)existingOwnerMediaByKey\.set\(evidenceKey,String\(mediaId\)\)/);
});
