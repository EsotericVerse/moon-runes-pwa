import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertPrivateArchiveDestination,assertArchiveRecordDestination,
  assertArchiveEntryDestination,assertStandaloneImportDestination
} from '../app/loc/archive-import-safety.mjs';

test('Messenger, ChatGPT, and other chat archives never enter online Galaxy',()=>{
  for(const source of ['messenger','ChatGPT','Claude','Gemini','msn','WhatsApp','Telegram','Discord','LINE']){
    assert.throws(()=>assertPrivateArchiveDestination(false,[source]),/私人對話/);
    assert.doesNotThrow(()=>assertPrivateArchiveDestination(true,[source]));
  }
  assert.throws(()=>assertPrivateArchiveDestination(false,[]),/無法證實/);
  assert.doesNotThrow(()=>assertPrivateArchiveDestination(false,['facebook','threads']));
  // Mixed Meta archives are processed file by file; chat entries are skipped
  // without rejecting an otherwise valid Threads/Facebook post archive.
  assert.doesNotThrow(()=>assertPrivateArchiveDestination(false,['threads','messenger']));
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
