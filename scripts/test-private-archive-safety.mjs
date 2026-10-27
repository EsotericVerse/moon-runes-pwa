import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertPrivateArchiveDestination,isPublicArchiveRecord,isPrivateArchiveEntry,assertArchiveRecordDestination,
  assertArchiveEntryDestination,assertStandaloneImportDestination
} from '../app/loc/archive-import-safety.mjs';

test('Messenger, ChatGPT, and other chat archives never enter online Galaxy',()=>{
  for(const source of ['messenger','ChatGPT','Claude','Gemini','msn','WhatsApp','Telegram','Discord','LINE']){
    assert.throws(()=>assertPrivateArchiveDestination(false,[source]),/私人對話/);
    assert.doesNotThrow(()=>assertPrivateArchiveDestination(true,[source]));
  }
  assert.throws(()=>assertPrivateArchiveDestination(false,[]),/無法證實/);
  assert.doesNotThrow(()=>assertPrivateArchiveDestination(false,['facebook','threads']));
});
test('Recognized Facebook, Instagram, Threads and X posts stay importable online',()=>{
  for(const platform of ['facebook','instagram','threads','x'])
    assert.doesNotThrow(()=>assertArchiveRecordDestination({
      platform,kind:'post',sourcePath:platform+'/posts.json'
    },false));
});
test('Meta messages and AI conversations are never treated as public posts',()=>{
  for(const record of [
    {platform:'messenger',kind:'message',sourcePath:'messages/inbox/friend/message_1.json'},
    {platform:'facebook',kind:'message',sourcePath:'your_facebook_activity/messages/inbox/message_1.json'},
    {platform:'chatgpt',kind:'conversation',sourcePath:'conversations.json'},
    {platform:'claude',kind:'post',sourcePath:'claude/data.json'},
    {platform:'facebook',kind:'post',sourcePath:'your_facebook_activity/messages/inbox/posts.json'}
  ]){
    assert.throws(()=>assertArchiveRecordDestination(record,false));
    assert.doesNotThrow(()=>assertArchiveRecordDestination(record,true));
  }
});
test('Twitter/X direct message JS files and directMessage payloads cannot publish',()=>{
  for(const path of ['data/direct-messages.js','data/direct-message.js','data/direct-messages-group.js','data/direct_messages.js']){
    assert.throws(()=>assertArchiveEntryDestination(path,false),/私人對話/);
    assert.throws(()=>assertArchiveRecordDestination({platform:'x',kind:'post',sourcePath:path},false),/私人對話/);
  }
  assert.throws(()=>assertArchiveRecordDestination({
    platform:'x',kind:'post',sourcePath:'data/archive.js',
    raw:{directMessage:{messageCreate:{text:'fixture'}}}
  },false),/私人對話/);
  assert.doesNotThrow(()=>assertArchiveRecordDestination({
    platform:'x',kind:'post',sourcePath:'data/tweets.js'
  },false));
});
test('Unknown archive text documents cannot be routed to online Galaxy',()=>{
  assert.throws(()=>assertArchiveRecordDestination({
    platform:'document',kind:'document',sourcePath:'old-chat.xml'
  },false),/未知格式/);
  assert.throws(()=>assertArchiveRecordDestination({
    platform:'facebook',kind:'reaction',sourcePath:'reactions.json'
  },false),/未知格式/);
});
test('Private media paths cannot leak EXIF from mixed online archives',()=>{
  assert.throws(()=>assertArchiveEntryDestination(
    'your_facebook_activity/messages/inbox/user/photo.jpg',false),/私人對話/);
  assert.doesNotThrow(()=>assertArchiveEntryDestination('facebook/photos/p.jpg',false));
  assert.doesNotThrow(()=>assertArchiveEntryDestination('messages/inbox/photo.jpg',true));
});
test('Direct imported chats cannot bypass private-only rule with renamed source',()=>{
  assert.throws(()=>assertStandaloneImportDestination({
    fileName:'conversations.json',source:'Other',rows:[],nativeLocal:false
  }),/私人對話/);
  assert.throws(()=>assertStandaloneImportDestination({
    fileName:'generic.json',rows:[{source_name:'Messenger',content:'fixture'}],nativeLocal:false
  }),/私人對話/);
  assert.throws(()=>assertStandaloneImportDestination({
    fileName:'posts.json',rows:[{kind:'message',platform:'facebook'}],nativeLocal:false
  }),/私人對話/);
  assert.throws(()=>assertStandaloneImportDestination({
    fileName:'renamed.json',rows:[{mapping:{abc:{message:{author:{role:'user'}}}}}],nativeLocal:false
  }),/私人對話/);
  assert.throws(()=>assertStandaloneImportDestination({
    fileName:'renamed.json',rows:[{participants:['A','B'],messages:[{text:'fixture'}]}],nativeLocal:false
  }),/私人對話/);
  assert.doesNotThrow(()=>assertStandaloneImportDestination({
    fileName:'posts.json',rows:[{source_name:'Facebook'}],nativeLocal:false
  }));
  assert.doesNotThrow(()=>assertStandaloneImportDestination({
    fileName:'conversations.json',nativeLocal:true
  }));
});

