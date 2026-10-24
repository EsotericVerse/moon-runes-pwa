import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

// Exercise the real client cache module with only its database/network seams
// replaced. No production data is written by these tests.
const source=readFileSync(new URL('../app/loc/scope-data.js',import.meta.url),'utf8');

async function createHarness(){
  let snapshotVersion=0;
  let invalidationStatus=204;
  let accessToken='test-access-token';
  const calls=[];
  const context=vm.createContext({
    Promise,
    fetch:async(url,options={})=>{
      calls.push({url,method:options.method||'GET',cache:options.cache});
      if(url==='/api/loc/site-bootstrap'){
        return {ok:true,status:200,json:async()=>({version:++snapshotVersion})};
      }
      if(url==='/api/loc/revalidate'){
        return {ok:invalidationStatus===204,status:invalidationStatus};
      }
      throw new Error('Unexpected fetch: '+url);
    }
  });
  const imports={
    './db-query.mjs':{
      DB_QUERY_BATCH_SIZE:65535,
      selectRows:async()=>{throw new Error('Unexpected direct database read');}
    },
    './db-client.mjs':{
      dbAuthClient:{auth:{getSession:async()=>({
        data:{session:accessToken?{access_token:accessToken}:null},error:null
      })}},
      dbPublicClient:{schema:()=>({rpc:async()=>{throw new Error('Unexpected fallback RPC');}})}
    }
  };
  const stubs=new Map(Object.entries(imports).map(([name,values])=>[
    name,new vm.SyntheticModule(Object.keys(values),function(){
      for(const [key,value] of Object.entries(values))this.setExport(key,value);
    },{context,identifier:name})
  ]));
  const module=new vm.SourceTextModule(source,{context,identifier:'scope-data.js'});
  await module.link(name=>{
    const stub=stubs.get(name);
    if(!stub)throw new Error('Unexpected import: '+name);
    return stub;
  });
  await module.evaluate();
  return {
    calls,
    selectPublicSiteBootstrap:module.namespace.selectPublicSiteBootstrap,
    revalidateServerMetadata:module.namespace.revalidateServerMetadata,
    setInvalidationStatus:value=>{invalidationStatus=value;},
    setAccessToken:value=>{accessToken=value;}
  };
}

test('successful protected ISR invalidation drops the shared browser snapshot',async()=>{
  const h=await createHarness();
  const original=await h.selectPublicSiteBootstrap();
  assert.equal(original.version,1);
  assert.equal((await h.selectPublicSiteBootstrap()).version,1);
  assert.equal(await h.revalidateServerMetadata(),true);
  assert.equal((await h.selectPublicSiteBootstrap()).version,2);
  assert.deepEqual(h.calls.map(x=>x.url),[
    '/api/loc/site-bootstrap','/api/loc/revalidate','/api/loc/site-bootstrap'
  ]);
  assert.equal(h.calls[1].method,'POST');
  assert.equal(h.calls[1].cache,'no-store');
});

test('failed ISR invalidation does not discard the existing snapshot',async()=>{
  const h=await createHarness();
  assert.equal((await h.selectPublicSiteBootstrap()).version,1);
  h.setInvalidationStatus(403);
  assert.equal(await h.revalidateServerMetadata(),false);
  assert.equal((await h.selectPublicSiteBootstrap()).version,1);
  assert.equal(h.calls.length,2);
});

test('unsigned user never calls the protected ISR invalidation endpoint',async()=>{
  const h=await createHarness();
  h.setAccessToken('');
  assert.equal(await h.revalidateServerMetadata(),false);
  assert.equal(h.calls.length,0);
});

test('both block editors invalidate ISR before refreshing SWR',()=>{
  for(const file of ['ScopeBlockDraftList.jsx','ScopeBlockEditorSession.jsx']){
    const content=readFileSync(new URL('../app/loc/'+file,import.meta.url),'utf8');
    assert.match(content,/await revalidateServerMetadata\(\);\s*await Promise\.all\(\[mutate\(bootstrapKey\),mutate\(displayKey\)\]\);/,file);
  }
});
