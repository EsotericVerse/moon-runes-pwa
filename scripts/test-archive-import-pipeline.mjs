import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {streamArchiveGalaxyRows} from '../app/loc/archive-import-pipeline.mjs';

function asFile(name,bytes){
  const data=new Uint8Array(bytes);
  return {name,size:data.length,slice(start,end){
    return {arrayBuffer:async()=>data.slice(start,end).buffer};
  }};
}

test('165-file ZIP continues writing past 30k and completes trailing window',async()=>{
  const entries={};
  for(let file=0;file<165;file++){
    const rows=[];
    for(let index=0;index<200;index++){
      rows.push({id:'archive-'+file+'-'+index,timestamp:1720000000+file*200+index,
        data:[{post:'批次匯入測試 '+file+'-'+index}]});
    }
    entries['your_facebook_activity/posts/your_posts_'+file+'.json']=strToU8(JSON.stringify(rows));
  }
  const file=asFile('facebook-many-files.zip',zipSync(entries));
  const sizes=[],seen=new Set();
  const result=await streamArchiveGalaxyRows(file,{
    onWindow:async(rows,index)=>{
      sizes.push(rows.length);
      assert.equal(index,sizes.length);
      for(const entry of rows){
        assert.equal(entry.raw.source_name,'Facebook');
        assert.ok(!seen.has(entry.raw.uid));
        seen.add(entry.raw.uid);
      }
    }
  });
  assert.equal(result.records,33000);
  assert.equal(result.windows,2);
  assert.equal(result.summary.matchedFiles,165);
  assert.deepEqual(sizes,[30000,3000]);
  assert.equal(seen.size,33000);
});
