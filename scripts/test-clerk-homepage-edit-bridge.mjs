import test from 'node:test';
import assert from 'node:assert/strict';
import {clerkSqlClaims} from '../app/loc/auth/clerk-sql-claims.mjs';
import {RPC_ALLOWLIST,buildAllowlistedRpcQuery} from '../app/loc/providers/kysely-runtime.mjs';
import {readFileSync} from 'node:fs';

const issuer='https://example.clerk.accounts.dev';
const origin='https://loc.example.org';
const principal={iss:issuer,azp:origin,sub:'user_ABC123',sid:'sess_ABC123',
  email:'OWNER@example.org',email_verified:true};
test('verified signed claims map to existing SQL role and email',()=>{
  const result=clerkSqlClaims(principal,{issuer,origin});
  assert.deepEqual(result,{role:'authenticated',sub:'user_ABC123',
    email:'owner@example.org',iss:issuer,sid:'sess_ABC123',provider:'clerk'});
  assert.equal(Object.isFrozen(result),true);
});
test('unsigned, other-origin and unverified claims are never promoted',()=>{
  for(const payload of [{...principal,email_verified:false},
    {...principal,azp:'https://attacker.example'},
    {...principal,sub:'bad'},{...principal,iss:'https://fake.example'},
    {...principal,email:'owner@example.org.evil'},
    {...principal,email:''},{...principal,sid:'not-a-session'}]){
    assert.throws(()=>clerkSqlClaims(payload,{issuer,origin}));
  }
});
test('home editor can read existing permission RPC through Kysely as a rowset',()=>{
  assert.deepEqual(RPC_ALLOWLIST['silver.get_my_scope_management'],[]);
  const built=buildAllowlistedRpcQuery({kind:'rpc',schema:'silver',
    name:'get_my_scope_management',args:{}});
  assert.equal(built.returnsRows,true);
});
test('legacy SQL Auth continues to validate Supabase user independently',()=>{
  const code=readFileSync(new URL('../supabase/functions/loc-kysely/index.ts',import.meta.url),'utf8');
  assert.match(code,/authClient\.auth\.getUser\(token\)/);
  assert.match(code,/verifyClerkForSql\(token\)/);
  assert.match(code,/jwtVerify\(token,clerkKeys/);
  assert.match(code,/clerkSqlClaims\(payload,/);
});
test('independent Clerk editor never writes to Neon',()=>{
  const source=readFileSync(new URL('../app/loc/providers/clerk-gateway.mjs',import.meta.url),'utf8');
  assert.match(source,/getAccessToken,fetch:fetchImpl/);
  assert.match(source,/loc-kysely-clerk/);
  assert.doesNotMatch(source,/createNeonPrimaryAdapter|createBackupPublicAdapter/);
});
