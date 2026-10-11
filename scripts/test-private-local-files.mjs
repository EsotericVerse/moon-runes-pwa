import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  createPrivateLocalStore,privateFilePath,PRIVATE_FILE_INDEX,
  PRIVATE_FILE_CHUNK_BYTES,PRIVATE_FILE_MAX_BYTES
} from '../app/loc/private-local-files.mjs';

class MemoryNativeFilesystem{
  constructor(){this.files=new Map();this.dirs=new Set();this.calls=[];}
  key(path,directory){return directory+'/'+path;}
  async stat({path,directory}){
    const key=this.key(path,directory);
    if(this.files.has(key))return {size:this.files.get(key).byteLength,type:'file'};
    if(this.dirs.has(key))return {size:0,type:'directory'};
    throw Error('File does not exist');
  }
  async mkdir({path,directory}){this.dirs.add(this.key(path,directory));}
  async writeFile({path,directory,data,encoding}){
    this.calls.push({action:'write',path,directory});
    this.files.set(this.key(path,directory),encoding==='utf8'
      ?new TextEncoder().encode(data):new Uint8Array(Buffer.from(data,'base64')));
  }
  async appendFile({path,directory,data}){
    this.calls.push({action:'append',path,directory});
    const key=this.key(path,directory);
    const before=this.files.get(key)||new Uint8Array();
    const next=new Uint8Array(Buffer.from(data,'base64'));
    const joined=new Uint8Array(before.length+next.length);
    joined.set(before);joined.set(next,before.length);this.files.set(key,joined);
  }
  async readFile({path,directory,encoding}){
    const data=this.files.get(this.key(path,directory));
    if(!data)throw Error('File does not exist');
    return {data:encoding==='utf8'?new TextDecoder().decode(data):Buffer.from(data).toString('base64')};
  }
  async deleteFile({path,directory}){
    if(!this.files.delete(this.key(path,directory)))throw Error('File does not exist');
  }
  async getUri({path,directory}){
    await this.stat({path,directory});
    return {uri:'file:///offline/'+path};
  }
}

const location='LIBRARY_NO_CLOUD';
function localFile(bytes,name='MSN 聊天紀錄.xml',type='application/xml'){
  const binary=new Uint8Array(bytes);
  return {
    name,type,size:binary.length,lastModified:1234567890,
    slice(start,end){const piece=binary.slice(start,end);return {size:piece.length,async arrayBuffer(){return piece.buffer;}};}
  };
}

test('private Local File copies binary chunks exactly to iOS no-cloud sandbox, without network/DB',async()=>{
  const fs=new MemoryNativeFilesystem();
  const store=createPrivateLocalStore(fs,location);
  const bytes=Uint8Array.from({length:PRIVATE_FILE_CHUNK_BYTES*2+3},(_,i)=>i%251);
  const progress=[];
  const entry=await store.importFile(localFile(bytes),(...values)=>progress.push(values));
  assert.equal(entry.name,'MSN 聊天紀錄.xml');
  assert.equal(entry.size,bytes.length);
  assert.deepEqual(fs.files.get(fs.key(privateFilePath(entry.id),location)),bytes);
  assert.deepEqual(fs.calls.filter(c=>c.action==='append').length,2);
  assert.equal(progress.at(-1)[0],bytes.length);
  assert.ok(fs.calls.every(c=>c.directory===location));
  assert.deepEqual((await store.list()).map(item=>item.id),[entry.id]);
  assert.equal((await store.getUri(entry.id)).startsWith('file:///offline/'),true);
  // App relaunch reads the on-device index, not IndexedDB/localStorage.
  assert.equal((await createPrivateLocalStore(fs,location).list())[0].id,entry.id);
});

test('same filename is not overwritten; only requested local copy is deleted',async()=>{
  const fs=new MemoryNativeFilesystem(),store=createPrivateLocalStore(fs,location);
  const first=await store.importFile(localFile([0,255,1],'same.dat','application/octet-stream'));
  const second=await store.importFile(localFile([9,8,7],'same.dat','application/octet-stream'));
  assert.notEqual(first.id,second.id);
  assert.equal((await store.list()).length,2);
  await store.remove(first.id);
  assert.equal((await store.list()).length,1);
  assert.equal((await store.list())[0].id,second.id);
  await assert.rejects(()=>store.getUri(first.id),/找不到/);
  await assert.rejects(()=>store.preview(second.id),/不提供文字預覽/);
  assert.throws(()=>privateFilePath('../bad'),/無效/);
});

test('UTF-8 previews decode local bytes and never render markup as HTML',async()=>{
  const fs=new MemoryNativeFilesystem(),store=createPrivateLocalStore(fs,location);
  const original='<script>alert(1)</script>\n你好';
  const entry=await store.importFile(localFile(new TextEncoder().encode(original),'chat.txt','text/plain'));
  assert.equal(await store.preview(entry.id),original);
});

test('corrupted index fails closed before any imported content is written',async()=>{
  const fs=new MemoryNativeFilesystem(),store=createPrivateLocalStore(fs,location);
  await store.list();
  await fs.writeFile({path:PRIVATE_FILE_INDEX,directory:location,data:'{invalid',encoding:'utf8'});
  const count=fs.files.size;
  await assert.rejects(()=>store.importFile(localFile([1,2,3])),/JSON 損壞/);
  assert.equal(fs.files.size,count);
});

test('oversized private files are rejected before loading chunks',async()=>{
  const fs=new MemoryNativeFilesystem(),store=createPrivateLocalStore(fs,location);
  const enormous={name:'huge.dat',size:PRIVATE_FILE_MAX_BYTES+1,slice(){throw Error('should not read');}};
  await assert.rejects(()=>store.importFile(enormous),/512 MB/);
  assert.equal(fs.files.size,0);
});
