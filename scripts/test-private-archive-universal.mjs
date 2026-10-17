import assert from 'node:assert/strict';
import {test} from 'node:test';
import {zipSync,strToU8} from 'fflate';
import {inspectPrivateArchive,detectZipArchiveSource} from '../app/loc/private-archive-universal.mjs';

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


test('ZIP source detection verifies ChatGPT conversation tree, without importing rows',async()=>{
  const archive=zipSync({'export/conversations.json':strToU8(JSON.stringify([{
    title:'對話測試',create_time:1720000000,
    mapping:{'root':{id:'root',message:{author:{role:'user'},content:{parts:['你好']}}}}
  }])),'export/user.json':strToU8('{"id":"user"}')});
  const result=await detectZipArchiveSource(file(archive,'chatgpt-export.zip'));
  assert.equal(result.kind,'chatgpt');
  assert.deepEqual(result.sources,['chatgpt']);
  assert.equal(result.confidence,3);
  assert.equal(result.evidence[0].verified,true);
});

test('ZIP detection distinguishes Instagram, Threads, Facebook and X using payload signatures',async()=>{
  const cases=[
    ['instagram','instagram/your_instagram_activity/media/posts_1.json',JSON.stringify({ig_posts:[{title:'圖文'}]})],
    ['threads','threads/threads_and_replies/text_posts.json',JSON.stringify({text_post_app_text_posts:[{text:'貼文'}]})],
    ['facebook','facebook/posts/your_posts_1.json',JSON.stringify({status_updates:[{data:[{post:'文字'}]}]})],
    ['x','twitter/data/tweets.js','window.YTD.tweet.part0 = '+JSON.stringify([{tweet:{id_str:'1',full_text:'hello'}}])+';']
  ];
  for(const [kind,path,payload] of cases){
    const archive=zipSync({[path]:strToU8(payload)});
    const result=await detectZipArchiveSource(file(archive,'export.zip'));
    assert.equal(result.kind,kind);
    assert.equal(result.confidence,3);
  }
});

test('ZIP detection reports mixed origins, and does not guess unknown archives',async()=>{
  const mixed=zipSync({
    'export/conversations.json':strToU8(JSON.stringify([{title:'Chat',create_time:1700000000,mapping:{}}])),
    'threads/posts.json':strToU8(JSON.stringify({text_post_app_text_posts:[{text:'Threads'}]}))
  });
  const mixedResult=await detectZipArchiveSource(file(mixed,'backup.zip'));
  assert.equal(mixedResult.kind,'mixed');
  assert.deepEqual(mixedResult.sources,['chatgpt','threads']);
  assert.equal(mixedResult.confidence,3);
  const unknown=await detectZipArchiveSource(file(zipSync({'notes/readme.txt':strToU8('hello')}),'unknown.zip'));
  assert.equal(unknown.kind,'unknown');
  assert.deepEqual(unknown.sources,[]);
  await assert.rejects(()=>detectZipArchiveSource(file('not a zip','fake.zip')),/ZIP/);
});

test('generic conversations.json is unknown, rather than misidentified as ChatGPT',async()=>{
  const archive=zipSync({'conversations.json':strToU8('[{"title":"not necessarily ChatGPT"}]')});
  const result=await detectZipArchiveSource(file(archive,'backup.zip'));
  assert.equal(result.kind,'unknown');
  assert.equal(result.confidence,0);
});


test('Claude conversations.json does not masquerade as ChatGPT',async()=>{
  const payload=JSON.stringify([{uuid:'abc',name:'Claude chat',chat_messages:[
    {uuid:'msg',sender:'human',created_at:'2026-01-01T00:00:00Z',text:'hello'}
  ]}]);
  const result=await detectZipArchiveSource(file(zipSync({'conversations.json':strToU8(payload)}),'backup.zip'));
  assert.equal(result.kind,'claude');
  assert.equal(result.confidence,3);
  assert.equal(result.evidence[0].verified,true);
});

