import './test-universal-archive-import.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {zipSync,strToU8} from 'fflate';
import {facebookBackupPlace,facebookBackupPostText,
  facebookBackupTimestamp,facebookArchiveGalaxyRow,facebookArchiveUid}
  from '../app/loc/facebook-backup-place.mjs';
import {detectZipArchiveSource,inspectPrivateArchive}
  from '../app/loc/private-archive-universal.mjs';
import {archiveGalaxyRow} from '../app/loc/archive-galaxy-row.mjs';
import {archiveGalaxyRows} from '../app/loc/archive-caption-rows.mjs';
import {dedupeIncomingImport,isUnchangedImportBeforeWrite} from '../app/loc/import-duplicate-check.mjs';
import {prepareImportPlaceAnchors,importedPlaceId} from '../app/loc/import-place-anchors.mjs';
import {extractFacebookGeoObjects,facebookPostCoordinate} from '../app/loc/archive-geo-objects.mjs';
import {ARCHIVE_MAX_BYTES,ARCHIVE_JSON_MAX_BYTES,importRowsFromJson} from '../app/loc/import-batch.mjs';
import {parseUniversalImportFile} from '../app/loc/universal-file-import.mjs';
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

test('real Facebook post object keeps media, source text, exact coordinates and place URL separate',async()=>{
 const enc=value=>[...new TextEncoder().encode(value)]
   .map(code=>String.fromCharCode(code)).join('');
 const mediaPath='your_facebook_activity/posts/media/test-photo.jpg';
 const placeUrl='https://www.facebook.com/pages/test-place/176138829094369';
 const post={
   timestamp:1656652590,
   attachments:[
     {data:[{media:{uri:mediaPath,creation_timestamp:1656652577,
       media_metadata:{photo_metadata:{exif_data:[{
         camera_make:'Apple',camera_model:'iPhone 11',taken_timestamp:1656652565
       }]}},title:enc('行動上傳'),description:enc('又漲了，唉')}}]},
     {data:[{place:{name:enc('測試地點'),coordinate:{
       latitude:25.05338,longitude:121.49086
     },address:enc('測試地址'),url:placeUrl}}]}
   ],
   data:[{post:enc('又漲了，唉')},{}],
   title:enc('新增了 1 張相片。')
 };
 const zipped=zipSync({
   'your_facebook_activity/posts/your_posts_1.json':strToU8(JSON.stringify([post])),
   [mediaPath]:strToU8('image')
 });
 const records=[],places=[];
 const summary=await inspectPrivateArchive(asFile('facebook-post.zip',zipped),{
   onRecord:record=>records.push(record),onGeoPlace:place=>places.push(place)
 });
 assert.equal(summary.acceptedRows,1);
 assert.equal(summary.geoPlaceObjects,1);
 assert.equal(records.length,1);
 assert.equal(records[0].attachments.length,1);
 assert.equal(records[0].attachments[0].uri,mediaPath);
 const article=archiveGalaxyRow(records[0]);
 assert.equal(article.content,'又漲了，唉');
 assert.equal(article.location,'測試地點');
 assert.deepEqual(article.__importCoordinates,{latitude:25.05338,longitude:121.49086});
 assert.equal(article.__importPlaceName,'測試地點');
 assert.equal(article.__importPlaceAddress,'測試地址');
 assert.equal(article.__importPlaceUrl,placeUrl,'來源地點 URL 不得變成文章網址');
 assert.equal(article.createtime,new Date(1656652590*1000).toISOString());
 assert.equal(article.url,undefined,'place URL is not a post permalink');
 assert.deepEqual(extractFacebookGeoObjects(post),[{
   location:'測試地點',__importCoordinates:{latitude:25.05338,longitude:121.49086},
   address:'測試地址',placeUrl
 }]);
 assert.equal(places[0].placeUrl,placeUrl);
 assert.equal(places[0].sourcePath,'your_facebook_activity/posts/your_posts_1.json');
});

