import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {handleMcp,protectedResourceMetadata,preflight,MCP_RESOURCE,CLERK_ISSUER} from '../app/loc/mcp/router.mjs';

const b64url=bytes=>Buffer.from(bytes).toString('base64url');
const encode=x=>b64url(Buffer.from(JSON.stringify(x)));
const pair=await webcrypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
  publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const publicKey={...await webcrypto.subtle.exportKey('jwk',pair.publicKey),kid:'test-key'};
const originalFetch=globalThis.fetch;
let jwksQueries=0;
globalThis.fetch=async url=>{if(String(url)!==CLERK_ISSUER+'/.well-known/jwks.json')throw Error('unexpected JWKS URL');
  jwksQueries++;return Response.json({keys:[publicKey]});};
async function token(claimOverrides={}){
  const now=Math.floor(Date.now()/1000);
  const hdr=encode({alg:'RS256',kid:'test-key',typ:'JWT'});
  const body=encode({iss:CLERK_ISSUER,sub:'user_12345',aud:MCP_RESOURCE,
    exp:now+3600,iat:now-30,scope:'profile email',...claimOverrides});
  const sig=await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(hdr+'.'+body));
  return hdr+'.'+body+'.'+b64url(sig);
}
function req(method='POST',bearer='',body){return new Request(MCP_RESOURCE,{method,
  headers:bearer?{authorization:'Bearer '+bearer}:undefined,
  ...(body?{body:JSON.stringify(body)}:{})});}
const rpc=(method,params={})=>({jsonrpc:'2.0',id:1,method,params});

test('Clerk check: anonymous GET is 401 with RFC9728 OAuth challenge',async()=>{
  const res=await handleMcp(req('GET'));
  assert.equal(res.status,401);
  assert.match(res.headers.get('www-authenticate'),/Bearer resource_metadata="https:\/\/loc\.lo3rwang\.cc\/\.well-known\/oauth-protected-resource\/mcp"/);
});
test('Clerk check: metadata is public JSON with correct resource and authorization server',async()=>{
  const res=protectedResourceMetadata();
  assert.equal(res.status,200);
  assert.match(res.headers.get('content-type'),/application\/json/);
  assert.deepEqual(await res.json(),{resource:MCP_RESOURCE,authorization_servers:[CLERK_ISSUER],
    bearer_methods_supported:['header'],scopes_supported:['profile','email']});
});
test('CORS OPTIONS is public',()=>assert.equal(preflight().status,204));
test('Missing/invalid token is rejected',async()=>{
  assert.equal((await handleMcp(req('POST','bad.token',rpc('initialize')))).status,401);
  assert.equal((await handleMcp(req('POST',await token({aud:'https://other.site/mcp'}),rpc('initialize')))).status,401);
  assert.equal((await handleMcp(req('POST',await token({exp:0}),rpc('initialize')))).status,401);
});
test('Valid Clerk JWT can initialize, discover a read-only tool, and ping',async()=>{
  const jwt=await token();
  let r=await handleMcp(req('POST',jwt,rpc('initialize',{protocolVersion:'2025-06-18'})));
  assert.equal(r.status,200);assert.equal((await r.json()).result.serverInfo.name,'loc-mcp');
  r=await handleMcp(req('POST',jwt,rpc('tools/list')));
  const tools=(await r.json()).result.tools;
  assert.equal(tools[0].name,'loc_connection_status');
  r=await handleMcp(req('POST',jwt,rpc('tools/call',{name:'loc_connection_status',arguments:{}})));
  const contents=(await r.json()).result.content;
  assert.equal(JSON.parse(contents[0].text).galaxyWriteEnabled,false);
  r=await handleMcp(req('POST',jwt,rpc('ping')));
  assert.deepEqual((await r.json()).result,{});
  assert.ok(jwksQueries>=1);
});

test.after(()=>{globalThis.fetch=originalFetch;});
