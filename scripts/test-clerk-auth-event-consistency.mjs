import test from 'node:test';
import assert from 'node:assert/strict';
import {createClerkAccountAdapter} from '../app/loc/auth/clerk-browser.mjs';
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('transient empty Clerk SDK event does not sign out an existing verified editor',async()=>{
  let listener=null;
  const clerk={
    user:{id:'user_TEST123'},
    session:{getToken:async()=>'signed.jwt.token'},
    addListener:callback=>{listener=callback;return ()=>{listener=null;}}
  };
  const adapter=createClerkAccountAdapter({
    authorityOrigin:'https://authority.example.org',siteOrigin:'https://loc.example.org',
    loadClerk:async()=>clerk,
    fetchImpl:async()=>({ok:true,json:async()=>({
      provider:'clerk',subject:'user_TEST123',session:'sess_TEST123',email:'owner@example.org'
    })})
  });
  const events=[];
  const sub=adapter.auth.onAuthStateChange((event,session)=>{
    events.push([event,session?.user?.id||'']);
  });
  await flush();await flush();
  assert.ok(events.some(([event,id])=>event==='INITIAL_SESSION'&&id==='user_TEST123'));
  const before=events.length;
  clerk.user=null;
  listener();
  clerk.user={id:'user_TEST123'};
  await flush();await flush();
  assert.equal(events.length,before,'transient false status is not a real SIGNED_OUT');
  clerk.user=null;clerk.session=null;
  listener();
  await flush();await flush();
  assert.equal(events.at(-1)[0],'SIGNED_OUT');
  assert.equal(events.at(-1)[1],'');
  sub.data.subscription.unsubscribe();
});
