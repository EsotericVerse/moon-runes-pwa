import test from 'node:test';
import assert from 'node:assert/strict';
import {searchMemory,readMemory} from '../app/loc/mcp/galaxy-read.mjs';

function fakeFetch(rows){
  const history=[];
  const fetch=async(url,options)=>{
    const uri=new URL(url);
    history.push({uri,options});
    return Response.json(rows);
  };
  return {fetch,history};
}
test('LP26 public search uses only title/content and minimal list columns',async()=>{
  const p=fakeFetch([{uid:'30D7AFD7',title:'LP26｜混沌先驅，薛丁格的貓',date:'2026-11-01',createtime:null}]);
  const r=await searchMemory({query:'LP26',limit:10}, {},p.fetch);
  assert.equal(r.results[0].uid,'30D7AFD7');
  assert.equal(r.results[0].title,'LP26｜混沌先驅，薛丁格的貓');
  const {uri,options}=p.history[0];
  assert.equal(uri.pathname,'/rest/v1/lo3rwang_galaxy');
  assert.equal(uri.searchParams.get('select'),'uid,title,date,createtime');
  assert.equal(uri.searchParams.get('or'),'(title.ilike."*LP26*",content.ilike."*LP26*")');
  assert.equal(uri.searchParams.get('searchable'),'eq.true');
  assert.equal(options.headers.origin,'https://loc.lo3rwang.cc');
  assert.equal(options.headers['accept-profile'],'silver');
  assert.equal(options.headers.authorization,undefined);
  assert.equal(options.method,'GET');
});
test('read_memory returns full public article in chunks, preserves Base62 case',async()=>{
  const p=fakeFetch([{uid:'aBCd1234',title:'Test',content:'abcdefghij',date:'2026-11-01'}]);
  const r=await readMemory({uid:'aBCd1234',offset:3,max_chars:4}, {},p.fetch);
  assert.equal(r.content,'defg');
  assert.equal(r.next_offset,7);
  assert.equal(p.history[0].uri.searchParams.get('uid'),'eq.aBCd1234');
  assert.equal(p.history[0].uri.searchParams.get('select'),'uid,title,content,date,createtime,site,url');
  assert.equal(p.history[0].uri.searchParams.get('searchable'),'eq.true');
});
test('search cannot target another Scope or inject PostgREST operators',async()=>{
  const p=fakeFetch([]);
  await assert.rejects(searchMemory({query:'LP26',scopeid:'admin'}, {},p.fetch),/public Galaxy/);
  await assert.rejects(readMemory({uid:'../../etc'}, {},p.fetch),/Base62/);
  await assert.rejects(searchMemory({query:'x'}, {},p.fetch),/2–100/);
  assert.equal(p.history.length,0);
  await searchMemory({query:'LP26),uid.eq.X'}, {},p.fetch);
  const filter=p.history[0].uri.searchParams.get('or');
  assert.match(filter,/"\*LP26\),uid.eq.X\*"/);
  assert.equal(p.history[0].uri.searchParams.get('uid'),null);
});
test('public record not found remains not found, not a private fallback',async()=>{
  const p=fakeFetch([]);
  const r=await readMemory({uid:'30D7AFD7'}, {},p.fetch);
  assert.equal(r.found,false);
  assert.equal(p.history.length,1);
});
test('upstream errors are surfaced, never converted to empty search results',async()=>{
  await assert.rejects(searchMemory({query:'LP26'}, {},async()=>new Response('unavailable',{status:503})),/HTTP 503/);
  await assert.rejects(readMemory({uid:'30D7AFD7'}, {},async()=>Response.json({error:'invalid'})),/invalid response/);
});

test('lrunes reads and searches only its existing public Galaxy table',async()=>{
  const p=fakeFetch([{uid:'Aa12BCd3',title:'Runes',content:'符文內文'}]);
  const found=await searchMemory({query:'符文',scopeid:'lrunes'}, {},p.fetch);
  assert.equal(found.scopeid,'lrunes');
  assert.equal(p.history[0].uri.pathname,'/rest/v1/lrunes_galaxy');
  const article=await readMemory({uid:'Aa12BCd3',scopeid:'lrunes'}, {},p.fetch);
  assert.equal(article.scopeid,'lrunes');
  assert.equal(article.content,'符文內文');
  assert.equal(p.history[1].uri.pathname,'/rest/v1/lrunes_galaxy');
  assert.equal(p.history[1].uri.searchParams.get('uid'),'eq.Aa12BCd3');
  assert.equal(p.history.length,2);
  assert.ok(p.history.every(entry=>entry.options.headers.authorization===undefined));
});
test('unlisted Scope and group aggregate access are denied before fetch',async()=>{
  const p=fakeFetch([]);
  for(const scopeid of ['loc','admin','unknown']){
    await assert.rejects(searchMemory({query:'LP26',scopeid}, {},p.fetch),/public Galaxy/);
    await assert.rejects(readMemory({uid:'30D7AFD7',scopeid}, {},p.fetch),/public Galaxy/);
  }
  assert.equal(p.history.length,0);
});
