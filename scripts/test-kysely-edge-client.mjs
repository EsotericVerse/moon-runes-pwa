import assert from 'node:assert/strict';
import {createKyselyEdgeClient} from '../app/loc/providers/kysely-edge.mjs';
import {createSupabaseAdapter} from '../app/loc/providers/supabase.mjs';
import {selectedDatabaseProvider} from '../app/loc/providers/selected-database-target.mjs';

const calls=[];
let sessionToken='user.jwt.token';
const auth={getSession:async()=>({data:{session:{access_token:sessionToken}},error:null})};
const client=createKyselyEdgeClient({url:'https://loc.example.test/',publishableKey:'sb_publishable_test',auth,fetch:async(url,init)=>{
  calls.push({url,init});
  return new Response(JSON.stringify({data:[{uid:'TEST0001'}],count:1}),{status:200,headers:{'content-type':'application/json','content-range':'0-0/1'}});
}});
const result=await client.schema('silver').from('lo3rwang_galaxy').select('uid,title',{count:'exact'})
  .eq('searchable',true).ilike('title','MOON%').order('uid').range(0,9);
assert.deepEqual(result.data,[{uid:'TEST0001'}]);
assert.equal(result.count,1);
assert.equal(calls[0].url,'https://loc.example.test/functions/v1/loc-kysely');
assert.equal(calls[0].init.headers.apikey,'sb_publishable_test');
assert.equal(calls[0].init.headers.authorization,'Bearer user.jwt.token');
const query=JSON.parse(calls[0].init.body);
assert.equal(query.kind,'query');
assert.equal(query.schema,'silver');
assert.equal(query.table,'lo3rwang_galaxy');
assert.equal(query.limit,10);
assert.equal(query.filters[1].operator,'ilike');
assert.equal(query.filters[1].value,'MOON%');
await client.schema('silver').from('lo3rwang_keywords').insert({keyword_id:9,item_name:'test'}).select('keyword_id');
assert.equal(JSON.parse(calls.at(-1).init.body).operation,'insert');
assert.equal(JSON.parse(calls.at(-1).init.body).returning,true);
await client.schema('silver').from('lo3rwang_keywords').update({item_name:'changed'}).eq('keyword_id',9).select('keyword_id');
assert.equal(JSON.parse(calls.at(-1).init.body).operation,'update');
await client.schema('silver').from('lo3rwang_keywords').delete().eq('keyword_id',9).select('keyword_id');
assert.equal(JSON.parse(calls.at(-1).init.body).operation,'delete');
await client.schema('api').from('user_settings').upsert({setting_key:'theme'},{onConflict:'owner_id,setting_key'}).select('setting_key');
assert.equal(JSON.parse(calls.at(-1).init.body).onConflict.join(','),'owner_id,setting_key');
await client.schema('silver').rpc('delete_scope',{p_scope_id:'testscope'});
assert.equal(JSON.parse(calls.at(-1).init.body).kind,'rpc');

const publicCalls=[];
const publicClient=createKyselyEdgeClient({url:'https://loc.example.test',publishableKey:'sb_publishable_test',role:'anon',target:'supabase',fetch:async(url,init)=>{
  publicCalls.push({url,init});return new Response(JSON.stringify({data:[],count:0}),{status:200});
}});
await publicClient.schema('silver').from('lrunes_daily').select('record_id');
assert.equal('authorization' in publicCalls[0].init.headers,false,'public requests must not invent a bearer token');

const neonCalls=[];
const neonClient=createKyselyEdgeClient({url:'https://loc.example.test',publishableKey:'sb_publishable_test',role:'anon',target:'neon',fetch:async(url,init)=>{
  neonCalls.push({url,init});return new Response(JSON.stringify({data:[],count:null}),{status:200});
}});
await neonClient.schema('silver').from('lrunes_daily').select('record_id');
assert.equal(JSON.parse(neonCalls[0].init.body).target,'neon');