test('Mixed Threads and Messenger ZIP discovery allows public posts but skips chat rows',()=>{
  assert.doesNotThrow(()=>assertPrivateArchiveDestination(false,['threads','messenger','facebook']));
  const post={platform:'threads',kind:'post',sourcePath:'activity/threads/threads_posts.json',
    raw:{id:'p1',text:'公開測試貼文'}};
  const privateMessage={platform:'messenger',kind:'message',
    sourcePath:'your_facebook_activity/messages/inbox/person/message_1.json',
    raw:{sender_name:'fixture',content:'測試私訊'}};
  assert.equal(isPublicArchiveRecord(post),true);
  assert.equal(isPublicArchiveRecord(privateMessage),false);
  assert.equal(isPrivateArchiveEntry('messages/inbox/person/photo.jpg'),true);
  assert.equal(isPrivateArchiveEntry('threads/photos/public.jpg'),false);
});
test('Threads-named files containing chat structures are not accepted as posts',()=>{
  assert.equal(isPublicArchiveRecord({platform:'threads',kind:'post',
    sourcePath:'threads_posts.json',raw:{participants:['a','b'],messages:[{text:'private'}]}}),false);
  assert.equal(isPublicArchiveRecord({platform:'threads',kind:'post',
    sourcePath:'threads_posts.json',raw:{sender_name:'fixture',content:'private'}}),false);
});

test('Private and unknown archive rejections carry a security-block code, not a JSON parse error',()=>{
  for(const fn of [
    ()=>assertPrivateArchiveDestination(false,['messenger']),
    ()=>assertArchiveRecordDestination({platform:'threads',kind:'message',sourcePath:'threads/messages.json'},false)
  ])assert.throws(fn,error=>error?.code==='LOC_PRIVATE_ARCHIVE_BLOCKED');
  assert.throws(()=>assertArchiveRecordDestination({platform:'document',kind:'document'},false),
    error=>error?.code==='LOC_UNVERIFIED_ARCHIVE_BLOCKED');
});
test('Threads post JSON is allowed without misclassifying it as private chat',()=>{
  assert.doesNotThrow(()=>assertStandaloneImportDestination({
    fileName:'your_threads__your_posts.json',
    nativeLocal:false,
    rows:[{source_name:'Threads',content:'公開貼文範例',kind:'post'}]
  }));
  assert.doesNotThrow(()=>assertArchiveRecordDestination({
    platform:'threads',kind:'post',sourcePath:'threads/your_posts_1.json'
  },false));
  assert.throws(()=>assertArchiveRecordDestination({
    platform:'threads',kind:'message',sourcePath:'threads/messages_1.json'
  },false));
});
test('Direct imported chats cannot bypass private-only rule with renamed source',()=>{
  assert.throws(()=>assertStandaloneImportDestination({
    fileName:'conversations.json',source:'Other',rows:[],nativeLocal:false
  }),/私人對話/);
  assert.throws(()=>assertStandaloneImportDestination({
    fileName:'generic.json',rows:[{source_name:'Messenger',content:'fixture'}],nativeLocal:false
  }),/私人對話/);
  assert.throws(()=>assertStandaloneImportDestination({
    fileName:'posts.json',rows:[{kind:'message',platform:'facebook'}],nativeLocal:false
  }),/私人對話/);
  assert.throws(()=>assertStandaloneImportDestination({
    fileName:'renamed.json',rows:[{mapping:{abc:{message:{author:{role:'user'}}}}}],nativeLocal:false
  }),/私人對話/);
  assert.throws(()=>assertStandaloneImportDestination({
    fileName:'renamed.json',rows:[{participants:['A','B'],messages:[{text:'fixture'}]}],nativeLocal:false
  }),/私人對話/);
  assert.doesNotThrow(()=>assertStandaloneImportDestination({
    fileName:'posts.json',rows:[{source_name:'Facebook'}],nativeLocal:false
  }));
  assert.doesNotThrow(()=>assertStandaloneImportDestination({
    fileName:'conversations.json',nativeLocal:true
  }));
});
