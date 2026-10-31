import test from 'node:test';
import assert from 'node:assert/strict';
import {createClerkAccountAdapter} from '../app/loc/auth/clerk-browser.mjs';
import {createIndependentClerkIdentity} from '../app/loc/auth/clerk-identity.mjs';

const origin='https://loc.example.org';
const authority='https://control.example.org';
const jwt='header.payload.signature';
function setup({email='editor@example.org',subject='user_123',status=200}={}){
  const calls=[],navigation=[];
  const clerk={
    isSignedIn:true,user:{id:subject},session:{getToken:async()=>jwt},
    signOut:async()=>{clerk.user=null;clerk.session=null;clerk.isSignedIn=false},
    addListener:callback=>{clerk.listener=callback;return ()=>{clerk.listener=null}}
  };
  const browser=createClerkAccountAdapter({
    authorityOrigin:authority,siteOrigin:origin,
    loadClerk:async()=>clerk,navigate:path=>navigation.push(path),
    fetchImpl:async(url,init)=>{
      calls.push({url,init});
      return {ok:status===200,status,json:async()=>({
        provider:'clerk',subject,session:'sess_123',email
      })};
    }
  });
  return {browser,clerk,calls,navigation};
}

test('Clerk user and signed email must be confirmed by Authority before account use',async()=>{
  const {browser,calls}=setup();
  const value=await browser.auth.getVerifiedSession();
  assert.equal(value.oauth.email,'editor@example.org');
  assert.equal(value.user.id,'user_123');
  assert.equal(value.session.access_token,jwt);
  assert.equal(calls[0].url,authority+'/v1/identity');
  assert.equal(calls[0].init.headers.authorization,'Bearer '+jwt);
});
test('Authority error cannot silently turn into a valid local account',async()=>{
  const {browser}=setup({status:403});
  const result=await browser.auth.getSession();
  assert.equal(result.data.session,null);
  assert.match(String(result.error?.message),/403/);
});
test('missing verified email is not accepted as management identity',async()=>{
  const {browser}=setup({email:''});
  await assert.rejects(browser.auth.getVerifiedSession(),/verified signed email/);
});
test('Client cannot fabricate another Clerk user with a caller-provided access token',async()=>{
  const {browser}=setup();
  const result=await browser.auth.getUser('invalid-token');
  assert.equal(result.data.user,null);
  assert.ok(result.error);
});
test('Clerk OAuth directs to standalone LOC page with same-origin return',async()=>{
  const {browser,navigation}=setup();
  const result=await browser.auth.signInWithOAuth({
    provider:'google',options:{redirectTo:origin+'/local/settings/?tab=account'}
  });
  assert.equal(result.error,null);
  assert.equal(navigation[0],
    '/login/index.html?return_to=%2Flocal%2Fsettings%2F%3Ftab%3Daccount');
});
test('Independent adapter can be created without browser location on static builds',()=>{
  const client=createIndependentClerkIdentity({
    authorityOrigin:authority,loadClerk:async()=>null,
    siteOrigin:undefined,fetchImpl:async()=>{throw Error('No network')}
  });
  assert.equal(typeof client.verifiedIdentity,'function');
});
