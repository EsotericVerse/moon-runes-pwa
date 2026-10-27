import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveAttachmentReferences,archiveMediaUuid,createArchiveEvidenceCollector,prepareArchiveMedia} from '../app/loc/archive-media-evidence.mjs';

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
  assert.equal(plan.media.length,1);
  assert.equal(plan.media[0].url,null);
  assert.equal(plan.media[0].createtime,null);
  assert.equal(plan.exif.length,1);
  assert.equal(plan.exif[0].latitude,25.03);
});
test('Only an unambiguous full relative path can associate an article with ZIP media',()=>{
  const collector=createArchiveEvidenceCollector();
  collector.onMediaEntry({path:'a/media/photo.jpg'});
  collector.onMediaEntry({path:'b/media/photo.jpg'});
  collector.onRecord({platform:'threads',attachments:[{uri:'media/photo.jpg'}]},'AAAA0000');
  const rows=collector.rows({scopeId:'local',archiveName:'ambiguous.zip',archiveSize:31});
  assert.equal(rows.filter(v=>v.found_in_zip).length,2);
  assert.equal(rows.filter(v=>v.found_in_zip).every(v=>v.galaxy_uids.length===0),true);
});
test('Archive media UUID is stable for idempotent re-import',()=>{
  const a=archiveMediaUuid('lo3rwang','fb.zip:100','facebook/img/a.jpg');
  assert.match(a,/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
  assert.equal(a,archiveMediaUuid('lo3rwang','fb.zip:100','facebook/img/a.jpg'));
  assert.notEqual(a,archiveMediaUuid('lo3rwang','fb.zip:100','facebook/img/b.jpg'));
});
