import assert from 'node:assert/strict';
import {test} from 'node:test';
import {zipSync,strToU8} from 'fflate';
import {inspectPrivateArchive} from '../app/loc/private-archive-universal.mjs';

function file(bytes,name='without-extension'){
  const data=bytes instanceof Uint8Array?bytes:strToU8(bytes);
  return {size:data.length,name,slice(start,end){const b=data.slice(start,end);return {async arrayBuffer(){return b.buffer;}};}};
}
const x=items=>'window.YTD.tweet.part0 = '+JSON.stringify(items)+';';
async function inspect(input){
  const records=[];
  const summary=await inspectPrivateArchive(input,{onRecord:item=>records.push(item)});
  return {records,summary};
}

test('mixed archive imports X tweets, Facebook posts and Messenger messages without guessing names',async()=>{
  const archive=zipSync({
    'twitter/data/tweets.js':strToU8(x([{tweet:{id_str:'11',full_text:'X 正文 🌙',created_at:'Mon Oct 09 15:26:46 +0000 2023'}}])),
    'facebook/posts/your_posts_1.json':strToU8(JSON.stringify([{timestamp:1700000000,data:[{post:'FB 繁中貼文'}]}])),
    'facebook/messages/inbox/friend_123/message_1.json':strToU8(JSON.stringify({
      participants:[{name:'友人'}],
      messages:[{sender_name:'友人',timestamp_ms:1700000000000,content:'Messenger 你好'},
      {sender_name:'自己',timestamp_ms:1700000000500,content:'回覆訊息'}]
    })),
    'facebook/posts/photo.png':new Uint8Array([137,80,78,71])
  });
  const {records,summary}=await inspect(file(archive,'backup'));
  assert.equal(summary.acceptedRows,4);
  assert.equal(records.length,4);
  assert.equal(records.find(r=>r.platform==='x')?.text,'X 正文 🌙');
  assert.equal(records.find(r=>r.platform==='facebook')?.text,'FB 繁中貼文');
  const msg=records.filter(r=>r.platform==='messenger');
  assert.equal(msg.length,2);
  assert.equal(msg[0].sender,'友人');
  assert.equal(msg[0].text,'Messenger 你好');
  assert.equal(summary.mediaFiles,1);
});

test('Instagram posts and DMs and Threads variants import with separate platform identity',async()=>{
  const archive=zipSync({
    'instagram/your_instagram_activity/media/posts_1.json':strToU8(JSON.stringify({ig_posts:[
      {title:'IG 圖文',creation_timestamp:1700000000,media:[{uri:'media/post.jpg'}]}
    ]})),
    'instagram/your_instagram_activity/messages/inbox/bob/message_1.json':strToU8(JSON.stringify({
      messages:[{sender_name:'bob',timestamp_ms:1700000000000,content:'IG 私訊 😀'}]
    })),
    'threads/threads_posts.json':strToU8(JSON.stringify({threads:[
      {id:'444',text:'Threads 文章',timestamp:'2024-01-01T00:00:00+0000'}
    ]}))
  });
  const {records,summary}=await inspect(file(archive,'meta-backup.zip'));
  assert.equal(summary.acceptedRows,3);
  assert.deepEqual(records.map(r=>r.platform).sort(),['instagram','instagram','threads']);
  assert.equal(records.find(r=>r.text==='IG 私訊 😀')?.kind,'message');
});

test('supports general JSON arrays without extension and preserves original keys',async()=>{
  const payload=JSON.stringify([{id:'123',text:'陌生格式原文',timestamp:1700000000,unknown_key:'keep'}]);
  const {records}=await inspect(file(payload));
  assert.equal(records[0].text,'陌生格式原文');
  assert.equal(records[0].raw.unknown_key,'keep');
});

test('unknown structured JSON remains explicitly unmapped, not falsely normalized',async()=>{
  const payload=zipSync({'meta/unknown.json':strToU8(JSON.stringify({obscure:[{data:'not-a-post'}]})),
    'facebook/posts/your_posts_1.json':strToU8(JSON.stringify([{timestamp:1700000000,data:[{post:'real post'}]}]))});
  const {records,summary}=await inspect(file(payload,'bundle.zip'));
  assert.equal(records.length,2);
  const unknown=records.find(r=>r.sourcePath==='meta/unknown.json');
  assert.equal(unknown?.kind,'unmapped');
  assert.equal(unknown?.raw.data,'not-a-post');
  assert.equal(summary.unmappedRows,1);
});

test('binary files are never decoded as private messages',async()=>{
  const mixed=zipSync({
    'instagram/messages/inbox/a/photo.jpg':new Uint8Array([0xff,0xd8,0xff,0]),
    'facebook/posts/your_posts_1.json':strToU8(JSON.stringify([{timestamp:1700000000,data:[{post:'text'}]}]))
  });
  const {records,summary}=await inspect(file(mixed,'Meta.zip'));
  assert.equal(records.length,1);assert.equal(summary.mediaFiles,1);
});

test('filename-free plain text is preserved as text document',async()=>{
  const {records}=await inspect(file('沒有副檔名的繁體中文歷史文章'));
  assert.equal(records.length,1);
  assert.equal(records[0].kind,'document');
  assert.equal(records[0].text,'沒有副檔名的繁體中文歷史文章');
});

test('invalid UTF-8 refuses automatic replacement characters',async()=>{
  const contents=zipSync({'facebook/posts/your_posts_1.json':new Uint8Array([91,123,34,255,34,125,93])});
  await assert.rejects(()=>inspect(file(contents,'bad.zip')));
});

test('Meta Threads and Instagram JSON shape variations preserve raw information',async()=>{
  const archive=zipSync({
    'threads/threads_and_replies/text_posts.json':strToU8(JSON.stringify({
      text_post_app_text_posts:[
        {id:'thread-one',text:'Threads 不同欄位結構',timestamp:'2026-10-09T00:00:00Z'}
      ]
    })),
    'facebook/posts/your_uncategorized_photos.json':strToU8(JSON.stringify({
      other_photos_v2:[
        {uri:'media/photos/old_picture.jpg',creation_timestamp:1440000000}
      ]
    })),
    'instagram/your_instagram_activity/saved/saved_posts.json':strToU8(JSON.stringify({
      unexpected_saved_posts:[
        {uri:'saved-item/123',creation_timestamp:1440000000}
      ]
    }))
  });
  const {records,summary}=await inspect(file(archive,'mydata.zip'));
  assert.equal(records.length,3);
  assert.equal(records.find(r=>r.platform==='threads')?.text,'Threads 不同欄位結構');
  assert.equal(records.find(r=>r.kind==='media')?.attachments[0].uri,'media/photos/old_picture.jpg');
  assert.equal(records.find(r=>r.sourcePath.includes('saved_posts'))?.raw.uri,'saved-item/123');
  assert.equal(summary.unrecognizedFiles.length,0);
});

test('novel Meta metadata schema is marked unmapped and raw values are retained',async()=>{
  const archive=zipSync({
    'facebook/other/unknown_section.json':strToU8(JSON.stringify({unseen_items:[
      {alpha:'preserved',omega:{value:23}}
    ]}))
  });
  const {records,summary}=await inspect(file(archive,'mystery.zip'));
  assert.equal(records[0].kind,'unmapped');
  assert.equal(records[0].raw.omega.value,23);
  assert.equal(summary.unmappedRows,1);
});
