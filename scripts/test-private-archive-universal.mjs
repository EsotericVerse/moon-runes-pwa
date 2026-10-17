import assert from 'node:assert/strict';
import {test} from 'node:test';
import {zipSync,strToU8} from 'fflate';
import {inspectPrivateArchive,detectZipArchiveSource} from '../app/loc/private-archive-universal.mjs';
import {inspectArchiveEntryStructure} from '../app/loc/archive-structure-inspector.mjs';
import {createArchiveCompletenessAudit} from '../app/loc/archive-completeness-audit.mjs';

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

test('Threads records without native IDs share an identity when only line breaks differ',async()=>{
  const {records}=await inspect(file(JSON.stringify({threads:[
    {text:'同一篇\nThreads文章',timestamp:'2026-10-09T00:00:00Z'},
    {text:'同一篇Threads文章',timestamp:'2026-10-09T00:00:00Z'}
  ]}),'threads/threads_posts.json'));
  assert.equal(records.length,2);
  assert.equal(records[0].key,records[1].key);
  assert.notEqual(records[0].text,records[1].text,'Original text stays intact');
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


test('vendor-neutral profiler recognizes equivalent conversations regardless of provider label',()=>{
  const cases=[
    [{messages:[{sender:'Alice',created_at:'2026-01-01',text:'hello'}]},'message-list'],
    [{chat_messages:[{role:'human',timestamp:123,content:'hello'}]},'message-list'],
    [{mapping:{a:{message:{author:{role:'user'},content:{parts:['hello']}},parent:null,children:[]}}},'conversation-tree'],
    [{unbranded_items:[{sender:'a',message:'hello',createdAt:'2026-01-01'}]},'structured-records']
  ];
  for(const [payload,expected] of cases){
    const info=inspectArchiveEntryStructure('unknown/source.json',JSON.stringify(payload));
    assert.ok(info.layouts.includes(expected),JSON.stringify(info));
  }
});

test('ZIP detection produces a shared structural summary without changing platform semantics',async()=>{
  const archive=zipSync({
    'opaque/conversations.json':strToU8(JSON.stringify([{title:'x',create_time:1700000000,mapping:{node:{message:{author:{role:'user'},content:{parts:['text']}}}}}])),
    'opaque/misc.csv':strToU8('sender,text,created_at\nAlice,hello,2026-01-01'),
    'opaque/novel.json':strToU8(JSON.stringify({entries:[{sender:'a',message:'hello'}]}))
  });
  const result=await detectZipArchiveSource(file(archive,'backup.zip'));
  assert.equal(result.kind,'chatgpt');
  assert.equal(result.structure.formats.json,2);
  assert.equal(result.structure.formats.csv,1);
  assert.equal(result.structure.layouts['conversation-tree'],1);
  assert.equal(result.structure.layouts['table'],1);
  assert.equal(result.structure.layouts['structured-records'],1);
  assert.ok(result.structure.fields.text>=2);
});

test('unknown-platform ZIP still exposes structure for safe review',async()=>{
  const archive=zipSync({'undocumented/export.json':strToU8(JSON.stringify({
    messages:[{sender:'anonymous',time:1700000000,body:'text'}]
  }))});
  const result=await detectZipArchiveSource(file(archive,'unknown.zip'));
  assert.equal(result.kind,'unknown');
  assert.equal(result.structure.layouts['message-list'],1);
  assert.equal(result.structure.fields.author,1);
  assert.equal(result.structure.fields.time,1);
});


test('generic project and workspace references are surfaced without knowing the platform',()=>{
  const sample=JSON.stringify({
    project_id:'project-A',project_uuid:'project-A',workspace_id:'org-1',
    project_instructions:'Rules',chat_messages:[{sender:'human',text:'Hello'}]
  });
  const profile=inspectArchiveEntryStructure('opaque/random.json',sample);
  assert.ok(profile.layouts.includes('project-linked'));
  assert.ok(profile.layouts.includes('workspace-linked'));
  assert.ok(profile.layouts.includes('message-list'));
  assert.ok(profile.fields.project.includes('project_id'));
  assert.ok(profile.fields.workspace.includes('workspace_id'));
});

test('ZIP inventory accounts for all files including projects, files, and unknown formats',async()=>{
  const archive=zipSync({
    'projects/project-a/project.json':strToU8(JSON.stringify({id:'project-a',name:'Project A',project_instructions:'keep this'})),
    'conversations.json':strToU8(JSON.stringify([{
      title:'Project chat',project_id:'project-a',mapping:{root:{message:{author:{role:'user'},content:{parts:['hi']}}}},create_time:1700000000
    }])),
    'projects/project-a/knowledge/notes.md':strToU8('# Project material'),
    'assets/original.png':new Uint8Array([137,80,78,71]),
    'opaque/extra.unknown':strToU8('undecoded payload')
  });
  const result=await detectZipArchiveSource(file(archive,'account.zip'));
  assert.equal(result.kind,'chatgpt');
  assert.equal(result.audit.files.allFiles,5);
  assert.equal(result.audit.files.sampled,3);
  assert.equal(result.audit.files.notInspected,2);
  assert.equal(result.audit.files.assets,1);
  assert.equal(result.audit.files.unknownFiles,1);
  assert.ok(result.audit.projects.possibleProjectFiles>=2);
  assert.ok(result.audit.projects.observedFields.includes('project_id'));
  assert.ok(result.audit.projects.observedFields.includes('project_instructions'));
  assert.ok(result.audit.projects.sampleReferences.some(item=>item.id==='project-a'));
  assert.equal(result.audit.needsReview,true);
  assert.ok(result.audit.attention.some(item=>item.path==='opaque/extra.unknown'));
  assert.ok(result.audit.attention.some(item=>item.path==='assets/original.png'));
});

test('ZIP inventory exposes files beyond sampling budget, never marks them parsed',async()=>{
  const entries={};
  for(let i=0;i<170;i++)entries['opaque/items/item-'+String(i).padStart(3,'0')+'.json']=strToU8('{}');
  const result=await detectZipArchiveSource(file(zipSync(entries),'large.zip'));
  assert.equal(result.audit.files.allFiles,170);
  assert.equal(result.audit.files.sampled,160);
  assert.equal(result.audit.files.notInspected,10);
  assert.equal(result.audit.needsReview,true);
});

test('ZIP inventory flags incomplete prefixes and project fields beyond visible sample as unresolved',async()=>{
  const prefix=JSON.stringify({entries:[{text:'x'.repeat(65536),project_id:'late-project'}]});
  const result=await detectZipArchiveSource(file(zipSync({'conversation-data.json':strToU8(prefix)}),'large-chat.zip'));
  assert.equal(result.audit.files.sampled,1);
  assert.equal(result.audit.files.partialSamples,1);
  assert.equal(result.audit.needsReview,true);
  assert.equal(result.audit.projects.sampleReferences.some(x=>x.id==='late-project'),false);
});

test('project inventory is a source audit and never asserts source export completeness',()=>{
  const audit=createArchiveCompletenessAudit();
  const a=audit.addFile('opaque/missing-project-file.txt');
  audit.addSample(a,'Project A discussed in prose');
  const report=audit.report();
  assert.equal(report.files.allFiles,1);
  assert.equal(report.projects.possibleProjectFiles,0);
  assert.match(report.caveat,/not exhaustively parsed/);
  assert.equal(report.needsReview,false);
});


test('shared project ID retains multiple source-file links without flattening membership',()=>{
  const audit=createArchiveCompletenessAudit();
  const project=audit.addFile('projects/project-a/project.json');
  audit.addSample(project,'{"project_uuid":"project-a","project_instructions":"context"}');
  const first=audit.addFile('chat-1.json');
  audit.addSample(first,'{"project_uuid":"project-a","chat_messages":[{"text":"first"}]}');
  const second=audit.addFile('chat-2.json');
  audit.addSample(second,'{"project_uuid":"project-a","chat_messages":[{"text":"second"}]}');
  const result=audit.report();
  const member=result.projects.sampleReferences.find(item=>item.id==='project-a');
  assert.deepEqual(member.paths,['projects/project-a/project.json','chat-1.json','chat-2.json']);
  assert.equal(member.mentions,3);
  assert.equal(result.sourceExportCompleteness,'unverifiable');
  assert.equal(result.importRestorationStatus,'not-tested');
});
