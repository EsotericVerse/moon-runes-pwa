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
async function emptyIsrHarness({registered=true,timeRows=[]}={}){
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
    then(resolve,reject){
      const rows=name==='lo3rwang_time'?timeRows:[];
      return Promise.resolve({data:rows,error:null}).then(resolve,reject);
    }
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
  vm.runInContext(route+'\nglobalThis.__emptyScopeGet=GET;',context);
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

test('Period without any time anchors or birthday is optional, not a 500 error',async()=>{
  const h=await emptyIsrHarness({timeRows:[{
    record_id:'period-only',record_type:'period',resource_id:'p1',
    anchor_ids:['missing-anchor','0'],label:'未定日期的時期',display_order:1
  }]});
  const response=await h.get('periods');
  assert.equal(response.status,200);
  // Without a resolved boundary, do not fabricate a calendar date.
  assert.deepEqual(Array.from(response.body),[]);
});

test('No work categories or personal categories preserves raw sources',()=>{
  const {categories,aliases,groups,groupAliases}=sourceTaxonomyFromArrays([],[]);
  assert.deepEqual({categories,aliases,groups,groupAliases},{
    categories:[],aliases:[],groups:[],groupAliases:[]
  });
  // Work classification and personal classification may be empty separately.
  assert.deepEqual(sourceTaxonomyFromArrays(['facebook'],[]).groups,[]);
  assert.deepEqual(sourceTaxonomyFromArrays([],['suno']).categories,[]);
  const rows=[
    {kind:'source',category:'unknown-source',day:'2026-10-25',item_count:3},
    {kind:'total',category:'文字作品',day:'2026-10-25',item_count:3}
  ];
  const roots=summarizeCultureRiverRoots(rows,{categories,aliases});
  assert.deepEqual(roots.rootBuckets,[{category:'custom',start_date:'2026-10-25',item_count:3}]);
  assert.equal(roots.groups[0].source_name,'unknown-source');
  assert.equal(selectCultureRiverChildren(rows,{categories,aliases},['custom']).length,1);
  const stats=administrativeSourceTrend(rows,{categories,aliases},{
    startDate:'2026-10-25',endDate:'2026-10-25',unit:'day'
  });
  assert.equal(stats.total,3);
  assert.equal(stats.distribution[0]?.name,'未分類');
  assert.equal(stats.distribution[0]?.value,3);
});

test('No spatial anchors, no saved route maps and no keyword groups are valid',()=>{
  const traceData=read('app/modular/features/trace/trace-data.js');
  const trace=read('app/modular/features/Trace.jsx');
  const culture=read('app/loc/culture-query.js');
  const classification=read('app/loc/source-classification.mjs');
  assert.match(traceData,/anchors:rows\.filter\(row=>row\.trace_type==='anchor'\)/);
  assert.match(traceData,/maps:rows\.filter\(row=>row\.trace_type==='map'\)/);
  assert.match(trace,/if\(!data\|\|scopeId!=='loc'\)return data/);
  assert.match(culture,/const anchors=new Map\(all\.filter\(row=>row\.entry_type==='anchor'\)/);
  assert.match(classification,/sourceTaxonomyFromArrays\(systemNames=\[\],personalNames=\[\]\)/);
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
  assert.match(statistics,/scopeId!=='loc'&&Boolean\(targetScopes\[0\]\)/);
  assert.match(statistics,/scopeId==='loc'\|\|periodQuery\.data!==undefined/);
  assert.match(statistics,/periods\.length\?'最新時期':'未設定時期（預設時間）'/);
  assert.match(trace,/periods\.length\?'最新時期':'未設定時期（不限日期）'/);
  assert.match(trace,/periodKey==='all'\?null:selectedPeriod/);
  assert.match(keyword,/if\(!currentId\)return ''/);
});
