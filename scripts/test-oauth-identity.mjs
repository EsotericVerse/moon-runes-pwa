import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {parseVerifiedGoogleOAuthUser} from '../app/loc/oauth-identity.mjs';
import {createDatabaseClient} from '../app/loc/db-contract.mjs';

const validUser=(provider='google',oauthEmail='owner@example.com')=>({
  id:'supabase-user-1',email:'owner@example.com',
  identities:[{provider,user_id:'supabase-user-1',provider_id:'google-uid-77',
    identity_data:{email:oauthEmail,email_verified:true}}]
});

test('Google identity email is parsed from verified OAuth identity',()=>{
  const identity=parseVerifiedGoogleOAuthUser(validUser());
  assert.deepEqual({...identity},{provider:'google',email:'owner@example.com',providerId:'google-uid-77',userId:'supabase-user-1'});
  assert.equal(Object.isFrozen(identity),true);
});

test('user.email alone is not Google OAuth proof',()=>{
  assert.throws(()=>parseVerifiedGoogleOAuthUser({id:'supabase-user-1',email:'owner@example.com',identities:[]}),/Google OAuth/);
});
test('other OAuth/email identities are rejected',()=>{
  assert.throws(()=>parseVerifiedGoogleOAuthUser(validUser('email')),/Google OAuth/);
});
test('mismatched Google identity email is rejected',()=>{
  assert.throws(()=>parseVerifiedGoogleOAuthUser(validUser('google','other@example.com')),/不一致/);
});
test('unverified OAuth identity email is rejected',()=>{
  const u=validUser();u.identities[0].identity_data.email_verified=false;
  assert.throws(()=>parseVerifiedGoogleOAuthUser(u),/尚未驗證/);
});
test('missing Google email_verified claim is rejected',()=>{
  const u=validUser();delete u.identities[0].identity_data.email_verified;
  assert.throws(()=>parseVerifiedGoogleOAuthUser(u),/尚未驗證/);
});
test('Google identity belonging to different Supabase user is rejected',()=>{
  const u=validUser();u.identities[0].user_id='other-user';
  assert.throws(()=>parseVerifiedGoogleOAuthUser(u),/Google OAuth/);
});
test('Google identity without provider ID is rejected',()=>{
  const u=validUser();u.identities[0].provider_id='';
  assert.throws(()=>parseVerifiedGoogleOAuthUser(u),/識別碼/);
});

// Run the real production database client with simulated Auth API responses.
const makeSessionReader=(auth)=>createDatabaseClient({
  publicClient:{schema:()=>({})},
  authClient:{schema:()=>({})},
  auth:{...auth,signInWithOAuth:async()=>({error:null}),signOut:async()=>({error:null})}
}).getAccountSession;
const session={user:{id:'supabase-user-1',email:'owner@example.com'},access_token:'oauth-jwt'};
const fakeAuth=(user=validUser(),getUserError=null)=>({
  getSession:async()=>({data:{session},error:null}),
  getUser:async token=>{
    assert.equal(token,'oauth-jwt');
    return {data:{user},error:getUserError};
  }
});
test('production contract verifies JWT with Auth.getUser and returns parsed OAuth email',async()=>{
  const read=makeSessionReader(fakeAuth());
  const result=await read();
  assert.equal(result.oauth.provider,'google');
  assert.equal(result.oauth.email,'owner@example.com');
  assert.equal(result.user.email,result.oauth.email);
});
test('production contract denies user.email if Auth.getUser fails',async()=>{
  const read=makeSessionReader(fakeAuth(null,{message:'invalid JWT'}));
  await assert.rejects(read(),/invalid JWT/);
});
test('production contract denies mismatching OAuth user ID',async()=>{
  const read=makeSessionReader(fakeAuth({...validUser(),id:'other-user'}));
  await assert.rejects(read(),/Session 不一致/);
});
test('production contract denies missing Google identity from verified user',async()=>{
  const read=makeSessionReader(fakeAuth({...validUser(),identities:[]}));
  await assert.rejects(read(),/Google OAuth/);
});
test('settings account panel subscribes to verified session instead of passive cache',()=>{
  const account=readFileSync(new URL('../app/loc/use-account.js',import.meta.url),'utf8');
  const settings=readFileSync(new URL('../app/loc/GlobalSettings.jsx',import.meta.url),'utf8');
  assert.ok(account.includes('VERIFIED_SESSION_KEY'));
  assert.ok(account.includes('sessionOnly?(enabled?VERIFIED_SESSION_KEY:SESSION_KEY)'));
  assert.ok(settings.includes("useAccount({enabled:section==='account',sessionOnly:true})"));
  assert.ok(settings.includes('Google OAuth（已驗證）：{account.email}'));
  assert.ok(!settings.includes('account.email||account.user.email'));
});
