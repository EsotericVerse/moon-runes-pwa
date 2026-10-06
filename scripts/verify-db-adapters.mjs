import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {relative,resolve,sep} from 'node:path';
import {createDatabaseClient} from '../app/loc/db-contract.mjs';
import {createPostgrestAdapter} from '../app/loc/providers/postgrest.mjs';

const requests=[];
let affected=1;
const session={user:{id:'test-owner',email:'owner@example.test'}};
const auth={
  getSession:async()=>({data:{session},error:null}),
  signInWithOAuth:async()=>({error:null}),
  signOut:async()=>({error:null})
};
const adapter=createPostgrestAdapter({
  url:'https://postgres-gateway.example.test/rest/v1',auth,
  getPublicToken:async()=>'public-read-token',getAuthToken:async()=>'management-token',
  fetch:async(input,init)=>{
    requests.push({url:new URL(input),init});
    const body=String(input).includes('/rpc/')?{count:affected}:[{keyword_id:1,uid:'TEST0001'}];
    return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json','Content-Range':'0-0/1'}});
  }
});
const client=createDatabaseClient(adapter);
const result=await adapter.publicClient.schema('silver').from('any_scope_galaxy')
  .select('uid,title',{count:'exact'}).eq('searchable',true).order('uid').range(10,19);
assert.equal(result.error,null);
assert.equal(result.count,1);
assert.equal(requests.at(-1).init.headers.get('Authorization'),'Bearer public-read-token');
assert.equal(requests.at(-1).init.headers.get('Accept-Profile'),'silver');
assert.equal(requests.at(-1).url.searchParams.get('searchable'),'eq.true');
assert.equal(requests.at(-1).url.searchParams.get('offset'),'10');
assert.equal(requests.at(-1).url.searchParams.get('limit'),'10');

assert.equal((await client.getAccountSession()).user.id,'test-owner');
assert.equal((await client.insertRows('silver.any_scope_galaxy',[{uid:'TEST0001'}])).count,1);
assert.equal(requests.at(-1).init.headers.get('Authorization'),'Bearer management-token');
assert.equal(requests.at(-1).init.headers.get('Content-Profile'),'api');
assert.equal(JSON.parse(requests.at(-1).init.body).p_operation,'insert');
await client.updateRows('silver.any_scope_galaxy',{title:'changed'},{filters:[{column:'uid',operator:'eq',value:'TEST0001'}]});
assert.equal(JSON.parse(requests.at(-1).init.body).p_operation,'update');
await client.deleteRows('silver.any_scope_galaxy',{filters:[{column:'uid',operator:'eq',value:'TEST0001'}]});
assert.equal(JSON.parse(requests.at(-1).init.body).p_operation,'delete');
affected=0;
await assert.rejects(()=>client.updateRows('silver.any_scope_galaxy',{}),/affected 0 rows/);
await assert.rejects(()=>client.deleteRows('silver.any_scope_galaxy'),/affected 0 rows/);
await assert.rejects(()=>client.insertRows('silver.any_scope_galaxy',[{}]),/incomplete/);
await client.writeKeywordLibraryItem('update',{keyword_id:1,class_name:'符文66',class_group:'靈魂',class_enable:true,item_no:1,item_name:'靈',keywords:['one']});
assert.equal(requests.at(-1).url.pathname.endsWith('/lo3rwang_keywords_manage'),true);
assert.equal(requests.at(-1).init.headers.get('Content-Profile'),'api');

let called=false;
const readOnly=createPostgrestAdapter({url:'https://readonly.example.test',fetch:async()=>{called=true;return new Response('[]');}});
const readOnlyClient=createDatabaseClient(readOnly);
await assert.rejects(()=>readOnlyClient.getAccountSession(),/not configured/);
await assert.rejects(()=>readOnlyClient.signInWithGoogle('/'),/not configured/);
await assert.rejects(()=>readOnlyClient.insertRows('silver.any_scope_galaxy',[{}]),/not configured/);
assert.equal(called,false,'Unconfigured authentication must fail before contacting the database');

// HEAD failures can have no JSON error body; never convert them to count=0.
const originalFetch=globalThis.fetch;
process.env.NEXT_PUBLIC_LOC_DB_PROVIDER='postgrest';
process.env.NEXT_PUBLIC_LOC_DATA_API_URL='https://count.example.test';
globalThis.fetch=async()=>new Response(null,{status:403});
const {selectCount}=await import('../app/loc/db-query.mjs');
await assert.rejects(()=>selectCount('silver.any_scope_galaxy',{idColumn:'uid'}),/HTTP 403/);
await assert.rejects(()=>selectCount('silver.any_scope_galaxy'),/explicit ID column/);
globalThis.fetch=originalFetch;
const appRoot=resolve('app');
function sourceFiles(directory){
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const path=resolve(directory,entry.name);
    return entry.isDirectory()?sourceFiles(path):/\.(?:js|mjs|jsx|ts|tsx)$/.test(entry.name)?[path]:[];
  });
}
const providerSdkLeaks=sourceFiles(appRoot).filter(path=>{
  const relativePath=relative(appRoot,path).split(sep).join('/');
  if(relativePath.startsWith('loc/providers/'))return false;
  return /from\s*['\"]@supabase\//.test(readFileSync(path,'utf8'));
});
assert.deepEqual(providerSdkLeaks,[],'Feature code must access vendor SDKs through app/loc/providers only');

console.log('[db-adapters] PostgREST query contract, account boundary, authorized RPC CRUD, keyword writes and fail-closed writes passed (mock transport; not a migration result)');