test('Facebook posts never choose the first of two distinct place coordinates',()=>{
 const raw={timestamp:1720000000,data:[{post:'今天的旅程'}],attachments:[
   {data:[{place:{name:'A',coordinate:{latitude:25.05338,longitude:121.49086}}}]},
   {data:[{place:{name:'B',coordinate:{latitude:25.05,longitude:121.5}}}]}
 ]};
 assert.equal(extractFacebookGeoObjects(raw).length,2);
 assert.equal(facebookPostCoordinate(raw),null);
 const mapped=archiveGalaxyRow({platform:'facebook',kind:'post',key:'fb:ambiguous',
   text:'今天的旅程',raw,createdAt:'2024-07-03T09:46:40.000Z'});
 assert.equal(mapped.__importCoordinates,undefined);
});

test('photo EXIF GPS alone cannot become a Facebook check-in point',()=>{
 const raw={timestamp:1720000000,data:[{post:'相片'}],attachments:[
   {data:[{media:{media_metadata:{photo_metadata:{exif_data:[{
     latitude:25.05338,longitude:121.49086
   }]}}}}]}
 ]};
 assert.deepEqual(extractFacebookGeoObjects(raw),[]);
 assert.equal(facebookPostCoordinate(raw),null);
 const mapped=archiveGalaxyRow({platform:'facebook',kind:'post',key:'fb:exif-only',
   text:'相片',raw,createdAt:'2024-07-03T09:46:40.000Z'});
 assert.equal(mapped.__importCoordinates,undefined);
});

test('real Facebook ZIP to Galaxy to Trace anchor by place name is repeatable without duplicate writes',async()=>{
 const point={latitude:25.05338,longitude:121.49086};
 const rows=[
   {timestamp:1720000000,data:[{post:'第一篇'}],attachments:[{data:[{
     place:{name:'原始地點 A',coordinate:point}
   }]}]},
   {timestamp:1720000060,data:[{post:'第二篇'}],attachments:[{data:[{
     place:{name:'原始地點 B',coordinate:point}
   }]}]},
   {timestamp:1720000120,data:[{post:'第三篇'}],attachments:[{data:[{
     place:{name:'不同座標',coordinate:{latitude:25.05339,longitude:121.49086}}
   }]}]}
 ];
 const zipped=zipSync({'your_facebook_activity/posts/your_posts_1.json':strToU8(JSON.stringify(rows))});
 const articles=[];
 await inspectPrivateArchive(asFile('fb-reimport.zip',zipped),{
   onRecord:record=>articles.push(...archiveGalaxyRows(record).map(item=>item.row))
 });
 assert.equal(articles.length,3);
 assert.equal(dedupeIncomingImport(articles).unique.length,3);
 let inserted=0;
 const relation=table=>{
   assert.equal(table,'silver.lo3rwang_trace');
   return {
     select:()=>({eq:()=>({order:()=>({range:async()=>({
       data:[{uid:'AB12',title:'原始地點 A',address:[121.49086,25.05338],times:[]}],error:null
     })})})}),
     insert:()=>{inserted++;throw Error('不得自動新增 Trace 地點');}
   };
 };
 const resolved=await prepareImportPlaceAnchors(articles,{scopeId:'lo3rwang',relation,createMissing:false});
 assert.equal(resolved.reused,1);
 assert.equal(resolved.unmatchedCoordinates,2);
 assert.equal(inserted,0);
 assert.equal(importedPlaceId({incoming:articles[0],byName:resolved.byName,byCoordinate:resolved.byCoordinate}),'AB12');
 assert.equal(importedPlaceId({incoming:articles[1],byName:resolved.byName}),null,
   'same coordinates but a different name is a different place');
 assert.equal(importedPlaceId({incoming:articles[2],byName:resolved.byName}),null);
 const saved=new Map(articles.slice(0,2).map(row=>[row.uid,{...row,place_id:'AB12'}]));
 assert.equal(isUnchangedImportBeforeWrite(articles.slice(0,2),saved),true,
    'identical site, time and text are unchanged even without a native site_id');
  const identified=articles.slice(0,2).map((row,i)=>({...row,site_id:'fb-'+i}));
  const savedBySiteId=new Map(identified.map(row=>[row.uid,{...row,place_id:'AB12'}]));
  assert.equal(isUnchangedImportBeforeWrite(identified,savedBySiteId),true);
});

