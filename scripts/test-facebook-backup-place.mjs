import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {zipSync,strToU8} from 'fflate';
import {facebookBackupPlace,facebookBackupPostText,
  facebookBackupTimestamp,facebookArchiveGalaxyRow,facebookArchiveUid}
  from '../app/loc/facebook-backup-place.mjs';
import {detectZipArchiveSource,inspectPrivateArchive}
  from '../app/loc/private-archive-universal.mjs';
import {importRowsFromJson} from '../app/loc/import-batch.mjs';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const asFile=(name,bytes)=>{
  const data=new Uint8Array(bytes);
  const chunk=(start=0,end=data.length)=>data.slice(start,end);
  return {name,size:data.byteLength,
    slice(start,end){return {arrayBuffer:async()=>chunk(start,end).buffer};},
    arrayBuffer:async()=>data.buffer};
};

const post=(time,place,text='')=>({
  timestamp:time,
  data:text?[{post:text}]:[],
  attachments:[{data:[{place:{name:place}}]}]
});

test('Facebook nested check-in location is extracted without looking at photos or EXIF',()=>{
 const a=post(1720000000,'新北市板橋區文化路一段');
 assert.equal(facebookBackupPlace(a),'新北市板橋區文化路一段');
 assert.equal(facebookBackupPostText(a),'');
 assert.equal(facebookBackupTimestamp(a),1720000000);
 assert.equal(facebookBackupPlace({title:'在台北吃飯',data:[{post:'晚餐'}]}),'');
 assert.equal(facebookBackupPlace({place:{name:'板橋車站'}}),'板橋車站');
 assert.equal(facebookBackupPlace({location:{name:'中山站'}}),'中山站');
 assert.equal(facebookBackupPlace({place:{name:'A'},attachments:[{data:[{place:{name:'B'}}]}]}),'A');
 assert.equal(facebookBackupPlace({attachments:[{data:[{place:{name:'A'}},{place:{name:'B'}}]}]}),'');
});

test('textless check-ins retain place, stable article UID and time',()=>{
 const row=facebookArchiveGalaxyRow({
   platform:'facebook',kind:'post',key:'facebook:post:source:unique',
   sourcePlace:'板橋車站',text:'',createdAt:'2026-01-01T08:00:00Z'
 });
 assert.deepEqual(row,{
   uid:facebookArchiveUid('facebook:post:source:unique'),
   title:'Facebook 打卡：板橋車站',
   content:'Facebook 打卡地點：板橋車站',
   createtime:'2026-01-01T08:00:00Z',source_place:'板橋車站'
 });
 assert.match(row.uid,/^[A-Z0-9]{8}$/);
 assert.equal(facebookArchiveUid('facebook:post:source:unique'),row.uid);
 assert.notEqual(facebookArchiveUid('facebook:post:source:different'),row.uid);
 assert.equal(facebookArchiveGalaxyRow({platform:'messenger',kind:'message',key:'m',text:'hi'}),null);
});

test('plain Facebook JSON recognizes posts and status updates without media files',()=>{
 const rows=importRowsFromJson({status_updates:[post(1720000000,'台南車站','到站')]});
 assert.equal(rows.length,1);
 assert.equal(facebookBackupPostText(rows[0]),'到站');
 assert.equal(facebookBackupPlace(rows[0]),'台南車站');
});

