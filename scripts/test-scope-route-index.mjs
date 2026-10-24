import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('app/modular/scope-registry.js');
const indexSource=read('app/modular/scope-route-index.js');
const corsSource=read('app/api/loc/_cors.js');

const stubUi={
  features:{
    statics:{title:'Statistics'},culture:{title:'Culture'},
    governance:{title:'Governance'},search:{title:'Search'}
  },
  scope:{loc:{statics:'',culture:'',governance:'',search:''},author:{search:''}},
  nav:{home:'Home',lunarunes:'Runes',author:'Author'}
};

async function load(sourceText,entry){
  const context=vm.createContext({URLSearchParams,Response,Request});
  const registry=new vm.SourceTextModule(sourceText,{context,identifier:entry});
  const index=new vm.SourceTextModule(indexSource,{context,identifier:'scope-route-index'});
  const ui=new vm.SyntheticModule(['UI_COPY'],function(){this.setExport('UI_COPY',stubUi)},{context,identifier:'ui-copy'});
  const resolve=id=>{
    if(id==='scope-route-index'||id==='./scope-route-index.js'||id==='../../modular/scope-route-index')
      return index;
    if(id==='../i18n/ui-copy.js')return ui;
    throw new Error('Unexpected import: '+id);
  };
  await registry.link(resolve);
  await registry.evaluate();
  return registry.namespace;
}

test('every active silver.loc Scope has a public JS routing record',async()=>{
  const routes=await load(indexSource,'scope-route-index');
  const all=routes.SCOPE_ROUTE_INDEX;
  assert.deepEqual(Array.from(all.map(row=>row.scope_id)).sort(),['lo3rwang','loc','lrunes']);
  for(const row of all){
    assert.equal(Boolean(row.domain)!==Boolean(row.directory),true,row.scope_id);
    assert.equal(row.active,true);
    assert.equal('email' in row,false,'Do not leak management fields');
  }
});

test('directory Scope wins over its parent domain before bootstrap/SQL',async()=>{
  const h=await load(source,'scope-registry');
  assert.equal(h.resolveScope('loc.lo3rwang.cc','/'), 'loc');
  assert.equal(h.resolveScope('loc.lo3rwang.cc','/lo3rwang/'),'lo3rwang');
  assert.equal(h.resolveScope('loc.lo3rwang.cc','/lo3rwang/search/'),'lo3rwang');
  assert.equal(h.resolveScope('lrunes.lo3rwang.cc','/lo3rwang/'),'lrunes');
  assert.equal(h.resolveScope('loc.lo3rwang.cc','/lrunes/'),'loc');
  assert.equal(h.resolveScope('localhost','/lrunes/'),'lrunes');
  assert.equal(h.scopeHref('lo3rwang','search'),'https://loc.lo3rwang.cc/lo3rwang/search/');
  assert.equal(h.scopeHref('lrunes','search'),'https://lrunes.lo3rwang.cc/search/');
});

test('ISR CORS public origins come only from the JS route file',async()=>{
  const cors=await load(corsSource,'_cors');
  for(const origin of ['https://loc.lo3rwang.cc','https://lrunes.lo3rwang.cc','https://esotericverse.github.io']){
    const req=new Request('https://isr.lo3rwang.cc/api/loc/site-bootstrap',{headers:{Origin:origin}});
    const response=cors.withLocCors(Response.json({ok:true}),req);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
    assert.equal(cors.locCorsPreflight(req).status,204);
  }
  const denied=new Request('https://isr.lo3rwang.cc/api/loc/site-bootstrap',{headers:{Origin:'https://malicious.example'}});
  assert.equal(cors.locCorsPreflight(denied).status,403);
});
