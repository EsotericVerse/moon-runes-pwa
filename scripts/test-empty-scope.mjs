import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import {sourceTaxonomyFromArrays} from '../app/loc/source-classification.mjs';
import {administrativeSourceTrend} from '../app/loc/statistics-admin-source.mjs';
import {summarizeCultureRiverRoots,selectCultureRiverChildren} from '../app/loc/culture-river-roots.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

// Reproduce a *configured* Scope whose Galaxy, Galaxy Media, Time and Keyword
// tables all exist, but contain zero rows. Missing tables, broken SQL and
// missing permissions must still surface as real errors.
async function emptyIsrHarness({registered=true}={}){
  const tableCalls=[],rpcCalls=[];
  const data={rows:[],earliest:'',categories:[],aliases:[]};
  const emptyResult={data:[],error:null};
  const tableQuery=(name)=>({
    eq(){return this;},
    in(){return this;},
    order(){return this;},
    gte(){return this;},
    lte(){return this;},
    range(){return Promise.resolve(emptyResult);},
    limit(){return Promise.resolve(emptyResult);},
    async maybeSingle(){
      if(name!=='manage')throw Error('Unexpected maybeSingle '+name);
      return {data:registered?{time_table:null,birthday:null}:null,error:null};
    },
    then(resolve,reject){return Promise.resolve(emptyResult).then(resolve,reject);}
  });
  const client={
    from(name){
      tableCalls.push(name);
      return {select(){return tableQuery(name);}};
    },
    async rpc(name){
      rpcCalls.push(name);
      if(name==='read_scope_overview')return {data,error:null};
      if(name==='read_scope_statistics')return emptyResult;
      if(name==='read_scope_earliest')return {data:null,error:null};
      if(name==='read_loc_statistics')return {data:{rows:[],scopes:[],earliest:''},error:null};
      throw Error('Unexpected RPC '+name);
    }
  };
  // The handler is ordinary JS; strip only its static imports/exports so
  // this self-contained fixture works under plain node --test, without
  // --experimental-vm-modules and without deploying/charging CI.
  const context=vm.createContext({
    Promise,Date,Response,Request,URL,Set,Map,
    unstable_cache:load=>load,
    withLocCors:response=>response,
    locCorsPreflight:()=>new Response(null,{status:204}),
    createPublicSupabaseClient:()=>client,
    validScopeId:value=>/^[a-z][a-z0-9]{0,14}$/.test(String(value||'')),
    StatisticsFacets:{base:{mediaFacetDaily:()=>[]}},
    publishedSourceTaxonomy:()=>sourceTaxonomyFromArrays([],[]),
    summarizeCultureRiverRoots,selectCultureRiverChildren
  });
  const route=read('app/api/loc/scopes/[scopeId]/numeric/[kind]/route.js')
    .replace(/^import .+;\s*$/gm,'')
    .replace(/^export (const|async function|function) /gm,'$1 ');
  vm.runInContext(route+'\\nglobalThis.__emptyScopeGet=GET;',context);
  return {
    tableCalls,rpcCalls,
    get:async(kind,query='')=>{
      const url='https://example.test/api/loc/scopes/lo3rwang/numeric/'+kind+query;
      const response=await context.__emptyScopeGet(new Request(url),{
        params:Promise.resolve({scopeId:'lo3rwang',kind})
      });
      return {status:response.status,body:await response.json()};
    }
  };
}

test('empty Time yields HTTP 200 and [] Periods; default time suffix is optional',async()=>{
  const h=await emptyIsrHarness();
  const response=await h.get('periods');
  assert.equal(response.status,200);
  assert.deepEqual(Array.from(response.body),[]);
  assert.deepEqual(h.tableCalls,['manage','lo3rwang_time']);
});

test('empty Galaxy and Media yield non-error Statistics and Culture ISR',async()=>{
  const h=await emptyIsrHarness();
  for(const [kind,query] of [
    ['statistics','?start=2026-10-01&end=2026-10-25'],
    ['culture-roots','?start=2026-10-01&end=2026-10-25'],
    ['culture-children','?start=2026-10-01&end=2026-10-25&roots=system']
  ]){
    const {status,body}=await h.get(kind,query);
    assert.equal(status,200,kind);
    if(kind==='statistics'){
      assert.deepEqual(Array.from(body.rows),[]);
      assert.deepEqual(Array.from(body.categories),[]);
      assert.deepEqual(Array.from(body.aliases),[]);
    }else if(kind==='culture-roots'){
      assert.deepEqual(Array.from(body.rootBuckets),[]);
      assert.deepEqual(Array.from(body.groups),[]);
    }else assert.deepEqual(Array.from(body),[]);
  }
  const facet=await h.get('facet','?dimension=media_type&start=2026-10-01&end=2026-10-25');
  assert.equal(facet.status,200);
  assert.deepEqual(Array.from(facet.body),[]);
  assert.ok(h.rpcCalls.includes('read_scope_overview'));
  assert.ok(h.rpcCalls.includes('read_scope_statistics'));
});

test('unregistered Scope still errors; zero rows must not hide missing Registry',async()=>{
  const h=await emptyIsrHarness({registered:false});
  const response=await h.get('periods');
  assert.equal(response.status,502);
});

test('empty classifications and source counts are valid presentation inputs',()=>{
  const taxonomy=sourceTaxonomyFromArrays([],[]);
  assert.deepEqual(taxonomy,{categories:[],aliases:[],groups:[],groupAliases:[]});
  const result=administrativeSourceTrend([],taxonomy,{
    startDate:'2026-10-20',endDate:'2026-10-25',unit:'day'
  });
  assert.equal(result.total,0);
  assert.equal(result.rows.length,6);
  assert.equal(result.series.length,0);
  assert.equal(result.distribution.length,0);
  assert.deepEqual(summarizeCultureRiverRoots([],taxonomy),{rootBuckets:[],groups:[]});
});

test('empty Time and optional Event or Keywords do not block page usage',()=>{
  const culture=read('app/modular/features/Culture.jsx');
  const statistics=read('app/modular/features/Statistics.jsx');
  const trace=read('app/modular/features/Trace.jsx');
  const keyword=read('app/loc/keyword-analysis.js');
  assert.match(culture,/if\(primaryPeriods.length\)return periodRange/);
  assert.match(culture,/const hasTimelineSurface=.*Boolean\(query\.data\)/);
  assert.match(culture,/optionalTimeRangeUnfilled/);
  assert.match(culture,/尚未選擇時間範圍/);
  assert.match(statistics,/periodQuery\.data!==undefined/);
  assert.match(statistics,/periods\.length\?'最新時期':'未設定時期（預設時間）'/);
  assert.match(trace,/periods\.length\?'最新時期':'未設定時期（不限日期）'/);
  assert.match(trace,/periodKey==='all'\?null:selectedPeriod/);
  assert.match(keyword,/if\(!currentId\)return ''/);
});