test('major AI and social archives have isolated, read-only identification',async()=>{
  const cases=[
    ['gemini','Takeout/My Activity/Gemini Apps/MyActivity.json','[{"title":"Asked Gemini","time":"2026-01-01"}]',3],
    ['grok','xai/grok/conversation.json','{"messages":[]}',1],
    ['copilot','Microsoft/Copilot/activity.csv','Prompt,Response\nHello,Hi',3],
    ['perplexity','perplexity/conversations.json','[{"id":"1"}]',1],
    ['meta-ai','meta-ai/activity.json','{"items":[]}',1],
    ['whatsapp','_chat.txt','[12/10/2026, 12:34] Alice: Hello\n[12/10/2026, 12:35] Bob: Hi',3],
    ['telegram','Telegram/ChatExport/result.json',JSON.stringify({
      personal_information:{user_id:1},chats:{list:[{type:'personal_chat',name:'A'}]}
    }),3],
    ['discord','Discord/messages/123/messages.json','[{"ID":"1","Timestamp":"2026-01-01","Contents":"hello"}]',3],
    ['tiktok','TikTok/user_data.json','{"Activity":{}}',1],
    ['reddit','reddit/comments.csv','subreddit,permalink,body\nexample,https://reddit.com/r/example,hello',3],
    ['linkedin','linkedin/Connections.csv','First Name,Last Name,Company\nA,B,C',3],
    ['youtube','Takeout/YouTube and YouTube Music/history/watch-history.json','[]',3],
    ['google-takeout','Takeout/Contacts/All Contacts.vcf','BEGIN:VCARD\nEND:VCARD',1]
  ];
  for(const [source,path,payload,confidence] of cases){
    const result=await detectZipArchiveSource(file(zipSync({[path]:strToU8(payload)}),'backup.zip'));
    assert.equal(result.kind,source,'source: '+source);
    assert.equal(result.confidence,confidence,'confidence: '+source);
  }
});

test('Google Takeout containing Gemini and YouTube retains products, not a fake extra origin',async()=>{
  const archive=zipSync({
    'Takeout/My Activity/Gemini Apps/MyActivity.json':strToU8('[{"title":"Gemini"}]'),
    'Takeout/YouTube and YouTube Music/history/watch-history.json':strToU8('[]')
  });
  const result=await detectZipArchiveSource(file(archive,'takeout.zip'));
  assert.deepEqual(result.sources,['gemini','youtube']);
  assert.equal(result.kind,'mixed');
  assert.equal(result.confidence,3);
});

test('multi-vendor ZIP retains both identities with independent confidence',async()=>{
  const archive=zipSync({
    'claude/conversations.json':strToU8(JSON.stringify([{
      uuid:'abc',name:'chat',chat_messages:[{sender:'human',created_at:'2026-01-01'}]
    }])),
    'perplexity/data.json':strToU8('[]')
  });
  const result=await detectZipArchiveSource(file(archive,'mixed.zip'));
  assert.deepEqual(result.sources,['claude','perplexity']);
  assert.equal(result.confidence,1);
  assert.equal(result.evidence.find(x=>x.source==='claude')?.verified,true);
  assert.equal(result.evidence.find(x=>x.source==='perplexity')?.verified,false);
});


test('Slack official JSON archive is identified by combined manifest, not one generic file',async()=>{
  const archive=zipSync({
    'channels.json':strToU8('[]'),
    'users.json':strToU8('[]'),
    'integration_logs.json':strToU8('[]'),
    'general/2026-10-01.json':strToU8('[{"type":"message","text":"hello"}]')
  });
  const result=await detectZipArchiveSource(file(archive,'workspace.zip'));
  assert.equal(result.kind,'slack');
  assert.equal(result.confidence,3);
  const decoy=await detectZipArchiveSource(file(zipSync({
    'channels.json':strToU8('[]'),'messages.json':strToU8('[]')
  }),'decoy.zip'));
  assert.equal(decoy.kind,'unknown');
});

test('LINE, Teams, Snapchat and other major export sources remain separate',async()=>{
  const cases=[
    ['line','Chat history in -Friend-.txt','2026.10.17 Saturday\n21:30 Alice Hello LINE',3],
    ['teams','Microsoft-Teams/messages.json',JSON.stringify([{
      createdDateTime:'2026-01-01T00:00:00Z',body:{content:'Hello'},chatId:'19:abc'
    }]),3],
    ['snapchat','json/memories_history.json',JSON.stringify([{
      Date:'2026-01-01', 'Media Type':'Image', 'Download Link':''
    }]),3],
    ['wechat','WeChat/export/data.json','[]',1],
    ['pinterest','Pinterest/data.json','[]',1]
  ];
  for(const [name,path,payload,confidence] of cases){
    const result=await detectZipArchiveSource(file(zipSync({[path]:strToU8(payload)}),'data.zip'));
    assert.equal(result.kind,name,name);
    assert.equal(result.confidence,confidence,name);
  }
});
