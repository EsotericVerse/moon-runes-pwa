import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createIndependentClerkIdentity,clerkReturnPath} from '../app/loc/auth/clerk-identity.mjs';

const siteOrigin='https://loc.example.org';
const authorityOrigin='https://control.example.org';
function fixture({id='user_test',status=200,subject=id,token='signed.jwt.token'}={}){
  const requests=[],navigations=[];
  const clerk={
    user:id?{id}:null,
    session:id?{getToken:async()=>token}:null,
    signOut:async()=>{clerk.user=null;clerk.session=null;},
    addListener:callback=>{clerk.listener=callback;return ()=>{clerk.listener=null;}}
  };
  const adapter=createIndependentClerkIdentity({
    siteOrigin,authorityOrigin,
    loadClerk:async()=>clerk,
    navigate:path=>navigations.push(path),
    fetchImpl:async(url,init)=>{
      requests.push({url,init});
      return {ok:status===200,status,json:async()=>({
        provider:'clerk',subject,session:'sess_verified'
      })};
    }
  });
  return {clerk,adapter,requests,navigations};
}
test('independent Identity uses only Clerk and a trusted LOC Authority identity check',async()=>{
  const {adapter,requests}=fixture();
  const identity=await adapter.verifiedIdentity();
  assert.equal(identity.subject,'user_test');
  assert.equal(identity.provider,'clerk');
  assert.equal(Object.isFrozen(identity),true);
  assert.equal(requests.length,1);
  assert.equal(requests[0].url,authorityOrigin+'/v1/identity');
  assert.equal(requests[0].init.headers.authorization,'Bearer signed.jwt.token');
  assert.equal(requests[0].init.credentials,'omit');
});
test('unverified, malformed, or mismatching principal is denied',async()=>{
  await assert.rejects(fixture({status:403}).adapter.verifiedIdentity(),/rejected/);
  await assert.rejects(fixture({subject:'user_other'}).adapter.verifiedIdentity(),/mismatch/);
  const signedOut=fixture({id:''});
  assert.equal(await signedOut.adapter.verifiedIdentity(),null);
  assert.equal(signedOut.requests.length,0);
  await assert.rejects(signedOut.adapter.getAccessToken(),/login required/);
});
test('redirect cannot escape LOC origin or leak OAuth through database provider',async()=>{
  const {adapter,navigations}=fixture();
  await adapter.signIn('/local/settings/?section=home');
  assert.equal(navigations[0],'/login/index.html?return_to=%2Flocal%2Fsettings%2F%3Fsection%3Dhome');
  await adapter.signIn('//malicious.example');
  assert.equal(navigations[1],'/login/index.html?return_to=%2Flocal%2Fsettings%2F');
  assert.equal(clerkReturnPath('/admin?area=db',siteOrigin),'/admin?area=db');
  assert.equal(clerkReturnPath('https://malicious.example/x',siteOrigin),'/local/settings/');
});
test('logout and listener are Clerk-only',async()=>{
  const {adapter,clerk}=fixture();
  const snapshots=[];
  const unsubscribe=await adapter.onChange(status=>snapshots.push(status));
  clerk.listener();
  await adapter.signOut();
  clerk.listener();
  unsubscribe();
  assert.deepEqual(snapshots,[true,false]);
});
test('no database adapter or legacy OAuth is imported by independent identity',()=>{
  const source=readFileSync(new URL('../app/loc/auth/clerk-identity.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/supabase-js|neon-primary|get_my_scope_management|signInWithOAuth|auth\/v1/);
  assert.match(source,/\/v1\/identity/);
});
