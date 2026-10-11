import assert from 'node:assert/strict';
import {test} from 'node:test';
import {zipSync,strToU8} from 'fflate';
import {inspectXArchive} from '../app/loc/private-x-archive.mjs';
import {recommendedWebBatchSize} from '../app/loc/private-web-vault.mjs';

function mockFile(bytes,name='no-extension'){
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  return {size:data.byteLength,name,
    slice(start=0,end=data.length){
      const sub=data.slice(start,end);
      return {size:sub.byteLength,async arrayBuffer(){return sub.buffer;}};
    }};
}
const item=(i)=>({tweet:{
  id_str:String(1000000+i),
  full_text:'繁體中文、Emoji 🌙 文本 '+i,
  created_at:'Mon Oct 09 15:26:46 +0000 2023',
  lang:'zh',in_reply_to_status_id_str:null
}});
const sample=rows=>'window.YTD.tweet.part0 = '+JSON.stringify(rows)+';';
const noSemi=rows=>'window.YTD.tweet.part0 = '+JSON.stringify(rows);
function counters(){
  const records=[];
  return {records,feed:{onRecord:r=>records.push(r)}};
}
test('X YTD JavaScript fixture yields stable post IDs, exact Chinese and original JSON',async()=>{
  const {feed,records}=counters();
  const original=[item(1),item(2)];
  const result=await inspectXArchive(mockFile(strToU8(noSemi(original))),feed);
  assert.equal(result.totalRows,2);
  assert.equal(result.acceptedRows,2);
  assert.equal(records[0].key,'x:post:1000001');
  assert.equal(records[0].text,original[0].tweet.full_text);
  assert.deepEqual(records[0].raw,original[0]);
  assert.equal(result.matchedFiles,1);
});

test('ZIP with nested tweet.js streams only supported X data and skips unrelated files',async()=>{
  const file=zipSync({
    'data/tweets.js':strToU8(sample([item(3),item(4)])),
    'data/account.js':strToU8('window.YTD.account.part0 = [{"account":{"name":"x"}}];'),
    'readme.txt':strToU8('hello')
  });
  const {records,feed}=counters();
  const result=await inspectXArchive(mockFile(file,'archive.zip'),feed);
  assert.equal(result.matchedFiles,1);
  assert.equal(result.otherFiles,2);
  assert.equal(records.length,2);
  assert.equal(records[1].text,item(4).tweet.full_text);
});

test('large JSON arrays are streamed over multiple input chunks',async()=>{
  const rows=Array.from({length:15000},(_,i)=>item(i+10));
  const {records,feed}=counters();
  const result=await inspectXArchive(mockFile(strToU8(noSemi(rows)),'unknown'),feed);
  assert.equal(result.acceptedRows,15000);
  assert.equal(records.length,15000);
  assert.equal(recommendedWebBatchSize(100),100);
  assert.equal(recommendedWebBatchSize(20000),200);
  assert.equal(recommendedWebBatchSize(100000),500);
  assert.equal(Math.ceil(79000/recommendedWebBatchSize(79000)),158);
});

test('unknown and malformed YTD rows are reported without silently inventing values',async()=>{
  const rows=[item(1),{tweet:{full_text:'no id'}},{tweet:{id_str:'123',full_text:null}}];
  const {records,feed}=counters();
  const result=await inspectXArchive(mockFile(strToU8(noSemi(rows))),feed);
  assert.equal(records.length,1);
  assert.equal(result.totalRows,3);
  assert.equal(result.rejectedRows,2);
  assert.equal(result.problems.length,2);
});

test('byte-level encoding corruption refuses to import rather than repair content',async()=>{
  const bytes=strToU8(noSemi([item(1)]));
  const mixed=new Uint8Array(bytes.length+2);
  mixed.set(bytes);mixed[bytes.length]=0xff;mixed[bytes.length+1]=0xfe;
  const {feed}=counters();
  await assert.rejects(()=>inspectXArchive(mockFile(mixed),feed));
});

test('zip without matching files refuses to pretend success',async()=>{
  const archive=zipSync({'data/account.js':strToU8('[]')});
  await assert.rejects(()=>inspectXArchive(mockFile(archive,'other.zip'),{onRecord(){}}),/沒有辨識到/);
});

test('abort stops reading without completing the import',async()=>{
  const abort=new AbortController();abort.abort();
  await assert.rejects(()=>inspectXArchive(mockFile(strToU8(noSemi([item(1)]))),{onRecord(){},signal:abort.signal}),/取消/);
});
