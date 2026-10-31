import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
// Node has no cloudflare:workers runtime. Substitute only the DO base constructor;
// the actual Worker source, crypto, URL validation and fetch handler are tested.
const source=readFileSync(new URL('../workers/loc-authority/index.mjs',import.meta.url),'utf8')
  .replace("import { DurableObject } from 'cloudflare:workers';",
    "class DurableObject { constructor(ctx,env){this.ctx=ctx;this.env=env;} }");
const {LocAuthorityState,default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

function fakeStorage(){
  const map=new Map();
  return {
    async get(key){return map.get(key)},
    async put(key,value){map.set(key,value)},
    async list({prefix}){return new Map([...map].filter(([key])=>key.startsWith(prefix)))}
  };
}
function makeControl(env){
  const data=new LocAuthorityState({storage:fakeStorage()},env);
  env.LOC_AUTHORITY_STATE={idFromName:()=>({id:'test'}),get:()=>data};
  return data;
}
async function makeKeys(){
  const pair=await crypto.subtle.generateKey(
    {name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},
    true,['sign','verify']);
  const spki=new Uint8Array(await crypto.subtle.exportKey('spki',pair.publicKey));
  const pem='-----BEGIN PUBLIC KEY-----\n'+Buffer.from(spki).toString('base64')+'\n-----END PUBLIC KEY-----';
  return {pair,pem};
}
function b64(value){return Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');}
async function bearer(pair,overrides={}){
  const now=Math.floor(Date.now()/1000);
  const header=b64({alg:'RS256',typ:'JWT'});
  const payload=b64({
    iss:'https://clerk.example.test',azp:'https://loc.example.test',
    sub:'user_ABC123',sid:'sess_TEST',iat:now-1,nbf:now-1,exp:now+60,...overrides
  });
  const message=header+'.'+payload;
  const signature=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,
    new TextEncoder().encode(message)));
  return message+'.'+Buffer.from(signature).toString('base64url');
}
function envFor(pem){
  const env={
    LOC_CLERK_ISSUER:'https://clerk.example.test',
    LOC_CLERK_JWT_PUBLIC_KEY:pem,
    LOC_CONTROL_ORIGIN:'https://loc.example.test',
    LOC_RECOVERY_ROOT_CLERK_IDS:'user_ABC123',
    LOC_CONTROL_ENCRYPTION_KEY:Buffer.alloc(32,17).toString('base64')
  };
  return env;
}
function request(path,token,method='GET',body,origin='https://loc.example.test'){
  return new Request('https://control.example.test'+path,{
    method,headers:{origin,authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})
  });
}
test('independent Clerk control verifies JWT signatures + issuer + authorized party + root identity',async()=>{
  const {pair,pem}=await makeKeys(),env=envFor(pem);
  makeControl(env);
  const valid=await bearer(pair);
  const ok=await worker.fetch(request('/v1/me',valid),env);
  assert.equal(ok.status,200);
  assert.equal((await ok.json()).subject,'user_ABC123');
  for(const claims of [
    {iss:'https://wrong.example'}, {azp:'https://evil.test'},
    {sub:'user_NOROOT'}, {exp:1},{nbf:Math.floor(Date.now()/1000)+90}
  ]){
    const response=await worker.fetch(request('/v1/me',await bearer(pair,claims)),env);
    assert.ok([401,403].includes(response.status));
  }
  const mangled=valid.slice(0,-3)+'abc';
  assert.equal((await worker.fetch(request('/v1/me',mangled),env)).status,401);
  assert.equal((await worker.fetch(request('/v1/me',valid,'GET',null,'https://evil.test'),env)).status,403);
});
test('database recovery stores encrypted connection credentials outside any business database',async()=>{
  const {pair,pem}=await makeKeys(),env=envFor(pem);
  const store=makeControl(env),token=await bearer(pair);
  const profile={
    engine:'mysql',host:'db.example.test',port:3306,database:'loc',username:'locuser',
    password:'secret-value',label:'Cloud SQL MySQL'
  };
  const added=await worker.fetch(request('/v1/targets/cloudsql',token,'PUT',profile),env);
  assert.equal(added.status,200);
  assert.doesNotMatch(JSON.stringify(await added.json()),/secret-value/);
  const list=await worker.fetch(request('/v1/state',token),env);
  const state=await list.json();
  assert.equal(state.targets[0].engine,'mysql');
  assert.doesNotMatch(JSON.stringify(state),/secret-value/);
  const privateProfile=await store.getProfileForGateway('cloudsql');
  assert.equal(privateProfile.password,'secret-value');
  assert.equal((await worker.fetch(request('/v1/primary',token,'POST',{id:'cloudsql'}),env)).status,200);
  assert.equal((await store.listState()).primary_id,'cloudsql');
  const edited=await worker.fetch(request('/v1/targets/cloudsql',token,'PUT',{...profile,password:''}),env);
  assert.equal(edited.status,200);
  assert.equal((await store.getProfileForGateway('cloudsql')).password,'secret-value');
});
test('fails closed if Clerk or independent control service is unconfigured',async()=>{
  const env={LOC_CONTROL_ORIGIN:'https://loc.example.test'};
  const response=await worker.fetch(new Request('https://control.example.test/v1/state'),env);
  assert.equal(response.status,503);
  assert.equal((await response.json()).error,'Recovery control unavailable');
});

