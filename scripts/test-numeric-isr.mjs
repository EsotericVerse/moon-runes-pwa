import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

// The real Route Handler is evaluated against a deterministic shared
// unstable_cache; the mocked RPC count proves warm hits do not rerun SQL.
const code=readFileSync(new URL('../app/api/loc/scopes/[scopeId]/numeric/[kind]/route.js',import.meta.url),'utf8');
async function harness(){
  const queries=[],storage=new Map();
  const context=vm.createContext({Response,URL,Date,Promise});
  const values={
    'next/cache':{unstable_cache:(fn,parts)=>async()=>{
      const key=JSON.stringify(parts);
      if(!storage.has(key))storage.set(key,await fn());
      return storage.get(key);
    }},
    '../../../../_cors':{withLocCors:r=>r,locCorsPreflight:()=>new Response(null,{status:204})},
    '../../../../_server':{
      validScopeId:x=>/^[a-z][a-z0-9]{0,14}$/.test(x),
      createPublicSupabaseClient:()=>({rpc:async(name,args)=>{
        queries.push({name,args});
        return {data:name==='read_scope_statistics'
          ?[{day:'2026-10-01',kind:'source',item_count:3}]
          :{earliest:'2025-01-01',rows:[{day:'2026-10-01',item_count:5}],categories:[],aliases:[]},
          error:null};
      }})
    }
  };
  const stubs=new Map(Object.entries(values).map(([name,exports])=>[
    name,new vm.SyntheticModule(Object.keys(exports),function(){
      for(const [key,value] of Object.entries(exports))this.setExport(key,value);
    },{context})
  ]));
  const module=new vm.SourceTextModule(code,{context});
  await module.link(name=>stubs.get(name));
  await module.evaluate();
  return {GET:module.namespace.GET,queries,storage};
}
const get=(h,id,kind,query='')=>h.GET(
  new Request('https://loc.example/api/loc/scopes/'+id+'/numeric/'+kind+query),
  {params:Promise.resolve({scopeId:id,kind})}
);
test('same Culture range five times invokes one SQL RPC',async()=>{
  const h=await harness();
  for(let i=0;i<5;i++)
    assert.equal((await get(h,'lo3rwang','culture','?start=2026-01-01&end=2026-10-01')).status,200);
  assert.equal(h.queries.length,1);
  assert.equal(h.queries[0].name,'read_scope_statistics');
  await get(h,'lo3rwang','culture','?start=2026-01-02&end=2026-10-01');
  assert.equal(h.queries.length,2,'A new range needs a new snapshot');
  h.storage.clear();
  await get(h,'lo3rwang','culture','?start=2026-01-01&end=2026-10-01');
  assert.equal(h.queries.length,3,'Expired or invalidated cache reloads SQL once');
});
test('Statistics results are cached separately for each Scope and date range',async()=>{
  const h=await harness();
  await get(h,'lo3rwang','statistics');
  await get(h,'lo3rwang','statistics');
  await get(h,'loc','statistics');
  assert.deepEqual(h.queries.map(x=>x.name),['read_scope_overview','read_scope_overview']);
});
test('private Scope and invalid numeric requests never execute SQL',async()=>{
  const h=await harness();
  for(const [id,kind,query] of [
    ['local','statistics',''],['lrunes','statistics',''],
    ['lo3rwang','statistics','?start=invalid'],['lo3rwang','search',''],
    ['lo3rwang','culture','?start=2026-10-01&end=2026-09-01']
  ])assert.equal((await get(h,id,kind,query)).status,400);
  assert.equal(h.queries.length,0);
});
