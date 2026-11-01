import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

function harness(){
  const source=readFileSync(new URL('../app/loc/loc-user-store.mjs',import.meta.url),'utf8')
    .replace(/^import .*$/gm,'').replace(/^export /gm,'');
  let session={user:{id:'user_OAuth1'},oauth:{email:'One@Example.com'}};
  let stored=null,reads=0,inserts=0,writes=0;
  const defaults=()=>({
    culture:{time:'era',display:'density',unit:'day',sort:'desc'},
    statics:{display:'source',unit:'day',sort:'desc'},
    trace:{display:'anchor',time:'none',sort:'desc'},
    search:{field:'content',sort:'asc'},keyword:'none'
  });
  const select=()=>Promise.resolve({data:stored&&session?.user?.id===stored.owner_id?[{...stored}]:[],error:null});
  const dbAuthRelation=()=>{
    const filters=[];
    return {
      select(){return {limit:async()=>{reads++;return select();}};},
      insert(rows){return {select:async()=>{
        inserts++;
        if(stored)return {error:{code:'23505',message:'duplicate owner'},data:null};
        stored={uid:'Aa0Bb123',owner_id:session.user.id,
          email:rows[0].email,...defaults(),updated_at:'2026-11-02T00:00:00Z'};
        return {data:[{...stored}],error:null};
      }};},
      update(patch){return {
        eq(key,value){filters.push([key,value]);return this;},
        async select(){
          writes++;
          if(!stored||filters.some(([k,v])=>stored[k]!==v))
            return {data:[],error:null};
          stored={...stored,...patch};
          return {data:[{...stored}],error:null};
        }
      };}
    };
  };
  const names=new Function('dbAuthRelation','getAccountSession',source+
    ';return {normalizeLocUser,validateLocUserField,loadOrCreateLocUser,saveLocUserField};'
  )(dbAuthRelation,async()=>session);
  return {...names,session(value){session=value;},counts(){return {reads,inserts,writes}},stored(){return stored}};
}
test('OAuth creates exactly one 8-character record, later logins load same UID',async()=>{
  const h=harness();
  const first=await h.loadOrCreateLocUser();
  assert.match(first.uid,/^[A-Za-z0-9]{8}$/);
  assert.equal(first.email,'one@example.com');
  assert.deepEqual(JSON.parse(JSON.stringify(first.culture)),{
    time:'era',display:'density',unit:'day',sort:'desc'
  });
  const again=await h.loadOrCreateLocUser();
  assert.equal(again.uid,first.uid);
  assert.equal(h.counts().inserts,1);
});
test('changing one category leaves the other four settings and UID untouched',async()=>{
  const h=harness();
  const first=await h.loadOrCreateLocUser();
  const saved=await h.saveLocUserField(first.uid,'culture',
    {time:'anchor',display:'keywords',unit:'day',sort:'asc'});
  assert.equal(saved.culture.time,'anchor');
  assert.equal(saved.statics.display,'source');
  assert.equal(saved.trace.display,'anchor');
  assert.equal(saved.search.field,'content');
  assert.equal(saved.keyword,'none');
  assert.equal(saved.uid,first.uid);
});
test('only verified OAuth identity may read or write, email tracks verified login',async()=>{
  const h=harness();
  const first=await h.loadOrCreateLocUser();
  h.session({user:{id:'user_OAuth1'},oauth:{email:'Verified@Example.com'}});
  const refreshed=await h.loadOrCreateLocUser();
  assert.equal(refreshed.uid,first.uid);
  assert.equal(refreshed.email,'verified@example.com');
  h.session(null);
  await assert.rejects(h.loadOrCreateLocUser(),/OAuth/);
  await assert.rejects(h.saveLocUserField(first.uid,'culture',first.culture),/OAuth/);
  h.session({user:{id:'user_another'},oauth:{email:'other@example.com'}});
  await assert.rejects(h.loadOrCreateLocUser(),/OAuth 個人設定 UID|OAuth 個人設定與登入身分|個人設定建立衝突/);
});
test('reject unknown columns, fabricated keyword IDs and invalid preferences',()=>{
  const h=harness();
  assert.throws(()=>h.validateLocUserField('owner_id','other'),/不允許/);
  assert.throws(()=>h.validateLocUserField('culture',{time:'invalid'}),/不符合/);
  assert.throws(()=>h.validateLocUserField('keyword','xxx:<script>'),/四碼/);
  assert.equal(h.validateLocUserField('keyword','myscope:Ab3z'),'myScope:Ab3z');
});
