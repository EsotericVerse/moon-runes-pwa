import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const source=readFileSync(new URL('../app/loc/cache-mode-client.mjs',import.meta.url),'utf8');
const config=readFileSync(new URL('../app/loc/cache-policy.config.mjs',import.meta.url),'utf8');

async function harness(){
  const events=[],storage=new Map();
  const context=vm.createContext({
    Promise,Date,console,
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    window:{dispatchEvent:event=>events.push(event),
      localStorage:{
        getItem:key=>storage.get(key)||null,
        setItem:(key,value)=>storage.set(key,value),
        removeItem:key=>storage.delete(key)
      }}
  });
  const configModule=new vm.SourceTextModule(config,{context});
  await configModule.link(()=>{throw new Error('config must not import anything');});
  await configModule.evaluate();
  const module=new vm.SourceTextModule(source,{context});
  await module.link(id=>{
    assert.equal(id,'./cache-policy.config.mjs');
    return configModule;
  });
  await module.evaluate();
  return {api:module.namespace,events,storage};
}

test('policy comes from the static JS config and is applied',async()=>{
  const h=await harness();
  const state=await h.api.loadCachePolicy();
  assert.equal(state.mode,'cache');
  assert.equal(state.origin,'');
  assert.equal(h.api.currentCachePolicy().mode,'cache');
  assert.equal(h.events.at(-1).type,'loc-cache-policy-changed');
});

test('ISR needs a trusted public HTTPS origin, not arbitrary input',async()=>{
  const h=await harness();
  assert.equal(h.api.normalizeCachePolicy({mode:'isr',origin:'https://isr.lo3rwang.cc'}).mode,'isr');
  assert.equal(h.api.normalizeCachePolicy({mode:'isr',origin:'http://evil.test'}).mode,'cache');
  assert.equal(h.api.normalizeCachePolicy({mode:'invalid',origin:''}).mode,'off');
});

test('administrator can change browser cache mode and the choice survives policy refresh',async()=>{
  const h=await harness();
  h.api.setBrowserCacheChoice({mode:'off',provider:'cloudflare'});
  assert.equal(h.api.currentCachePolicy().mode,'off');
  assert.equal((await h.api.loadCachePolicy()).mode,'off');
  h.api.setBrowserCacheChoice({mode:'isr',provider:'cloudflare'});
  assert.equal(h.api.currentCachePolicy().origin,'');
  assert.equal((await h.api.loadCachePolicy()).mode,'cache');
  assert.equal(h.api.browserCacheChoice().mode,'isr');
  assert.equal(h.storage.size,1);
  assert.equal(h.events.at(-1).type,'loc-cache-policy-changed');
  assert.throws(()=>h.api.setBrowserCacheChoice({mode:'isr',provider:'https://evil.test'}));
  h.api.resetBrowserCacheChoice();
  assert.equal(h.api.currentCachePolicy().mode,'cache');
  assert.equal(h.storage.size,0);
});

test('admin ISR panel uses working selects and discloses the local-only setting',()=>{
  const panel=readFileSync(new URL('../app/loc/views/admin-panels/IsrDomainTarget.jsx',import.meta.url),'utf8');
  assert.match(panel,/onChange=\{event=>update\(/);
  assert.match(panel,/setBrowserCacheChoice\(next\)/);
  assert.match(panel,/resetBrowserCacheChoice\(\)/);
  assert.match(panel,/全站 ISR/);
  assert.match(panel,/不寫入資料庫/);
});

// Do not weaken the release verifier: the retired Worker endpoint must never
// be embedded into HTML or JavaScript, even while cache mode is selected.
test('disabled ISR never publishes a retired endpoint in cache configuration',()=>{
  assert.doesNotMatch(config,/https:\/\/isr\.lo3rwang\.cc/);
  assert.match(config,/\{id:'cloudflare',label:'Cloudflare',origin:''\}/);
});