test('ZIP Takeout streams Facebook text, ignores Messenger and image content',async()=>{
 const zip=zipSync({
  'archive/your_facebook_activity/posts/your_posts_1.json':strToU8(JSON.stringify([
    post(1720000000,'2樓咖啡廳','到咖啡廳'),
    post(1720000010,'B1 商店'),
    {timestamp:1720000020,data:[{post:'沒有打卡資訊'}]}
  ])),
  'archive/facebook/messages/inbox/message_1.json':strToU8(JSON.stringify({
    participants:[{name:'某人'}],messages:[{sender_name:'某人',timestamp_ms:1720000030000,content:'私訊內容'}]
  })),
  'archive/photos/example.jpg':strToU8('fake image data')
 });
 const file=asFile('facebook-backup.zip',zip);
 const detected=await detectZipArchiveSource(file);
 assert.ok(detected.sources.includes('facebook'));
 const records=[];
 await inspectPrivateArchive(file,{onRecord:row=>records.push(row)});
 const posts=records.map(facebookArchiveGalaxyRow).filter(Boolean);
 assert.equal(posts.length,3);
 assert.equal(posts[0].source_place,'2樓咖啡廳');
 assert.equal(posts[0].content,'到咖啡廳');
 assert.equal(posts[1].source_place,'B1 商店');
 assert.equal(posts[2].source_place,undefined);
 assert.ok(posts.every(row=>!row.content.includes('私訊內容')));
 assert.ok(posts.every(row=>!row.content.includes('fake image')));
});

test('management import maps Facebook JSON place into Galaxy and ZIP can actually import',()=>{
 const ui=src('app/loc/ManagementImportPanel.jsx');
 const parser=src('app/loc/private-archive-universal.mjs');
 assert.match(ui,/facebookBackupPlace\(row\)/);
 assert.match(ui,/facebookBackupPostText\(row\)/);
 assert.match(ui,/facebookArchiveGalaxyRow\(record\)/);
 assert.match(ui,/await inspectPrivateArchive\(file,\{onRecord:/);
 assert.match(ui,/setRows\(imported\)/);
 assert.match(ui,/setSource\('Facebook'\)/);
 assert.match(parser,/sourcePlace=platform==='facebook'/);
 assert.match(src('app/loc/archive-source-signatures.mjs'),/your_facebook_activity/);
});

test('Facebook nested visited-place ZIP retains explicit visit time and location',async()=>{
 const enc=value=>[...new TextEncoder().encode(value)]
   .map(code=>String.fromCharCode(code)).join('');
 const visit={fbid:'tagged-visit-01',label_values:[
   {label:enc('造訪時間'),timestamp_value:1720000000},
   {title:enc('地標'),dict:[{dict:[{label:enc('名稱'),value:enc('某車站')}]}]}
 ]};
 const zipped=zipSync({
   'archive/your_facebook_activity/places_you_have_been_tagged_in.json':
     strToU8(JSON.stringify([visit]))
 });
 const file=asFile('fb-places.zip',zipped);
 const detection=await detectZipArchiveSource(file);
 assert.ok(detection.sources.includes('facebook'));
 const records=[];
 await inspectPrivateArchive(file,{onRecord:row=>records.push(row)});
 const imported=records.map(facebookArchiveGalaxyRow).filter(Boolean);
 assert.equal(imported.length,1);
 assert.equal(imported[0].source_place,enc('某車站'));
 assert.equal(imported[0].createtime,'2024-07-03T09:46:40.000Z');
});

test('Meta ZIP decoded place and author text survive Galaxy import without mojibake',()=>{
  // Some Meta exports encode UTF-8 bytes as Latin-1 JS characters.
  const encoded=value=>[...new TextEncoder().encode(value)]
    .map(n=>String.fromCharCode(n)).join('');
  const row=facebookArchiveGalaxyRow({
    platform:'facebook',kind:'post',key:'facebook:raw:visit:1',
    sourcePlace:encoded('板橋車站'),text:encoded('今天來到板橋車站'),
    createdAt:'2024-07-03T09:46:40.000Z'
  });
  assert.equal(row.source_place,'板橋車站');
  assert.equal(row.content,'今天來到板橋車站');
  assert.equal(row.title,'今天來到板橋車站');
  assert.equal(row.createtime,'2024-07-03T09:46:40.000Z');
  const alreadyCorrect=facebookArchiveGalaxyRow({
    platform:'facebook',kind:'post',key:'facebook:raw:visit:2',
    sourcePlace:'臺北車站',text:'正常繁體中文'
  });
  assert.equal(alreadyCorrect.source_place,'臺北車站');
  assert.equal(alreadyCorrect.content,'正常繁體中文');
});
