import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {detectZipArchiveSource,inspectPrivateArchive} from '../app/loc/private-archive-universal.mjs';
import {archiveGalaxyRow} from '../app/loc/archive-galaxy-row.mjs';
import {readImageExif} from '../app/loc/archive-exif.mjs';

function asFile(name,bytes){
  const data=new Uint8Array(bytes);
  return {name,size:data.length,slice(start,end){
    return {arrayBuffer:async()=>data.slice(start,end).buffer};
  }};
}
const j=v=>strToU8(JSON.stringify(v));
async function parsed(name,files){
  const file=asFile(name,zipSync(files));
  const detected=await detectZipArchiveSource(file);
  const results=[];const exif=[];
  const summary=await inspectPrivateArchive(file,{
    onRecord:r=>{const row=archiveGalaxyRow(r);if(row)results.push(row);},
    onMediaMetadata:r=>exif.push(r)
  });
  return {detected,results,exif,summary};
}
test('Threads ZIP flows past detection into actual Galaxy-ready articles with original URL',async()=>{
  const a=await parsed('threads-archive.zip',{
    'activity/threads/threads_posts.json':j({text_post_app_text_posts:[
      {id:'threads-001',title:'台南散步',timestamp:1720000000,
        url:'https://www.threads.net/@writer/post/abc123'}
    ]})
  });
  assert.ok(a.detected.sources.includes('threads'));
  assert.equal(a.results.length,1);
  assert.equal(a.results[0].source_name,'Threads');
  assert.equal(a.results[0].content,'台南散步');
  assert.equal(a.results[0].url,'https://www.threads.net/@writer/post/abc123');
});
test('Facebook ZIP keeps place, time and original permalink',async()=>{
  const a=await parsed('facebook-2026.zip',{
    'your_facebook_activity/posts/your_posts_1.json':j([{
      id:'fb100',timestamp:1720000000,data:[{post:'到高雄'}],
      attachments:[{data:[{place:{name:'高雄車站'}}]}],
      permalink:'https://www.facebook.com/post/123'
    }])
  });
  assert.equal(a.results.length,1);
  assert.equal(a.results[0].source_name,'Facebook');
  assert.equal(a.results[0].source_place,'高雄車站');
  assert.equal(a.results[0].url,'https://www.facebook.com/post/123');
});
test('ChatGPT conversations.json becomes searchable dialogue instead of an inert ZIP scan',async()=>{
  const a=await parsed('chatgpt-export.zip',{
    'conversations.json':j([{
      id:'chat-001',title:'空間定錨',
      create_time:1720000000,
      mapping:{a:{message:{author:{role:'user'},create_time:1720000001,
        content:{content_type:'text',parts:['在板橋車站見面']}}},
      b:{message:{author:{role:'assistant'},create_time:1720000002,
        content:{content_type:'text',parts:['收到，依照原文紀錄。']}}}}
    }])
  });
  assert.equal(a.results.length,1);
  assert.equal(a.results[0].source_name,'ChatGPT');
  assert.equal(a.results[0].title,'空間定錨');
  assert.match(a.results[0].content,/\[user\].*板橋車站/s);
  assert.match(a.results[0].content,/\[assistant\].*依照原文紀錄/s);
});
test('Unrecognized archive still attempts generic text records and does not silently stop',async()=>{
  const a=await parsed('unknown-backup.zip',{
    'posts.json':j([{id:'p1',content:'一篇通用文章',timestamp:1720000000}])
  });
  assert.equal(a.results.length,1);
  assert.equal(a.results[0].content,'一篇通用文章');
  assert.equal(a.results[0].source_name,'Archive');
});
function gpsJpeg(){
  // Minimal valid JPEG EXIF containing GPS latitude 25°02'N longitude 121°31'E.
  const t=new Uint8Array(174);
  const d=new DataView(t.buffer);
  t.set([73,73,42,0,8,0,0,0]);
  const w16=(p,v)=>d.setUint16(p,v,true),w32=(p,v)=>d.setUint32(p,v,true);
  w16(8,1);w16(10,0x8825);w16(12,4);w32(14,1);w32(18,26);
  w16(26,4);
  const entry=(i,tag,type,count,val)=>{
    const p=28+i*12;w16(p,tag);w16(p+2,type);w32(p+4,count);w32(p+8,val);
  };
  entry(0,1,2,2,78);entry(1,2,5,3,80);entry(2,3,2,2,104);entry(3,4,5,3,112);
  t.set([78,0],78);t.set([69,0],104);
  // reference tag with ASCII count 2 is inline in the IFD value field;
  // overwrite the value slot directly as TIFF requires.
  t.set([78,0,0,0],36);
  t.set([69,0,0,0],60);
  for(const [offset,degree,minute,second] of [[80,25,2,0],[112,121,31,0]]){
    [degree,minute,second].forEach((v,i)=>{w32(offset+i*8,v);w32(offset+i*8+4,1)});
  }
  const length=t.length+8;
  return Uint8Array.from([255,216,255,225,length>>8,length&255,69,120,105,102,0,0,...t,255,217]);
}
test('EXIF GPS is inspected locally from ZIP without importing image bytes',async()=>{
  const jpeg=gpsJpeg();
  const direct=readImageExif(jpeg,'photo.jpg');
  assert.ok(direct);
  assert.ok(Math.abs(direct.latitude-25.0333)<0.01);
  assert.ok(Math.abs(direct.longitude-121.5167)<0.01);
  const a=await parsed('mixed-archive.zip',{
    'posts.json':j([{content:'這是文章',id:'post1'}]),
    'photos/photo.jpg':jpeg
  });
  assert.equal(a.results.length,1);
  assert.equal(a.exif.length,1);
  assert.equal(a.summary.exifWithGps,1);
  assert.equal(a.results[0].content,'這是文章');
  assert.equal(a.results[0].source_place,undefined);
});
