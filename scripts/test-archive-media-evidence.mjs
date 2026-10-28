import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveAttachmentReferences,archiveMediaUid,createArchiveEvidenceCollector,prepareArchiveMedia} from '../app/loc/archive-media-evidence.mjs';

test('Facebook, Threads, Instagram nested attachment URLs are preserved',()=>{
  const samples=[
    {platform:'facebook',attachments:[{data:[{media:{uri:'facebook/img/f.jpg',
      url:'https://example.test/f.jpg',type:'image'}}]}]},
    {platform:'threads',photos:[{uri:'threads/photos/t.jpg',
      url:'https://example.test/t.jpg',media_type:'image'}]},
    {platform:'instagram',media:[{uri:'instagram/posts/i.jpg',
      url:'https://example.test/i.jpg',type:'image'}]}
  ];
  const collector=createArchiveEvidenceCollector();
  samples.forEach((row,index)=>{
    const attachments=archiveAttachmentReferences(row);
    assert.equal(attachments.length,1);
    collector.onRecord({...row,attachments,sourcePath:row.platform+'/posts.json'},'AAAA000'+index);
    collector.onMediaEntry({path:attachments[0].uri});
    collector.onExif({path:attachments[0].uri,metadata:{
      latitude:25.03,longitude:121.52,cameraLocalTime:'2020:01:02 03:04:05'
    }});
  });
  const result=collector.rows({scopeId:'lo3rwang',archiveName:'meta.zip',archiveSize:42});
  const plan=prepareArchiveMedia(result,new Set(['AAAA0000','AAAA0001','AAAA0002']));
  assert.equal(result.length,3);
  assert.equal(plan.media.length,3);
  assert.equal(plan.exif.length,3);
  assert.deepEqual(new Set(plan.exif.map(v=>v.platform)),new Set(['facebook','threads','instagram']));
  assert.equal(plan.media.every(v=>v.url?.startsWith('https://example.test/')),true);
  assert.equal(plan.media.every(v=>!Object.hasOwn(v,'latitude')&&!Object.hasOwn(v,'longitude')),true);
  assert.equal(plan.exif.every(v=>v.latitude===25.03&&v.longitude===121.52),true);
});
test('EXIF-only local ZIP photograph is kept without inventing a public URL or post time',()=>{
  const collector=createArchiveEvidenceCollector();
  collector.onMediaEntry({path:'photos/only.jpg'});
  collector.onExif({path:'photos/only.jpg',metadata:{latitude:25.03,longitude:121.52}});
  const rows=collector.rows({scopeId:'local',archiveName:'photos.zip',archiveSize:99});
  const plan=prepareArchiveMedia(rows,new Set());
  assert.equal(plan.media.length,0);
  assert.equal(plan.mediaLinks.length,0);
  assert.equal(plan.exif.length,1);
  assert.equal(plan.exif[0].media_uid,null);
  assert.equal(plan.exif[0].latitude,25.03);
});
test('Only an unambiguous full relative path can associate an article with ZIP media',()=>{
  const collector=createArchiveEvidenceCollector();
  collector.onMediaEntry({path:'a/media/photo.jpg'});
  collector.onMediaEntry({path:'b/media/photo.jpg'});
  collector.onExif({path:'a/media/photo.jpg',metadata:{latitude:25.001,longitude:121.5}});
  collector.onExif({path:'b/media/photo.jpg',metadata:{latitude:25.002,longitude:121.5}});
  collector.onRecord({platform:'threads',attachments:[{uri:'media/photo.jpg'}]},'AAAA0000');
  const rows=collector.rows({scopeId:'local',archiveName:'ambiguous.zip',archiveSize:31});
  assert.equal(rows.filter(v=>v.found_in_zip).length,2);
  assert.equal(rows.filter(v=>v.found_in_zip).every(v=>v.galaxy_uids.length===0),true);
});
test('An EXIF image with no public URL is GPS-only, not a fake Galaxy Media row',()=>{
  const collector=createArchiveEvidenceCollector();
  collector.onMediaEntry({path:'facebook/photos/private.jpg'});
  collector.onRecord({platform:'facebook',attachments:[{uri:'facebook/photos/private.jpg'}]},'AAAA0001');
  collector.onExif({path:'facebook/photos/private.jpg',metadata:{
    latitude:25.033,longitude:121.519,cameraLocalTime:'2020:04:05 06:07:08'
  }});
  const entries=collector.rows({scopeId:'lo3rwang',archiveName:'fb.zip',archiveSize:1024});
  const plan=prepareArchiveMedia(entries,new Set(['AAAA0001']));
  assert.equal(plan.media.length,0);
  assert.equal(plan.mediaLinks.length,0);
  assert.equal(plan.exif.length,1);
  assert.equal(plan.exif[0].media_uid,null);
  assert.equal(plan.exif[0].latitude,25.033);
});
test('ZIP images with neither URL nor EXIF are not imported as media',()=>{
  const collector=createArchiveEvidenceCollector();
  collector.onMediaEntry({path:'instagram/photos/empty.jpg'});
  const rows=collector.rows({scopeId:'lo3rwang',archiveName:'ig.zip',archiveSize:56});
  const plan=prepareArchiveMedia(rows,new Set());
  assert.equal(rows.length,0);
  assert.equal(plan.media.length,0);
  assert.equal(plan.exif.length,0);
});
test('Archive media UID is stable for idempotent re-import',()=>{
  const a=archiveMediaUid('lo3rwang','fb.zip:100','facebook/img/a.jpg');
  assert.match(a,/^[A-Z0-9]{8}$/);
  assert.equal(a,archiveMediaUid('lo3rwang','fb.zip:100','facebook/img/a.jpg'));
  assert.notEqual(a,archiveMediaUid('lo3rwang','fb.zip:100','facebook/img/b.jpg'));
});

test('One ZIP image shared by two articles makes one media row and two links',()=>{
  const collector=createArchiveEvidenceCollector();
  collector.onMediaEntry({path:'threads/media/common.jpg'});
  for(const uid of ['AAAA0001','AAAA0002'])collector.onRecord({
    platform:'threads',attachments:[{uri:'threads/media/common.jpg',url:'https://cdn.example.test/common.jpg'}]
  },uid);
  collector.onExif({path:'threads/media/common.jpg',metadata:{latitude:25.1,longitude:121.5}});
  const evidence=collector.rows({scopeId:'lo3rwang',archiveName:'threads.zip',archiveSize:100});
  const plan=prepareArchiveMedia(evidence,new Set(['AAAA0001','AAAA0002']));
  assert.equal(plan.media.length,1);
  assert.equal(plan.mediaLinks.length,2);
  assert.equal(new Set(plan.mediaLinks.map(v=>v.uid)).size,2);
  assert.equal(new Set(plan.mediaLinks.map(v=>v.media_uid)).size,1);
  assert.equal(plan.exif.length,1);
});
