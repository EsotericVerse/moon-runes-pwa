import assert from 'node:assert/strict';
import {createKyselyEdgeClient} from '../app/loc/providers/kysely-edge.mjs';
import {createSupabaseAdapter} from '../app/loc/providers/supabase.mjs';

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
const authOptions=[];const adapterCalls=[];
const adapter=createSupabaseAdapter({url:'https://loc.example.test',publishableKey:'sb_publishable_test',createClientImpl:(url,key,options)=>{authOptions.push(options);return {auth}},fetchImpl:async(url,init)=>{adapterCalls.push({url,init});return new Response(JSON.stringify({data:[{id:'ok'}]}),{status:200})}});
assert.equal(authOptions.length,1,'only the Supabase Auth/session SDK remains instantiated');
assert.equal(authOptions[0].auth.persistSession,true);
assert.equal(authOptions[0].auth.autoRefreshToken,true);
await adapter.publicClient.schema('silver').from('manage').select('id');
await adapter.authClient.schema('silver').from('manage').select('id');
assert.equal(adapterCalls[0].url,adapterCalls[1].url,'public and authenticated data reads share the same Kysely endpoint');
assert.equal(adapterCalls[1].init.headers.authorization,'Bearer user.jwt.token');
console.log('[kysely-edge-client] Supabase Auth session retention, shared LOC CRUD/RPC endpoint, Neon anonymous routing and fail-closed errors passed');
