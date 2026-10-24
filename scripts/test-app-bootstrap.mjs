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

test('local iPhone Scope reads config and blocks without cloud site bootstrap',async()=>{
  const {calls,selectAppBootstrap}=await harness();
  const result=await selectAppBootstrap('local','search');
  assert.deepEqual(calls,['config:local','blocks:local:search']);
  assert.equal(result.config.id,'local');
  assert.equal(result.blocks[0].uid,'local-search');
  // This array originates in vm.SourceTextModule's separate realm.
  assert.equal(result.registry.length,0);
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


// Manual reset must not send tens of thousands of classified rows through a
// single UPDATE. Exercise the real database client with the existing RPC seam.
test('keyword reset uses paged authorized writes before clearing summary',async()=>{
  const {createDatabaseClient}=await import('../app/loc/db-contract.mjs');
  const rows=Array.from({length:1510},(_,i)=>({
    uid:String(i+1).padStart(8,'0'),class_id:1,group_lists:'1'
  }));
  const calls=[];
  const relation=name=>({
    select(columns,options={}){
      if(name==='loc'){
        assert.equal(columns,'galaxy_table');
        return {eq(){return this;},async limit(){return {data:[{galaxy_table:'galaxy'}],error:null};}};
      }
      assert.equal(name,'lo3rwang_galaxy');
      if(options.head)return Promise.resolve({count:rows.length,error:null});
      let cursor='';
      return {
        order(){return this;},
        gt(column,value){assert.equal(column,'uid');cursor=value;return this;},
        async limit(size){return {data:rows.filter(row=>row.uid>cursor).slice(0,size),error:null};}
      };
    }
  });
  const rpc=async(name,payload)=>{
    if(name==='management_write'){
      assert.equal(payload.p_table,'silver.lo3rwang');
      assert.deepEqual(payload.p_values.keyword_meta,{});
      calls.push('stale');
      return {data:{count:1},error:null};
    }
    assert.equal(name,'apply_keyword_classification');
    const {mode,rows:chunk}=payload.p_rows;
    calls.push(mode);
    if(mode==='chunk'){
      assert.ok(chunk.length<=750);
      for(const item of chunk){
        const row=rows.find(row=>row.uid===item.uid);
        row.class_id=null;row.group_lists='false';
      }
      return {data:chunk.length,error:null};
    }
    if(mode==='reset')assert.ok(rows.every(row=>row.class_id==null&&row.group_lists==='false'));
    return {data:0,error:null};
  };
  const client={schema(){return {from:relation,rpc};}};
  const auth={getSession(){},signInWithOAuth(){},signOut(){}};
  const db=createDatabaseClient({publicClient:client,authClient:client,auth});
  const progress=[];
  const changed=await db.resetKeywordClassification('lo3rwang',{onProgress:p=>progress.push(p)});
  assert.equal(changed,1510);
  assert.deepEqual(calls,['begin','stale','chunk','chunk','chunk','reset']);
  assert.equal(progress.at(-1).phase,'completed');
  assert.equal(progress.at(-1).completed,1510);
});

test('keyword reset reports progress and editing notice remains inside the dock',()=>{
  const panel=readFileSync(new URL('../app/loc/KeywordLibraryPanel.jsx',import.meta.url),'utf8');
  const shell=readFileSync(new URL('../app/AppShell.jsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../app/styles/bottom-navigation.css',import.meta.url),'utf8');
  assert.ok(panel.includes("setResetProgress({phase:'reading',completed:0,total:0})"));
  assert.ok(panel.includes("resetProgress?l.resetInProgress:l.resetClassification"));
  assert.ok(panel.includes('aria-busy="true"'));
  const notice=shell.indexOf('className="scope-edit-dock-notice"');
  assert.ok(notice>0);
  assert.ok(shell.indexOf('</nav>',notice)>notice);
  assert.ok(css.includes('.scope-feature-dock .scope-edit-dock-notice{'));
  assert.ok(css.includes('overflow-wrap:anywhere'));
});