test('Facebook post coordinates survive without a LOC location string',async()=>{
 const post={timestamp:1656652590,data:[{post:'沒有地名的貼文'}],
   attachments:[{data:[{place:{coordinate:{latitude:25.05338,longitude:121.49086}}}]}]};
 const records=[],places=[];
 const file=asFile('your_facebook_activity/posts/your_posts_1.json',
   strToU8(JSON.stringify([post])));
 await inspectPrivateArchive(file,{onRecord:r=>records.push(r),onGeoPlace:p=>places.push(p)});
 assert.equal(records.length,1);
 assert.equal(places.length,1);
 const article=archiveGalaxyRow(records[0]);
 assert.equal(article.location,undefined);
 assert.deepEqual(article.__importCoordinates,{latitude:25.05338,longitude:121.49086});
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
   createtime:'2026-01-01T08:00:00Z',location:'板橋車站'
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
 assert.equal(posts[0].location,'2樓咖啡廳');
 assert.equal(posts[0].content,'到咖啡廳');
 assert.equal(posts[1].location,'B1 商店');
 assert.equal(posts[2].location,undefined);
 assert.ok(posts.every(row=>!row.content.includes('私訊內容')));
 assert.ok(posts.every(row=>!row.content.includes('fake image')));
});

test('management import maps Facebook JSON place into Galaxy and ZIP can actually import',()=>{
 const ui=src('app/loc/ManagementImportPanel.jsx');
 const parser=src('app/loc/private-archive-universal.mjs');
 assert.match(ui,/facebookBackupPlace\(row\)/);
 assert.match(ui,/facebookBackupPostText\(row\)/);
 assert.match(ui,/archiveGalaxyRows\(record\)/);
 // The shared ZIP adapter delegates Facebook posts to the same
 // place/time/UID conversion; the UI no longer calls it directly.
 const adapter=src('app/loc/archive-galaxy-row.mjs');
 assert.match(adapter,/facebookArchiveGalaxyRow\(record\)/);
 assert.match(ui,/await inspectPrivateArchive\(file,\{[\s\S]*?onRecord:record=>\{/);
 assert.match(ui,/setRows\(imported\)/);
 assert.match(ui,/setSource\(sourceNames\.length===1\?canonicalSource\(sourceNames\[0\]\):'Mixed'\)/);
 assert.match(parser,/sourcePlace=actualKind==='post'\?facebookBackupPlace\(item\):''/);
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
 const records=[],places=[];
 const summary=await inspectPrivateArchive(file,{
   onRecord:row=>records.push(row),onGeoPlace:place=>places.push(place)
 });
 assert.equal(records.length,0,'independent visit must not become a Galaxy post');
 assert.equal(summary.geoPlaceObjects,1);
 assert.equal(places.length,1);
 assert.equal(places[0].location,'某車站');
 assert.equal(places[0].__importCoordinates,null,'no coordinates were supplied');
 assert.equal(places[0].timestamp,1720000000);
});

test('independent Facebook tagged visit with explicit coordinates stays out of Galaxy',async()=>{
 const visit={fbid:'visit-with-geo',place:{name:'獨立打卡地點',coordinate:{
   latitude:25.05338,longitude:121.49086
 }},label_values:[{label:'造訪時間',timestamp_value:1720000000}]};
 const file=asFile('places_you_have_been_tagged_in.json',strToU8(JSON.stringify([visit])));
 const records=[],places=[];
 const summary=await inspectPrivateArchive(file,{
   onRecord:row=>records.push(row),onGeoPlace:place=>places.push(place)
 });
 assert.equal(summary.geoPlaceObjects,1);
 assert.equal(records.length,0);
 assert.deepEqual(places[0].__importCoordinates,{latitude:25.05338,longitude:121.49086});
 assert.equal(places[0].location,'獨立打卡地點');
 assert.equal(places[0].timestamp,1720000000);
});

test('independent visit keeps label_values place name when coordinate object has no name',async()=>{
 const visit={place:{coordinate:{latitude:25.05338,longitude:121.49086}},label_values:[
   {label:'造訪時間',timestamp_value:1720000000},
   {title:'地標',dict:[{dict:[{label:'名稱',value:'來源地標名稱'}]}]}
 ]};
 const records=[],places=[];
 await inspectPrivateArchive(asFile('places_you_have_been_tagged_in.json',
   strToU8(JSON.stringify([visit]))),{
   onRecord:row=>records.push(row),onGeoPlace:place=>places.push(place)
 });
 assert.equal(records.length,0);
 assert.equal(places.length,1);
 assert.equal(places[0].location,'來源地標名稱');
 assert.deepEqual(places[0].__importCoordinates,{latitude:25.05338,longitude:121.49086});
});

test('standalone Facebook tagged-visit JSON stays outside Galaxy posts',async()=>{
 const visit={label_values:[
   {label:'造訪時間',timestamp_value:1720000000},
   {title:'地標',dict:[{dict:[{label:'名稱',value:'測試車站'}]}]}
 ]};
 const records=[],places=[];
 const file=asFile('places_you_have_been_tagged_in.json',strToU8(JSON.stringify([visit])));
 const summary=await inspectPrivateArchive(file,{
   onRecord:record=>records.push(record),onGeoPlace:place=>places.push(place)
 });
 assert.equal(summary.geoPlaceObjects,1);
 assert.equal(records.length,0);
 assert.equal(places[0].location,'測試車站');
 assert.equal(places[0].timestamp,1720000000);
 const ui=src('app/loc/ManagementImportPanel.jsx');
 assert.match(ui,/isFacebookGeoJson/);
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
  assert.equal(row.location,'板橋車站');
  assert.equal(row.content,'今天來到板橋車站');
  assert.equal(row.title,'今天來到板橋車站');
  assert.equal(row.createtime,'2024-07-03T09:46:40.000Z');
  const alreadyCorrect=facebookArchiveGalaxyRow({
    platform:'facebook',kind:'post',key:'facebook:raw:visit:2',
    sourcePlace:'臺北車站',text:'正常繁體中文'
  });
  assert.equal(alreadyCorrect.location,'臺北車站');
  assert.equal(alreadyCorrect.content,'正常繁體中文');
});

test('ZIP parser accepts Facebook JSON exceeding former 10 MB entry cap',async()=>{
  const entries=Array.from({length:2600},(_,i)=>post(1720000000+i,'板橋車站','文字'+String(i)+'文'.repeat(1500)));
  const text=JSON.stringify(entries);
  assert.ok(new TextEncoder().encode(text).length>10_000_000);
  assert.ok(new TextEncoder().encode(text).length<ARCHIVE_JSON_MAX_BYTES);
  const zip=zipSync({'archive/your_facebook_activity/posts/your_posts_1.json':strToU8(text)});
  const rows=[];
  const result=await inspectPrivateArchive(asFile('facebook-large-json.zip',zip),{
    onRecord:row=>{const mapped=facebookArchiveGalaxyRow(row);if(mapped)rows.push(mapped);}
  });
  assert.equal(result.acceptedRows,entries.length);
  assert.equal(rows.length,entries.length);
  assert.equal(rows[0].location,'板橋車站');
});

test('large Facebook ZIP size cap is 1 GiB and checked before reading any bytes',async()=>{
  assert.equal(ARCHIVE_MAX_BYTES,1024*1024*1024);
  assert.equal(ARCHIVE_JSON_MAX_BYTES,50*1024*1024);
  let touched=false;
  const file={size:ARCHIVE_MAX_BYTES+1,slice(){touched=true;throw Error('read forbidden')}};
  await assert.rejects(detectZipArchiveSource(file),/1024 MiB/);
  await assert.rejects(inspectPrivateArchive(file,{onRecord:()=>{}}),/1024 MiB/);
  assert.equal(touched,false);
  const underLimit={size:700*1024*1024,slice(){
    return {arrayBuffer:async()=>Uint8Array.of(0,0,0,0).buffer};
  }};
  await assert.rejects(detectZipArchiveSource(underLimit),/不是有效的 ZIP 標頭/);
});

test('standalone JSON over 50 MiB is rejected before loading the whole file',async()=>{
  let touched=false;
  const file={name:'facebook.json',size:ARCHIVE_JSON_MAX_BYTES+1,
    arrayBuffer(){touched=true;throw Error('read forbidden')},
    text(){touched=true;throw Error('read forbidden')}};
  await assert.rejects(parseUniversalImportFile(file),/50 MiB/);
  assert.equal(touched,false);
  const engine=src('app/loc/private-archive-universal.mjs');
  assert.match(engine,/MAX_EXTRACTED=1024\*1024\*1024/);
   assert.match(engine,/if\(extractedBytes>MAX_EXTRACTED\)/);
  assert.match(engine,/MAX_STRUCTURED_DOCUMENT=ARCHIVE_JSON_MAX_BYTES/);
});
