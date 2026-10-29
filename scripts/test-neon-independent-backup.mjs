import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createBackupPublicAdapter} from '../app/loc/providers/neon-public.mjs';

const base='https://ep-sample.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';
const auth='https://ep-sample.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth';

test('Neon public fallback sends anonymous JWT directly to Neon without Supabase',async()=>{
  const seen=[],token='eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbnltb3VzIn0.fake';
  const fetchImpl=async(input,init={})=>{
    const url=String(input);
    seen.push({url,headers:new Headers(init.headers),method:init.method||'GET'});
    if(url===auth+'/token/anonymous')
      return new Response(JSON.stringify({token}),{status:200,headers:{'content-type':'application/json'}});
    return new Response(JSON.stringify([{uid:'aB12cD34'}]),{status:200,headers:{'content-type':'application/json'}});
  };
  const adapter=createBackupPublicAdapter({url:base,authUrl:auth,fetchImpl});
  const [first,second]=await Promise.all([
    adapter.publicClient.schema('silver').from('lo3rwang_galaxy').select('uid').eq('uid','aB12cD34'),
    adapter.publicClient.schema('silver').from('lrunes_galaxy').select('uid').limit(1)
  ]);
  assert.ifError(first.error);assert.ifError(second.error);
  assert.equal(first.data[0].uid,'aB12cD34');
  assert.equal(seen.filter(x=>x.url===auth+'/token/anonymous').length,1);
  const queries=seen.filter(x=>x.url!==auth+'/token/anonymous');
  assert.equal(queries.length,2);
  for(const x of queries){
    assert.ok(x.url.startsWith(base+'/'));
    assert.equal(x.headers.get('authorization'),'Bearer '+token);
    assert.equal(x.headers.get('accept-profile'),'silver');
    assert.doesNotMatch(x.url,/supabase/);
  }
  assert.match(queries[0].url,/uid=eq\.aB12cD34/);
});

test('Neon fallback refuses missing or insecure endpoints',()=>{
  assert.throws(()=>createBackupPublicAdapter({url:'',authUrl:auth}),/requires its independent/);
  assert.throws(()=>createBackupPublicAdapter({url:'http://example.com/rest/v1',authUrl:auth}),/HTTPS/);
  assert.throws(()=>createBackupPublicAdapter({url:base,authUrl:'https://other.example.com'}),/Invalid Neon/);
});

test('Neon backup fails closed without an anonymous JWT',async()=>{
  const adapter=createBackupPublicAdapter({url:base,authUrl:auth,
    fetchImpl:async()=>new Response('{}',{status:200,headers:{'content-type':'application/json'}})});
  const result=await adapter.publicClient.schema('silver').from('lo3rwang_galaxy').select('uid');
  assert.match(result.error?.message||'',/no JWT/);
});

test('Neon anonymous requests have an explicit timeout',()=>{
  const code=readFileSync(new URL('../app/loc/providers/neon-public.mjs',import.meta.url),'utf8');
  assert.match(code,/AbortSignal\.timeout\(8000\)/);
  assert.match(code,/AbortSignal\.any\(\[init\.signal,timeout\]\)/);
});
