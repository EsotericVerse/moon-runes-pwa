import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

// Exercise the real client cache module with only its database/network seams
// replaced. No production data is written by these tests.
const source=readFileSync(new URL('../app/loc/scope-data.js',import.meta.url),'utf8');

async function createHarness({native=false}={}){
  let calls=[];let accessToken='test-access-token';let invalidationStatus=204;
  let bootstrapVersion=0;
  const context=vm.createContext({
    Promise,process:{env:{NEXT_PUBLIC_LOC_ISR_ORIGIN:'https://isr.lo3rwang.cc'}},
    fetch:async(url,opts={})=>{
      calls.push({url,method:opts.method||'GET',cache:opts.cache});
      if(url==='/_loc/site-bootstrap.json')
        return {ok:true,json:async()=>({version:++bootstrapVersion,registry:[],blocks:[]})};
      if(url==='/_loc/config/lo3rwang.json')
        return {ok:true,json:async()=>({id:'lo3rwang'})};
      if(url==='/_loc/blocks/lo3rwang/index.json')
        return {ok:true,json:async()=>[{uid:'public-block'}]};
      if(url==='https://isr.lo3rwang.cc/api/loc/revalidate')
        return {ok:invalidationStatus===204,status:invalidationStatus};
      throw Error('Unexpected network request '+url);
    }
  });
  const database=[];
  const mocks={
    './db-query.mjs':{
      DB_QUERY_BATCH_SIZE:65535,
      selectRows:async table=>{database.push(table);return{rows:[{uid:'editor-latest'}]};}
    },
    '@capacitor/core':{Capacitor:{isNativePlatform:()=>native}},
    './db-client.mjs':{
      dbAuthEvents:{getSession:async()=>({data:{session:accessToken?{access_token:accessToken}:null},error:null})},
      dbPublicClient:{schema:()=>({rpc:async()=>{database.push('rpc:bootstrap');return{data:{version:99,blocks:[]},error:null};}})}
    }
  };
  const stubs=new Map(Object.entries(mocks).map(([id,values])=>[
    id,new vm.SyntheticModule(Object.keys(values),function(){
      for(const [key,value] of Object.entries(values))this.setExport(key,value);
    },{context})
  ]));
  const module=new vm.SourceTextModule(source,{context});
  await module.link(id=>{if(!stubs.has(id))throw Error('Unexpected import '+id);return stubs.get(id)});
  await module.evaluate();
  return {calls,database,selectPublicSiteBootstrap:module.namespace.selectPublicSiteBootstrap,
    revalidateServerMetadata:module.namespace.revalidateServerMetadata,
    selectScopeConfig:module.namespace.selectScopeConfig,
    selectScopeBlocks:module.namespace.selectScopeBlocks,
    invalidateScopeBlockPage:module.namespace.invalidateScopeBlockPage,
    invalidatePublicScopeMetadata:module.namespace.invalidatePublicScopeMetadata,
    locPublicIsrUrl:module.namespace.locPublicIsrUrl,
    setToken:v=>{accessToken=v;},setInvalidationStatus:v=>{invalidationStatus=v;}
  };
}

test('repeated public reads use static JSON rather than a Worker or SQL',async()=>{
  const h=await createHarness();
  const [site,config,blocks]=await Promise.all([
    h.selectPublicSiteBootstrap(),
    h.selectScopeConfig('lo3rwang'),
    h.selectScopeBlocks('lo3rwang','index')
  ]);
  assert.equal(site.version,1);
  assert.equal(config.id,'lo3rwang');
  assert.equal(blocks[0].uid,'public-block');
  await Promise.all([h.selectPublicSiteBootstrap(),h.selectScopeConfig('lo3rwang'),h.selectScopeBlocks('lo3rwang','index')]);
  assert.equal(h.calls.length,3);
  assert.deepEqual(h.database,[]);
  assert.ok(h.calls.every(x=>x.url.startsWith('/_loc/')));
});

test('Block editor reads latest SQL after successful write, not stale published static',async()=>{
  const h=await createHarness();
  await h.selectScopeBlocks('lo3rwang','index');
  h.invalidateScopeBlockPage('lo3rwang','index');
  const result=await h.selectScopeBlocks('lo3rwang','index');
  assert.equal(result[0].uid,'editor-latest');
  assert.deepEqual(h.database,['silver.lo3rwang_blocks']);
  assert.equal(h.calls.length,1);
});

test('authorized numeric invalidation is separate from published metadata',async()=>{
  const h=await createHarness();
  await h.selectPublicSiteBootstrap();
  assert.equal(await h.revalidateServerMetadata(),true);
  assert.equal((await h.selectPublicSiteBootstrap()).version,1);
  assert.equal(h.calls.length,2);
  assert.equal(h.calls[1].url,'https://isr.lo3rwang.cc/api/loc/revalidate');
  assert.equal(h.calls[1].method,'POST');
  assert.equal(h.calls[1].cache,'no-store');
});

test('unauthenticated user does not send a numeric cache invalidation',async()=>{
  const h=await createHarness();
  h.setToken('');
  assert.equal(await h.revalidateServerMetadata(),false);
  assert.equal(h.calls.length,0);
});

test('public metadata edit bypasses the static file only in the editing browser',async()=>{
  const h=await createHarness();
  await h.selectPublicSiteBootstrap();
  h.invalidatePublicScopeMetadata();
  assert.equal((await h.selectPublicSiteBootstrap()).version,99);
  assert.deepEqual(h.database,['rpc:bootstrap']);
});

test('only numeric requests use the shared ISR origin',async()=>{
  const h=await createHarness();
  assert.equal(h.locPublicIsrUrl('/api/loc/revalidate'),'https://isr.lo3rwang.cc/api/loc/revalidate');
  await h.selectScopeBlocks('lo3rwang','index');
  assert.equal(h.calls[0].url,'/_loc/blocks/lo3rwang/index.json');
});