test('verified non-root identity has no Authority grants until explicitly assigned',async()=>{
  const {pair,pem}=await makeKeys(),env=envFor(pem),control=makeControl(env);
  const token=await bearer(pair,{sub:'user_NONROOT'});
  const identity=await worker.fetch(request('/v1/identity',token),env);
  assert.equal(identity.status,200);
  assert.equal((await identity.json()).subject,'user_NONROOT');
  assert.equal((await worker.fetch(request('/v1/state',token),env)).status,403);
  assert.equal(await control.mayAccess({provider:'clerk',subject:'user_NONROOT',scope:'lo3rwang',action:'write'}),false);
  const root=await bearer(pair);
  const grant={provider:'clerk',subject:'user_NONROOT',scope:'lo3rwang',actions:['read','write'],expires_at:Date.now()+3600000};
  assert.equal((await worker.fetch(request('/v1/grants',root,'PUT',grant),env)).status,200);
  assert.equal(await control.mayAccess({provider:'clerk',subject:'user_NONROOT',scope:'lo3rwang',action:'write'}),true);
  assert.equal(await control.mayAccess({provider:'clerk',subject:'user_NONROOT',scope:'lrunes',action:'write'}),false);
  assert.equal(await control.mayAccess({provider:'clerk',subject:'user_NONROOT',scope:'lo3rwang',action:'configure'}),false);
  const id='clerk:user_NONROOT:lo3rwang';
  assert.equal((await worker.fetch(request('/v1/revoke',root,'POST',{key:id}),env)).status,200);
  assert.equal(await control.mayAccess({provider:'clerk',subject:'user_NONROOT',scope:'lo3rwang',action:'write'}),false);
  const expired=await control.putGrant({...grant,expires_at:Date.now()+50});
  assert.equal(expired.scope,'lo3rwang');
  await new Promise(resolve=>setTimeout(resolve,70));
  assert.equal(await control.mayAccess({provider:'clerk',subject:'user_NONROOT',scope:'lo3rwang',action:'write'}),false);
});
test('optional secondary OIDC recovers admin access without Clerk being configured',async()=>{
  const {pair,pem}=await makeKeys();
  const env={
    LOC_SECONDARY_ISSUER:'https://oidc.example.test',
    LOC_SECONDARY_JWT_PUBLIC_KEY:pem,
    LOC_SECONDARY_AUDIENCE:'loc-recovery',
    LOC_RECOVERY_ROOT_SECONDARY_SUBJECTS:'operator_1',
    LOC_CONTROL_ORIGIN:'https://loc.example.test',
    LOC_CONTROL_ENCRYPTION_KEY:Buffer.alloc(32,33).toString('base64')
  };
  makeControl(env);
  const token=await bearer(pair,{iss:'https://oidc.example.test',sub:'operator_1',aud:'loc-recovery'});
  assert.equal((await worker.fetch(request('/v1/me',token),env)).status,200);
  const bad=await bearer(pair,{iss:'https://oidc.example.test',sub:'operator_1',aud:'untrusted'});
  assert.equal((await worker.fetch(request('/v1/me',bad),env)).status,401);
});
test('static recovery page cannot mount AppShell, run home Auth hooks or depend on Next build env',()=>{
  const page=readFileSync(new URL('../public/recovery/index.html',import.meta.url),'utf8');
  const settings=JSON.parse(readFileSync(new URL('../public/recovery/config.json',import.meta.url),'utf8'));
  assert.match(page,/\bclerk\.load\(/);
  assert.match(page,/<title>LOC · 獨立復原控制<\/title>/);
  assert.doesNotMatch(page,/<script[^>]+src=|supabase-js|neon-auth|NEXT_PUBLIC_/);
  assert.deepEqual(Object.keys(settings).sort(),['controlUrl','frontendApiUrl','publishableKey']);
});
