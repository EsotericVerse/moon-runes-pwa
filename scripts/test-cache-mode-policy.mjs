import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const source=readFileSync(new URL('../app/loc/cache-mode-client.mjs',import.meta.url),'utf8');
const config=readFileSync(new URL('../app/loc/cache-policy.config.mjs',import.meta.url),'utf8');

async function harness(){
  const context=vm.createContext({
    Promise,Date,console,
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    window:{dispatchEvent:event=>events.push(event)}
  });
  const events=[];
  const configModule=new vm.SourceTextModule(config,{context});
  await configModule.link(()=>{throw new Error('config must not import anything');});
  await configModule.evaluate();
  const module=new vm.SourceTextModule(source,{context});
  await module.link(id=>{
    assert.equal(id,'./cache-policy.config.mjs');
    return configModule;
  });
  await module.evaluate();
  return {api:module.namespace,events};
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
