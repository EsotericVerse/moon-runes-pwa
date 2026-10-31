import assert from 'node:assert/strict';
import {test} from 'node:test';
import gateway from '../workers/loc-gateway/index.mjs';

const origin='https://loc.example.org';
const supa='https://primary.example.org/rest/v1';
const neon='https://backup.example.org/rest/v1';
const neonAuth='https://backup-auth.example.org/auth';
const jwt='headerheader.payloadpayload.signaturesignature';
function fixture({isRoot=true,email='verified@example.org',
  managementEmail='verified@example.org',neonStatus=200}={}){
  const calls=[],authority=[];
  const env={
    LOC_PUBLIC_ORIGIN:origin,
    LOC_SUPABASE_DATA_API_URL:supa,
    LOC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',
    LOC_NEON_DATA_API_URL:neon,
    LOC_NEON_AUTH_URL:neonAuth,
    LOC_AUTHORITY_STATE:{
      idFromName:()=>({}),
      get:()=>({listState:async()=>({primary_id:'neon-current'})})
    },
    LOC_AUTHORITY_SERVICE:{
      fetch:async request=>{
        authority.push(new URL(request.url).pathname);
        if(new URL(request.url).pathname==='/v1/me')
          return new Response('{}',{status:isRoot?200:403});
        return Response.json({provider:'clerk',subject:'user_test',email,session:'sess_test'});
      }
    }
  };
  const fakeFetch=async(url)=>{
    const target=String(url);
    calls.push(target);
    if(target===neonAuth+'/token/anonymous')
      return Response.json({token:'header.payload.signature'});
    if(target.startsWith(neon)&&neonStatus!==200)
      return Response.json({error:'unavailable'},{status:neonStatus});
    if(target.includes('/rpc/get_my_scope_management'))
      return Response.json([{id:'lo3rwang',email:managementEmail,role:'scope'}]);
    return Response.json([{uid:'abc123'}]);
  };
  const req=(method='GET',path='/v1/readiness')=>new Request('https://gateway.example.org'+path,{
    method,headers:{origin,authorization:'Bearer '+jwt}
  });
  return {env,calls,authority,fakeFetch,req};
}
async function withinFetch(mock,run){
  const old=globalThis.fetch;globalThis.fetch=mock;
  try{return await run();}finally{globalThis.fetch=old;}
}
test('only an authenticated Clerk root can inspect provider readiness',async()=>{
  const f=fixture({isRoot:false});
  await withinFetch(f.fakeFetch,async()=>{
    const r=await gateway.fetch(f.req(),f.env);
    assert.equal(r.status,403);
    assert.deepEqual(f.calls,[]);
    assert.deepEqual(f.authority,['/v1/identity','/v1/me']);
  });
});
test('ready status requires matching verified email returned by management RPC',async()=>{
  const f=fixture();
  await withinFetch(f.fakeFetch,async()=>{
    const r=await gateway.fetch(f.req(),f.env);
    assert.equal(r.status,200);
    const body=await r.json();
    assert.equal(body.clerk.verifiedEmail,true);
    assert.equal(body.supabase.publicRead,true);
    assert.equal(body.neon.publicRead,true);
    assert.equal(body.supabase.clerkManagementRead,true);
    assert.equal(body.neon.clerkManagementRead,true);
    assert.equal(body.primary,'neon');
    assert.equal(body.writingTested,false);
    assert.equal(body.dataParityTested,false);
    assert.equal(f.calls.filter(url=>url.includes('management_write')).length,0);
    assert.equal(r.headers.get('cache-control'),'no-store');
  });
});
test('a different email in SQL grants is never reported as authorized',async()=>{
  const f=fixture({managementEmail:'someone-else@example.org'});
  await withinFetch(f.fakeFetch,async()=>{
    const body=await (await gateway.fetch(f.req(),f.env)).json();
    assert.equal(body.supabase.clerkManagementRead,false);
    assert.equal(body.neon.clerkManagementRead,false);
    assert.equal(body.clerk.verifiedEmail,true);
  });
});
test('missing signed Clerk email denies management readiness without RPC calls',async()=>{
  const f=fixture({email:''});
  await withinFetch(f.fakeFetch,async()=>{
    const body=await (await gateway.fetch(f.req(),f.env)).json();
    assert.equal(body.clerk.verifiedEmail,false);
    assert.equal(body.supabase.clerkManagementRead,false);
    assert.equal(body.neon.clerkManagementRead,false);
    assert.equal(f.calls.some(url=>url.includes('/rpc/')),false);
  });
});
test('Neon 503 marks backup red without claiming whole site is ready',async()=>{
  const f=fixture({neonStatus:503});
  await withinFetch(f.fakeFetch,async()=>{
    const body=await (await gateway.fetch(f.req(),f.env)).json();
    assert.equal(body.supabase.publicRead,true);
    assert.equal(body.neon.publicRead,false);
    assert.equal(body.neon.clerkManagementRead,false);
    assert.equal(body.writingTested,false);
  });
});
test('health method is read-only and cannot be POSTed',async()=>{
  const f=fixture();
  const response=await gateway.fetch(f.req('POST'),f.env);
  assert.equal(response.status,405);
  assert.deepEqual(f.authority,[]);
});
