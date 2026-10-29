import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createDatabaseClient} from '../app/loc/db-contract.mjs';

const treeSql=readFileSync(
  new URL('../supabase/migrations/20261029226100_keyword_tree_readers.sql',import.meta.url),'utf8');
const retirementSql=readFileSync(
  new URL('../supabase/migrations/20261030230000_keyword_class_base62_read.sql',import.meta.url),'utf8');

const catalog=(uid)=>({class_uid:uid,rows:[
  {uid,type:'class',name:'Sample',desc:'',lists:[],uid_lists:[]}
]});

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

test('UID tree Class lookup preserves case-sensitive Base62 characters',async()=>{
  const {db,requests}=client({published:catalog('eeCc')});
  assert.deepEqual(await db.readKeywordClass('lo3rwang','eeCc'),catalog('eeCc'));
  assert.equal(requests[0].name,'read_keyword_tree_catalog');
  assert.equal(requests[0].args.p_class_uid,'eeCc');
  assert.equal(await db.readKeywordClass('lo3rwang','eecc'),null);
  assert.equal(requests[1].args.p_class_uid,'eecc');
  assert.equal(await db.readKeywordClass('lo3rwang','ee!c'),null);
  assert.equal(requests.length,2);
});

test('private Class requires current verified Scope-owner session',async()=>{
  const {db,requests}=client({published:null,privateRows:catalog('wDov'),login:true});
  assert.deepEqual(await db.readKeywordClass('lrunes','wDov'),catalog('wDov'));
  assert.deepEqual(requests.map(x=>x.kind),['public','private']);
});

test('guest and mismatched identity cannot fetch private Keywords',async()=>{
  for(const options of [{login:false},{login:true,verified:false}]){
    const {db,requests}=client(options);
    assert.equal(await db.readKeywordClass('lrunes','wDov'),null);
    assert.deepEqual(requests.map(x=>x.kind),['public']);
  }
});

test('Postgres catalog guards active Class and Scope authorization without case folding',()=>{
  assert.match(treeSql,/v_class IS NULL OR v_class !~ '\^\[A-Za-z0-9\]\{4\}\$'/);
  assert.match(treeSql,/silver\.can_manage_scope\(v_scope\)/);
  assert.match(treeSql,/current_keyword_class_uid FROM %s WHERE id=\$1/);
  assert.match(treeSql,/REVOKE ALL ON FUNCTION silver\.read_keyword_tree_catalog\(text,text\) FROM PUBLIC/);
  assert.doesNotMatch(treeSql,/upper\s*\(/i);
  assert.match(retirementSql,/DROP FUNCTION IF EXISTS silver\.read_keyword_class_by_uid\(text,text\)/);
});
