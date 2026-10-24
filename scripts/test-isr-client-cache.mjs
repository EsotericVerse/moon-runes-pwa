import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
const source=readFileSync(new URL('../app/loc/scope-data.js',import.meta.url),'utf8');
async function createHarness({native=false}={}){
  let calls=[],accessToken='test-access-token',invalidationStatus=204;
  const database=[],moduleLoads=[];
  const context=vm.createContext({Promise,process:{env:{NEXT_PUBLIC_LOC_ISR_ORIGIN:'https://isr.lo3rwang.cc'}},
    fetch:async(url,opts={})=>{
      calls.push({url,method:opts.method||'GET',cache:opts.cache});
      if(url==='https://isr.lo3rwang.cc/api/loc/revalidate')return {ok:invalidationStatus===204,status:invalidationStatus};
      throw Error('Unexpected network request '+url);
    }});
  const mocks={
    './db-query.mjs':{DB_QUERY_BATCH_SIZE:65535,selectRows:async table=>{database.push(table);return{rows:[{uid:'editor-latest'}]};}},
    '@capacitor/core':{Capacitor:{isNativePlatform:()=>native}},
    './db-client.mjs':{
      dbAuthEvents:{getSession:async()=>({data:{session:accessToken?{access_token:accessToken}:null},error:null})},
      dbPublicClient:{schema:()=>({rpc:async()=>{database.push('rpc:bootstrap');return{data:{version:99,blocks:[]},error:null};}})}
    },
    '../modular/scope-route-index.js':{SCOPE_ROUTE_INDEX:[{scope_id:'loc',config:{id:'loc',theme:'theme-7'}},{scope_id:'lo3rwang',config:{id:'lo3rwang',theme:'theme-8'}}]},
    '../modular/published-site-bootstrap.js':{PUBLISHED_SITE_BOOTSTRAP:{version:1,registry:[],blocks:[]}},
    '../modular/published-blocks/index.js':{loadPublishedBlocks:async(id,page)=>{moduleLoads.push(id+':'+page);return [{uid:'public-block'}];}}
  };
  const stubs=new Map(Object.entries(mocks).map(([id,values])=>[id,new vm.SyntheticModule(Object.keys(values),function(){
    for(const [key,value] of Object.entries(values))this.setExport(key,value);
  },{context})]));
  const mod=new vm.SourceTextModule(source,{context});
  await mod.link(id=>{if(!stubs.has(id))throw Error('Unexpected import '+id);return stubs.get(id)});
  await mod.evaluate();
  return {calls,database,moduleLoads,
    selectPublicSiteBootstrap:mod.namespace.selectPublicSiteBootstrap,
    revalidateServerMetadata:mod.namespace.revalidateServerMetadata,
    selectScopeConfig:mod.namespace.selectScopeConfig,
    selectScopeBlocks:mod.namespace.selectScopeBlocks,
    invalidateScopeBlockPage:mod.namespace.invalidateScopeBlockPage,
    invalidatePublicScopeMetadata:mod.namespace.invalidatePublicScopeMetadata,
    locPublicIsrUrl:mod.namespace.locPublicIsrUrl,
    setToken:v=>{accessToken=v;},setInvalidationStatus:v=>{invalidationStatus=v;}
  };
}
test('repeated public reads use imported JS without Worker, JSON fetch or SQL',async()=>{
  const h=await createHarness();
  const [site,config,blocks]=await Promise.all([h.selectPublicSiteBootstrap(),h.selectScopeConfig('lo3rwang'),h.selectScopeBlocks('lo3rwang','index')]);
  assert.equal(site.version,1);assert.equal(config.id,'lo3rwang');assert.equal(blocks[0].uid,'public-block');
  await Promise.all([h.selectPublicSiteBootstrap(),h.selectScopeConfig('lo3rwang'),h.selectScopeBlocks('lo3rwang','index')]);
  assert.equal(h.calls.length,0);assert.deepEqual(h.database,[]);
  assert.deepEqual(h.moduleLoads,['lo3rwang:index']);
});
test('Block editor reads latest SQL only after authorized invalidation',async()=>{
  const h=await createHarness();await h.selectScopeBlocks('lo3rwang','index');
  h.invalidateScopeBlockPage('lo3rwang','index');
  const result=await h.selectScopeBlocks('lo3rwang','index');
  assert.equal(result[0].uid,'editor-latest');assert.deepEqual(h.database,['silver.lo3rwang_blocks']);
  assert.equal(h.calls.length,0);
});
test('numeric ISR invalidation is separate from published modules',async()=>{
  const h=await createHarness();await h.selectPublicSiteBootstrap();
  assert.equal(await h.revalidateServerMetadata(),true);
  assert.equal((await h.selectPublicSiteBootstrap()).version,1);
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].url,'https://isr.lo3rwang.cc/api/loc/revalidate');
  assert.equal(h.calls[0].method,'POST');assert.equal(h.calls[0].cache,'no-store');
});
test('unauthenticated visitors cannot invalidate numeric cache',async()=>{
  const h=await createHarness();h.setToken('');
  assert.equal(await h.revalidateServerMetadata(),false);assert.equal(h.calls.length,0);
});
test('authorized metadata editing bypasses modules only in the editing session',async()=>{
  const h=await createHarness();await h.selectPublicSiteBootstrap();h.invalidatePublicScopeMetadata();
  assert.equal((await h.selectPublicSiteBootstrap()).version,99);
  assert.deepEqual(h.database,['rpc:bootstrap']);
});
test('only numeric API calls use the configured ISR origin',async()=>{
  const h=await createHarness();
  assert.equal(h.locPublicIsrUrl('/api/loc/revalidate'),'https://isr.lo3rwang.cc/api/loc/revalidate');
  await h.selectScopeBlocks('lo3rwang','index');
  assert.equal(h.calls.length,0);
});
