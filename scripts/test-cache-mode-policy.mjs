import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const source=readFileSync(new URL('../app/loc/cache-mode-client.mjs',import.meta.url),'utf8');
async function harness(record={mode:'cache',origin:''},error=null){
  let calls=0,events=[];
  const dbPublicClient={schema:name=>{
    assert.equal(name,'silver');
    return {from:table=>{
      assert.equal(table,'loc_cache_runtime');
      return {select:columns=>{
        assert.equal(columns,'mode,origin');
        return {eq:(column,value)=>{
          assert.equal(column,'id');assert.equal(value,1);
          return {maybeSingle:async()=>{calls++;return {data:record,error};}};
        }};
      }};
    }};
  }};
  const context=vm.createContext({
    Promise,Date,console,
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    window:{dispatchEvent:event=>events.push(event)}
  });
  const dep=new vm.SyntheticModule(['dbPublicClient'],function(){
    this.setExport('dbPublicClient',dbPublicClient);
  },{context});
  const module=new vm.SourceTextModule(source,{context});
  await module.link(id=>{
    assert.equal(id,'./db-client.mjs');
    return dep;
  });
  await module.evaluate();
  return {api:module.namespace,events,calls:()=>calls};
}
test('default off; global public setting enables cache and reuses one read',async()=>{
  const h=await harness();
  assert.equal(h.api.currentCachePolicy().mode,'off');
  assert.equal((await h.api.loadCachePolicy()).mode,'cache');
  assert.equal((await h.api.loadCachePolicy()).mode,'cache');
  assert.equal(h.calls(),1);
  assert.equal(h.events.at(-1).type,'loc-cache-policy-changed');
});
test('explicit ISR needs a trusted public HTTPS origin, not arbitrary input',async()=>{
  const h=await harness({mode:'isr',origin:'https://isr.lo3rwang.cc'});
  const state=await h.api.loadCachePolicy();
  assert.equal(state.mode,'isr');
  assert.equal(state.origin,'https://isr.lo3rwang.cc');
  assert.equal(h.api.normalizeCachePolicy({mode:'isr',origin:'http://evil.test'}).mode,'cache');
  assert.equal(h.api.normalizeCachePolicy({mode:'invalid',origin:''}).mode,'off');
});
test('missing config or network error cannot activate ISR',async()=>{
  for(const issue of [new Error('offline'),{message:'relation missing'}]){
    const h=await harness(null,issue);
    assert.equal((await h.api.loadCachePolicy()).mode,'off');
  }
});
