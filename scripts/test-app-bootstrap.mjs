import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

// Test the real public bootstrap entry without loading browser-only SDKs.
// Mock only its database seams; assert the publicly observable requests and
// result rather than relying on wall-clock network timing.
const source=readFileSync(new URL('../app/loc/app-bootstrap.js',import.meta.url),'utf8');

async function harness(){
  const calls=[];
  let resolveSite;
  let rejectSite;
  let siteResponse=new Promise((resolve,reject)=>{resolveSite=resolve;rejectSite=reject;});
  const site={config:{id:'loc',theme:'theme-7'},blocks:[{uid:'loc-block'}],registry:[],page_copy:[],themes:[],theme_list:[]};
  const context=vm.createContext({Promise,Date});
  const stub={
    './use-async-resource':{useAsyncResource:()=>({})},
    './db-client.mjs':{dbPublicClient:{}},
    './scope-data':{
      invalidatePublicScopeMetadata:()=>{},
      invalidatePublicThemeSnapshot:()=>{},
      selectPublicSiteBootstrap:()=>{calls.push('site');return siteResponse;},
      selectScopeBlocks:(id,page)=>{calls.push('blocks:'+id+':'+page);return Promise.resolve([{uid:id+'-'+page}]);},
      selectScopeConfig:id=>{calls.push('config:'+id);return Promise.resolve({id,display_name:id});},
      selectScopeRegistry:()=>Promise.resolve([])
    },
    './theme-data':{selectThemeRegistry:()=>Promise.resolve([]),themeUiId:id=>id}
  };
  const modules=new Map(Object.entries(stub).map(([name,values])=>[
    name,new vm.SyntheticModule(Object.keys(values),function(){
      for(const [key,value] of Object.entries(values))this.setExport(key,value);
    },{context,identifier:name})
  ]));
  const module=new vm.SourceTextModule(source,{context,identifier:'app-bootstrap.js'});
  await module.link(name=>{
    const dependency=modules.get(name);
    if(!dependency)throw new Error('Unexpected import: '+name);
    return dependency;
  });
  await module.evaluate();
  return {calls,site,resolveSite,selectAppBootstrap:module.namespace.selectAppBootstrap};
}

test('non-LOC public Config and blocks begin alongside site Bootstrap',async()=>{
  const {calls,site,resolveSite,selectAppBootstrap}=await harness();
  const pending=selectAppBootstrap('lo3rwang','search');
  assert.deepEqual(calls,['site','config:lo3rwang','blocks:lo3rwang:search'],
    'Scope reads must not wait for the site RPC to finish');
  resolveSite(site);
  const result=await pending;
  assert.equal(result.config.id,'lo3rwang');
  assert.equal(result.blocks[0].uid,'lo3rwang-search');
  assert.deepEqual(result.registry,[]);
});

test('Admin consumes site metadata without querying nonexistent admin tables',async()=>{
  const {calls,site,resolveSite,selectAppBootstrap}=await harness();
  const pending=selectAppBootstrap('admin','index');
  assert.deepEqual(calls,['site']);
  resolveSite(site);
  const result=await pending;
  assert.equal(result.config,null);
  assert.equal(result.blocks.length,0);
});

test('LOC homepage continues to consume its existing site-RPC blocks',async()=>{
  const {calls,site,resolveSite,selectAppBootstrap}=await harness();
  const pending=selectAppBootstrap('loc','index');
  assert.deepEqual(calls,['site']);
  resolveSite(site);
  const result=await pending;
  assert.equal(result.config.id,'loc');
  assert.equal(result.blocks[0].uid,'loc-block');
});
