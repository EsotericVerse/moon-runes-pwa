import test from 'node:test';
import assert from 'node:assert/strict';
import {createChronologicalKeywordReader} from '../app/loc/keyword-article-reader.mjs';

const times=['2026-01-01T10:00:00Z','2026-01-01T10:00:00Z','2026-01-01T10:00:00Z',
  '2026-01-02T10:00:00Z','2026-01-03T10:00:00Z','2026-01-03T10:00:00Z',
  '2026-01-04T10:00:00Z',null,null];
const articles=times.map((createtime,i)=>({
  uid:'Ab'+String(i+1).padStart(6,'0'),createtime,content:'靈'
}));
const expected=articles.slice(0,7)
  .sort((a,b)=>a.createtime.localeCompare(b.createtime)||a.uid.localeCompare(b.uid))
  .concat(articles.slice(7).sort((a,b)=>a.uid.localeCompare(b.uid)));

async function collect(limit,cap=limit){
  const reader=createChronologicalKeywordReader({
    readTimePage:async({after,limit:requested})=>articles
      .filter(a=>a.createtime&&(!after||a.createtime>after))
      .sort((a,b)=>a.createtime.localeCompare(b.createtime)||b.uid.localeCompare(a.uid))
      .slice(0,Math.min(requested,cap)),
    readTimePeers:async({createtime})=>articles.filter(a=>a.createtime===createtime).reverse(),
    readUndated:async()=>articles.filter(a=>!a.createtime).reverse()
  });
  const seen=[];
  for(let i=0;i<20;i++){
    const chunk=await reader({limit});
    if(!chunk.length)break;
    seen.push(...chunk);
  }
  return seen;
}
for(const pageSize of [1,2,3,5,20]){
  test('timestamp groups and undated articles stay complete at page size '+pageSize,async()=>{
    assert.deepEqual((await collect(pageSize)).map(x=>x.uid),expected.map(x=>x.uid));
  });
}
test('server-imposed short pages do not lose timestamp peers',async()=>{
  assert.deepEqual((await collect(5,2)).map(x=>x.uid),expected.map(x=>x.uid));
});
test('truncated timestamp groups fail instead of publishing partial results',async()=>{
  const reader=createChronologicalKeywordReader({maximumRows:3,
    readTimePage:async()=>articles.slice(0,1),
    readTimePeers:async()=>articles.slice(0,3),
    readUndated:async()=>[]});
  await assert.rejects(reader({limit:1}),/Incomplete publication-time group/);
});
