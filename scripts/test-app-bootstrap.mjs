import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import {administrativeSourceTrend} from '../app/loc/statistics-admin-source.mjs';

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

// Regression: choosing a keyword source must update the main time series and
// the total without counting multimedia from unrelated source categories.
test('author keyword source filters the main chart without changing all-source totals',()=>{
  const taxonomy={
    categories:[
      {category_code:'facebook',display_name:'Facebook',enabled:true},
      {category_code:'threads',display_name:'Threads',enabled:true}
    ],
    aliases:[
      {source_key:'FB',category_code:'facebook'},
      {source_key:'Threads',category_code:'threads'}
    ]
  };
  const raw=[
    {day:'2026-10-21',kind:'total',category:'文字作品',item_count:5},
    {day:'2026-10-21',kind:'total',category:'多媒體',item_count:2},
    {day:'2026-10-21',kind:'source',category:'FB',item_count:3},
    {day:'2026-10-21',kind:'source',category:'Threads',item_count:2},
    {day:'2026-10-22',kind:'total',category:'文字作品',item_count:2},
    {day:'2026-10-22',kind:'total',category:'多媒體',item_count:1},
    {day:'2026-10-22',kind:'source',category:'fb',item_count:1},
    {day:'2026-10-22',kind:'source',category:'Threads',item_count:1}
  ];
  const range={startDate:'2026-10-21',endDate:'2026-10-22'};
  const all=administrativeSourceTrend(raw,taxonomy,range);
  assert.equal(all.total,10);
  assert.equal(all.series.length,2);
  const facebook=administrativeSourceTrend(raw,taxonomy,{...range,sourceCategory:'facebook'});
  assert.equal(facebook.total,4);
  assert.deepEqual(facebook.rows.map(row=>row.total),[3,1]);
  assert.deepEqual(facebook.rows.map(row=>row.category_facebook),[3,1]);
  assert.deepEqual(facebook.series,[{key:'category_facebook',label:'Facebook'}]);
  assert.deepEqual(facebook.distribution,[{name:'Facebook',value:4}]);
  const threads=administrativeSourceTrend(raw,taxonomy,{...range,sourceCategory:'threads'});
  assert.equal(threads.total,3);
  assert.deepEqual(threads.rows.map(row=>row.total),[2,1]);
  assert.equal(administrativeSourceTrend(raw,taxonomy,range).total,10);
});

test('author statistics wires selected keyword source to chart cache and filtered details',()=>{
  const code=readFileSync(new URL('../app/modular/features/Statistics.jsx',import.meta.url),'utf8');
  assert.match(code,/const activeKeywordSource=styleFilter==='rune66'\?keywordSource:''/);
  assert.match(code,/queryRange\.bucket,activeKeywordSource,sourceRows\.dataUpdatedAt/);
  assert.match(code,/unit:queryRange\.bucket,sourceCategory:activeKeywordSource/);
  assert.match(code,/filteredSource=\{Boolean\(activeKeywordSource\)\}/);
});