const rejected=createKyselyEdgeClient({url:'https://loc.example.test',publishableKey:'sb_publishable_test',fetch:async()=>new Response(JSON.stringify({error:{message:'denied'}}),{status:403})});
await assert.rejects(async()=>await rejected.schema('silver').from('manage').select('*'),/denied/);
let transientReads=0;
const retryRead=createKyselyEdgeClient({url:'https://loc.example.test',publishableKey:'sb_publishable_test',role:'anon',fetch:async()=>++transientReads===1?new Response(JSON.stringify({error:{message:'temporarily unavailable'}}),{status:503}):new Response(JSON.stringify({data:[{id:'recovered'}]}),{status:200})});
assert.deepEqual((await retryRead.schema('silver').from('manage').select('id')).data,[{id:'recovered'}]);
assert.equal(transientReads,2,'a transient PostgreSQL connection failure retries one read once');
let transientWrites=0;
const noWriteRetry=createKyselyEdgeClient({url:'https://loc.example.test',publishableKey:'sb_publishable_test',role:'anon',fetch:async()=>{transientWrites++;return new Response(JSON.stringify({error:{message:'temporarily unavailable'}}),{status:503})}});
await assert.rejects(async()=>await noWriteRetry.schema('manage').from('email_blocklist').insert({email:'x@example.test'}),/temporarily unavailable/);
assert.equal(transientWrites,1,'writes are never retried automatically');
const sdkSettings=[];
const apiCalls=[];
const adapter=createSupabaseAdapter({
  url:'https://loc.example.test',publishableKey:'sb_publishable_test',
  createClientImpl:(url,key,options)=>{
    sdkSettings.push(options);
    return {
      auth,
      schema(schema){
        return {
          from(table){return {
            select(columns){return Promise.resolve({data:[{id:table}],error:null,count:1})}
          }},
          rpc(name,args){return Promise.resolve({data:{name,args},error:null})}
        };
      }
    };
  },
  fetchImpl:async(url,init)=>{
    apiCalls.push({url,init});
    return new Response(JSON.stringify({data:{target_id:'supabase-current'}}),{status:200});
  }
});
assert.equal(sdkSettings.length,2,'authenticated and anonymous Supabase SDKs must stay isolated');
assert.equal(sdkSettings[0].auth.persistSession,true,'authenticated client retains browser session');
assert.equal(sdkSettings[1].auth.persistSession,false,'anonymous primary reads never borrow a signed-in session');
assert.ok(sdkSettings.every(x=>x.global&&'fetch' in x.global),'Data API uses the configured fetch');
assert.deepEqual((await adapter.publicClient.schema('silver').from('game').select('game_key')).data,[{id:'game'}]);
assert.deepEqual((await adapter.authClient.schema('silver').from('scope_registry').select('scope_id')).data,[{id:'scope_registry'}]);
assert.equal(apiCalls.length,0,'routine primary reads must NOT open a Kysely PG connection');
assert.deepEqual((await adapter.authClient.schema('silver').rpc('management_write',{p_operation:'select'})).data,{name:'management_write',args:{p_operation:'select'}});
await adapter.authClient.schema('silver').rpc('save_database_target',{p_target:{target_id:'supabase-current'}});
assert.equal(apiCalls.length,1,'only the Admin connection configuration RPC travels to Edge');
assert.equal(apiCalls[0].url,'https://loc.example.test/functions/v1/loc-kysely');
assert.equal(apiCalls[0].init.headers.authorization,'Bearer user.jwt.token');
assert.equal(JSON.parse(apiCalls[0].init.body).name,'save_database_target');
await adapter.configuredPublicClient.activeTarget();
assert.equal(apiCalls.length,2,'One explicit lightweight provider check follows the Admin RPC');
assert.equal(JSON.parse(apiCalls[1].init.body).kind,'status');
assert.equal(JSON.parse(apiCalls[1].init.body).name,'active_public_target');
assert.equal(JSON.parse(apiCalls[1].init.body).target,'configured');
assert.equal('authorization' in apiCalls[1].init.headers,false,'Provider flag must be readable without borrowing Admin credentials');
assert.equal(selectedDatabaseProvider([{provider:'neon',selected:true},{provider:'supabase',selected:false}]),'neon');
assert.equal(selectedDatabaseProvider([{provider:'neon',selected:false},{provider:'supabase',selected:true}]),'supabase');
assert.throws(()=>selectedDatabaseProvider([{provider:'neon',selected:true},{provider:'supabase',selected:true}]),/More than one/);
assert.throws(()=>selectedDatabaseProvider([{provider:'firebase',selected:true}]),/not supported/);
console.log('[kysely-edge-client] Supabase primary Data API, isolated public/auth sessions, Edge Admin RPC, portable SQL routing and fail-closed errors passed');
