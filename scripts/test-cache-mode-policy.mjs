import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const source=readFileSync(new URL('../app/loc/cache-mode-client.mjs',import.meta.url),'utf8');
const config=readFileSync(new URL('../app/loc/cache-policy.config.mjs',import.meta.url),'utf8');

async function harness(){
  const events=[];
  const context=vm.createContext({
    Promise,Date,console,
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    window:{dispatchEvent:event=>events.push(event)}
  });
  const configModule=new vm.SourceTextModule(config,{context});
  await configModule.link(()=>{throw new Error('config must not import anything');});
  await configModule.evaluate();
  const ioModule=new vm.SourceTextModule('export const applyRuntimeIoLimits=()=>({});',{context});
  await ioModule.link(()=>{throw new Error('no imports expected');});
  await ioModule.evaluate();
  const module=new vm.SourceTextModule(source,{context});
  await module.link(id=>{
    if(id==='./cache-policy.config.mjs')return configModule;
    if(id==='./query-batch-size.mjs')return ioModule;
    throw Error('Unexpected import: '+id);
  });
  await module.evaluate();
  return {api:module.namespace,events};
}

test('cache defaults to Service Worker without an ISR destination',async()=>{
  const h=await harness();
  const state=await h.api.loadCachePolicy();
  assert.equal(state.mode,'cache');
  assert.equal(state.origin,'');
  assert.equal(h.events.at(-1).type,'loc-cache-policy-changed');
});

test('only a selected public HTTPS ISR destination may be used',async()=>{
  const h=await harness();
  assert.equal(h.api.normalizeCachePolicy({mode:'isr',origin:'https://isr.example.com'}).mode,'isr');
  assert.equal(h.api.normalizeCachePolicy({mode:'isr',origin:'http://invalid.test'}).mode,'cache');
  assert.equal(h.api.normalizeCachePolicy({mode:'invalid',origin:''}).mode,'off');
});

test('current runtime setting accepts legacy ID and new origin selections',async()=>{
  const h=await harness();
  const domains=[{id:'legacy',label:'第一個',origin:'https://isr.example.com'},
    {label:'第二個',origin:'https://edge.example.com'}];
  h.api.applyGlobalCacheConfig({cache_mode:'isr',cache_provider:'legacy',isr_domains:domains});
  assert.equal(h.api.currentCachePolicy().origin,'https://isr.example.com');
  h.api.applyGlobalCacheConfig({cache_mode:'isr',cache_provider:'https://edge.example.com',isr_domains:domains});
  assert.equal(h.api.currentCachePolicy().origin,'https://edge.example.com');
  h.api.applyGlobalCacheConfig({cache_mode:'isr',cache_provider:'unknown',isr_domains:domains});
  assert.equal(h.api.currentCachePolicy().mode,'cache');
  h.api.applyGlobalCacheConfig({cache_mode:'off',cache_provider:'https://edge.example.com',isr_domains:domains});
  assert.equal(h.api.currentCachePolicy().mode,'off');
});

test('Admin has a single selector, a hidden editor and exactly Name/Domain fields',()=>{
  const panel=readFileSync(new URL('../app/loc/views/admin-panels/IsrDomainTarget.jsx',import.meta.url),'utf8');
  assert.match(panel,/loc-isr-choice/);
  assert.match(panel,/editing\?<div id="loc-isr-editor"/);
  assert.match(panel,/編輯/);
  assert.match(panel,/onClick=\{addDomain\}/);
  assert.match(panel,/onClick=\{\(\)=>removeDomain\(index\)\}/);
  assert.match(panel,/useEditDockForm/);
  assert.doesNotMatch(panel,/Domain ID|目前 ISR 網域|CACHE_MODE_OPTIONS/);
});

test('static fallback never embeds a disabled ISR host',()=>{
  assert.doesNotMatch(config,/isr\.lo3rwang\.cc|moon-runes-pwa\.vercel\.app/);
});

test('numeric ISR reads the Admin-selected origin, including older rows',()=>{
  const route=readFileSync(new URL('../app/api/loc/scopes/[scopeId]/numeric/[kind]/route.js',import.meta.url),'utf8');
  assert.match(route,/runtime\?\.cache_mode!=='isr'/);
  assert.match(route,/item\.origin===runtime\.cache_provider\|\|item\.id===runtime\.cache_provider/);
  assert.match(route,/configuredOrigin!==url\.origin/);
});
