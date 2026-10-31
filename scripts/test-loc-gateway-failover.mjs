import assert from 'node:assert/strict';
import {test} from 'node:test';
import gateway from '../workers/loc-gateway/index.mjs';

const origin='https://loc.example.test';
const supa='https://primary.example.test/rest/v1';
const neon='https://backup.example.test/rest/v1';
const neonAuth='https://backup-auth.example.test/auth';
const base='https://g.example.test/rest/v1';
const envFor=(primary_id='supabase-current')=>({
  LOC_PUBLIC_ORIGIN:origin,
  LOC_AUTHORITY_ORIGIN:'https://authority.example.test',
  LOC_SUPABASE_DATA_API_URL:supa,
  LOC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',
  LOC_NEON_DATA_API_URL:neon,
  LOC_NEON_AUTH_URL:neonAuth,
  LOC_AUTHORITY_STATE:{
    idFromName:()=>({}),
    get:()=>({listState:async()=>({primary_id})})
  },
  LOC_AUTHORITY_SERVICE:{
    fetch:async request=>{
      assert.equal(new URL(request.url).pathname,'/v1/identity');
      assert.equal(request.headers.get('origin'),origin);
      return Response.json({provider:'clerk',subject:'user_test',email:'verified@example.test'});
    }
  }
});
const req=(path,method='GET',token='')=>new Request('https://g.example.test'+path,{
  method,headers:{origin,...(token?{authorization:'Bearer '+token}:{})},
  ...(method==='POST'?{body:'{}',headers:{origin,'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})}}:{})
});
async function mockFetch(callback,run){
  const old=globalThis.fetch;
  globalThis.fetch=callback;
  try{return await run();}finally{globalThis.fetch=old}
}
test('Supabase 503 failover performs an independent Neon public SELECT',async()=>{
  const calls=[];
  await mockFetch(async(url,init)=>{
    calls.push(String(url));
    if(String(url).startsWith(supa))return new Response('unavailable',{status:503});
    if(String(url)===neonAuth+'/token/anonymous')
      return Response.json({token:'header.payload.testanonymous'});
    assert.equal(new Headers(init.headers).get('authorization'),'Bearer header.payload.testanonymous');
    return new Response('[{"uid":"TEST1234"}]',{status:200,headers:{'content-type':'application/json','location':supa}});
  },async()=>{
    const reply=await gateway.fetch(req('/rest/v1/lo3rwang_galaxy?select=uid'),envFor());
    assert.equal(reply.status,200);
    assert.deepEqual(await reply.json(),[{uid:'TEST1234'}]);
    assert.equal(reply.headers.get('location'),null);
    assert.deepEqual(calls.map(url=>url.startsWith(supa)?'supabase':url.startsWith(neonAuth)?'neon-auth':'neon'),['supabase','neon-auth','neon']);
  });
});
test('manual Neon primary sends writes to Neon only with a verified Clerk token',async()=>{
  const calls=[];
  await mockFetch(async(url,init)=>{
    calls.push(String(url));
    return new Response('{"count":1}',{status:200,headers:{'content-type':'application/json'}});
  },async()=>{
    const reply=await gateway.fetch(req('/rest/v1/rpc/management_write','POST','header.payload.signature'),envFor('neon-current'));
    assert.equal(reply.status,200);
    assert.equal(calls.length,1);
    assert.equal(calls[0].startsWith(neon),true);
  });
});
test('anonymous mutation and unknown RPC cannot pass through Gateway',async()=>{
  const input=req('/rest/v1/rpc/management_write','POST');
  const result=await gateway.fetch(input,envFor());
  assert.equal(result.status,401);
  const insert=await gateway.fetch(req('/rest/v1/lo3rwang_galaxy','POST'),envFor());
  assert.equal(insert.status,401);
});
test('read-only RPC remains available to Guest without Clerk',async()=>{
  await mockFetch(async()=>Response.json({earliest:'2026-01-01'}),async()=>{
    const answer=await gateway.fetch(req('/rest/v1/rpc/read_scope_overview','POST'),envFor());
    assert.equal(answer.status,200);
  });
});
test('an ambiguous failed write is never auto replayed on the backup',async()=>{
  const calls=[];
  await mockFetch(async(url)=>{
    calls.push(String(url));
    if(String(url).startsWith('https://authority.example.test'))
      return Response.json({provider:'clerk',subject:'user_test'});
    return new Response('unavailable',{status:503});
  },async()=>{
    const reply=await gateway.fetch(req('/rest/v1/rpc/management_write','POST','header.payload.signature'),envFor());
    assert.equal(reply.status,503);
    assert.equal(calls.filter(url=>url.startsWith(neon)).length,0);
  });
});
test('Gateway rejects other sites, not just unauthenticated users',async()=>{
  const bad=new Request(base+'/runes',{headers:{origin:'https://stranger.example'}});
  const reply=await gateway.fetch(bad,envFor());
  assert.equal(reply.status,403);
});
