import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createDatabaseClient} from '../app/loc/db-contract.mjs';

const sql=readFileSync(new URL('../supabase/migrations/20261030230000_keyword_class_base62_read.sql',import.meta.url),'utf8');

function client({published=null,privateRows=null,login=false,verified=true}={}){
  const requests=[];
  const publicClient={schema:schema=>({rpc:async(name,args)=>{
    requests.push({kind:'public',schema,name,args});
    return {data:published,error:null};
  }})};
  const authClient={schema:schema=>({rpc:async(name,args)=>{
    requests.push({kind:'private',schema,name,args});
    return {data:privateRows,error:null};
  }})};
  const auth={
    getSession:async()=>({data:{session:login?{user:{id:'owner-1'},access_token:'valid.jwt.token'}:null},error:null}),
    getUser:async()=>({data:{user:verified?{id:'owner-1'}:{id:'other-user'}},error:null}),
    signInWithOAuth:async()=>({error:null}),
    signOut:async()=>({error:null})
  };
  return {db:createDatabaseClient({publicClient,authClient,auth}),requests};
}

test('Class UID lookup preserves every Base62 character and does not fold case',async()=>{
  const {db,requests}=client({published:[{class_uid:'eeCc',keyword_id:110}]});
  const rows=await db.readKeywordClass('lo3rwang','eeCc');
  assert.equal(rows[0].class_uid,'eeCc');
  assert.equal(requests[0].args.p_class_uid,'eeCc');
  assert.deepEqual(await db.readKeywordClass('lo3rwang','eecc'),[{class_uid:'eeCc',keyword_id:110}]);
  assert.equal(await db.readKeywordClass('lo3rwang','ee!c'),null);
});

test('private Class needs current verified owner session',async()=>{
  const {db,requests}=client({published:null,privateRows:[{class_uid:'wDov'}],login:true});
  const rows=await db.readKeywordClass('lrunes','wDov');
  assert.equal(rows[0].class_uid,'wDov');
  assert.deepEqual(requests.map(x=>x.kind),['public','private']);
});

test('guest and mismatched identity cannot fetch private Keywords',async()=>{
  for(const options of [{login:false},{login:true,verified:false}]){
    const {db,requests}=client(options);
    assert.equal(await db.readKeywordClass('lrunes','wDov'),null);
    assert.deepEqual(requests.map(x=>x.kind),['public']);
  }
});

test('portable SQL RPC requires current shared Class or verified scope management',()=>{
  assert.match(sql,/v_uid !~ '\^\[0-9A-Za-z\]\{4\}\$'/);
  assert.match(sql,/silver\.can_manage_scope\(v_scope\)/);
  assert.match(sql,/current_keyword_class_uid=\$1/);
  assert.match(sql,/REVOKE ALL ON FUNCTION silver\.read_keyword_class_by_uid\(text,text\) FROM PUBLIC/);
  assert.doesNotMatch(sql,/upper\s*\(/i);
});
