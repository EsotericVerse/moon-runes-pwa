import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateKeyPairSync,sign,webcrypto} from 'node:crypto';
const path=new URL('../workers/loc-authority/index.mjs',import.meta.url);
const source=readFileSync(path,'utf8')
  .replace("import { DurableObject } from 'cloudflare:workers';","class DurableObject {constructor(ctx,env){this.ctx=ctx;this.env=env}};");
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'clerk-test-kid',alg:'RS256',use:'sig'};
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const b64bytes=value=>Buffer.from(value).toString('base64url');
const issuer='https://clerk-test.example.org',origin='https://loc.example.org';
function jwt(overrides={}){
  const now=Math.floor(Date.now()/1000);
  const head=b64({alg:'RS256',kid:jwk.kid,typ:'JWT'});
  const payload=b64({iss:issuer,azp:origin,sub:'user_TEST123',
    sid:'sess_TEST123',iat:now,nbf:now-5,exp:now+300,
    email:'owner@example.org',email_verified:true,...overrides});
  const message=head+'.'+payload;
  return message+'.'+b64bytes(sign('RSA-SHA256',Buffer.from(message),privateKey));
}
const env={
  LOC_CLERK_ISSUER:issuer,LOC_RECOVERY_ROOT_CLERK_IDS:'user_TEST123',
  LOC_CONTROL_ORIGIN:origin,
  LOC_CONTROL_ENCRYPTION_KEY:Buffer.alloc(32).toString('base64'),
  LOC_AUTHORITY_STATE:{idFromName:()=>({}),get:()=>({})}
};
async function verified(token){
  const previous=globalThis.fetch;
  globalThis.fetch=async value=>{
    assert.equal(String(value),issuer+'/.well-known/jwks.json');
    return new Response(JSON.stringify({keys:[jwk]}),{status:200});
  };
  try{
    const request=new Request('https://authority.example.org/v1/identity',{
      headers:{authorization:'Bearer '+token,origin}
    });
    return await worker.fetch(request,env);
  }finally{globalThis.fetch=previous}
}
test('Clerk RS256 verified email is accepted only after matching issuer, signature and origin',async()=>{
  const response=await verified(jwt());
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.email,'owner@example.org');
  assert.equal(body.subject,'user_TEST123');
});
test('unverified email never becomes a management email',async()=>{
  const response=await verified(jwt({email_verified:false}));
  assert.equal(response.status,200);
  assert.equal((await response.json()).email,'');
});
test('JWT with malicious email is not trusted without Clerk signature',async()=>{
  const token=jwt();
  const [header,payload,signature]=token.split('.');
  const altered=b64({...JSON.parse(Buffer.from(payload,'base64url').toString()),email:'hacker@example.org'});
  const response=await verified([header,altered,signature].join('.'));
  assert.equal(response.status,401);
});
test('mismatched Google/Clerk origin cannot enter management session',async()=>{
  const response=await verified(jwt({azp:'https://malicious.example'}));
  assert.equal(response.status,401);
});
