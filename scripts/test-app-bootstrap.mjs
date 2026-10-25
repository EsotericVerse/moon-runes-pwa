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

test('LOC homepage gets published Blocks independently of the shared metadata',async()=>{
  const {calls,site,resolveSite,selectAppBootstrap}=await harness();
  const pending=selectAppBootstrap('loc','index');
  assert.deepEqual(calls,['site','blocks:loc:index']);
  resolveSite(site);
  const result=await pending;
  assert.equal(result.config.id,'loc');
  assert.equal(result.blocks[0].uid,'loc-index');
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
  const subgroup=administrativeSourceTrend(raw,taxonomy,{...range,sourceCategory:'facebook',sourceNames:['fb']});
  assert.equal(subgroup.total,4);
  assert.equal(administrativeSourceTrend(raw,taxonomy,{...range,sourceCategory:'facebook',sourceNames:[]}).total,0);
});

test('statistics preserves Admin categories and Scope Others subgroup filters',()=>{
  const code=readFileSync(new URL('../app/modular/features/Statistics.jsx',import.meta.url),'utf8');
  assert.match(code,/const activeSourceSelection=styleFilter==='rune66'/);
  assert.match(code,/queryRange\.bucket,activeSourceSelection,sourceSubgroup/);
  assert.match(code,/unit:queryRange\.bucket,sourceCategory:activeSourceSelection,sourceNames:selectedRawNames/);
  assert.match(code,/filteredSource=\{Boolean\(activeSourceSelection\)\}/);
  assert.match(code,/statistics_scope_others_groups/);
  assert.match(code,/statistics_scope_others_aliases/);
  assert.match(code,/uiExtra\.statisticsView\.othersBreakdownTitle/);
});

test('keyword charts share one canvas and intersections offer at most eight lanes',async()=>{
  const chart=readFileSync(new URL('../app/modular/modules/statistics/StatisticsMultiChart.jsx',import.meta.url),'utf8');
  const pane=readFileSync(new URL('../app/modular/modules/statistics/ScopeSelfIntersection.jsx',import.meta.url),'utf8');
  assert.equal(chart.match(/<StatisticsMultiChart type=\{actualChart\}/g)?.length,1);
  assert.match(chart,/群組＋項目（同圖）/);
  assert.match(chart,/value:Number\(row.document_count\)/);
  assert.match(pane,/maximumLanes=Math.min\(8,/);
  assert.match(pane,/kind:'keyword_group'/);
  assert.match(pane,/kind:'keyword_item'/);
  assert.match(pane,/kind:'others_subgroup'/);
  const {color,pointColor,normalizeDistribution}=await import('../app/modular/modules/statistics/statistics-time-zoom.mjs');
  assert.equal(new Set(Array.from({length:8},(_,i)=>color(i))).size,8);
  assert.equal(new Set(Array.from({length:48},(_,i)=>pointColor(i))).size,48);
  assert.equal(pointColor(25),pointColor(25));
  assert.equal(normalizeDistribution([{name:'群組',value:3,fill:'#8962e3'}])[0].fill,'#8962e3');
  // The primary graph uses multiple series; each displayed bar, not merely
  // each series, needs a Cell with its own color.
  assert.match(chart,/display\.map\(\(_,j\)=><Cell key=\{j\} fill=\{pointColor\(j\*timeFields\.length\+i\)\}/);
  assert.match(chart,/composed\.map\(\(_,i\)=><Cell key=\{i\} fill=\{pointColor\(i\)\}/);
  assert.match(chart,/colorPanel=\{colored\.map\(item=>item\.fill\)\}/);
  assert.match(chart,/paired\.data\.map\(\(row,i\)=><Cell key=/);
  assert.match(chart,/fields\.length>1&&!\['bar','composed'\]\.includes\(actual\)/);
});


test('keyword combined ranking follows actual Class membership and keeps pagination',()=>{
  const source=readFileSync(new URL('../app/modular/modules/statistics/StatisticsMultiChart.jsx',import.meta.url),'utf8');
  const start=source.indexOf('  const classByGroup=new Map(');
  const end=source.indexOf('  const trend=keywordGroupTrend(',start);
  assert.ok(start>0&&end>start,'grouped ranking model must exist');
  const model=new Function('meta','groupCatalog','classRows','groupRows','shown','page',
    'standalonePageSize','combinedPageSize','groupLabel','t','color','classLabel',
    source.slice(start,end)+
    'return {pages,visibleCombined,visibleGroupRows,combinedDistribution};');
  const meta={classes:{'7':'秩序','2':'連結'}};
  const groupCatalog={data:Array.from({length:12},(_,i)=>({
    item_no:i+1,class_group:i<8?'秩序':'連結',class_enable:true
  }))};
  const classRows=[
    {class_id:7,group:'秩序',document_count:20},
    {class_id:2,group:'連結',document_count:10}
  ];
  const groupRows=Array.from({length:12},(_,i)=>({
    rune_id:i+1,label:'符文'+(i+1),count:100-i,document_count:50-i
  }));
  const select=(shown,page)=>model(meta,groupCatalog,classRows,groupRows,shown,page,8,10,
    label=>label,value=>value,index=>'color'+index,label=>label);
  const first=select('both',1),second=select('both',2);
  assert.equal(first.visibleCombined.length,10);
  assert.equal(second.visibleCombined.length,2);
  assert.equal(first.visibleCombined[0].classification.class_id,7);
  assert.equal(first.visibleCombined[8].classification.class_id,2);
  assert.match(first.combinedDistribution[0].name,/Class 7/);
  assert.match(second.combinedDistribution[0].name,/Class 2/);
  assert.equal([...first.visibleCombined,...second.visibleCombined].length,12);
  assert.equal(select('item',1).visibleGroupRows.length,8);
  assert.equal(select('item',2).visibleGroupRows.length,4);
});


test('advanced statistics uses grouped category tabs and real keyword group membership',()=>{
  const source=readFileSync(new URL('../app/modular/modules/statistics/ScopeSelfIntersection.jsx',import.meta.url),'utf8');
  const dimensions=source.slice(source.indexOf('export const DIMENSION_FILTERS='),source.indexOf('export const DIMENSIONS='));
  for(const label of ['作品來源','多媒體','關鍵詞'])assert.ok(dimensions.includes("label:'"+label+"'"));
  assert.equal((dimensions.match(/label:/g)||[]).length,3);
  const ui=source.slice(source.indexOf('<div className="scope-self-intersection-comparisons">'),
    source.indexOf('<div className="scope-stat-controls">',source.indexOf('<div className="scope-self-intersection-comparisons">')));
  assert.ok(ui.includes('Array.from({length:lanes}'));
  assert.equal((ui.match(/<select className="scope-select"/g)||[]).length,0);
  assert.ok(ui.includes('scope-self-intersection-kind-tabs'));
  assert.ok(ui.includes('scope-self-stat-item-tabs'));
  assert.ok(ui.includes('aria-pressed={chosenId===item.id}'));
  assert.ok(source.includes('scope-advanced-keyword-catalog'));
  assert.ok(source.includes("columns:'class_group,item_no,item_name,class_enable'"));
  assert.ok(source.includes('item.group===group.group'));
  assert.ok(source.includes("dimensionForKind(item.kind)===shownKinds[index]"));
  assert.ok(source.includes('keywordTabAvailable'));
  assert.ok(source.includes('const hitGroups=new Set()'));
  assert.ok(source.includes('for(const group of hitGroups)add('));
  assert.ok(source.includes('maximumLanes=Math.min(8,'));
  assert.ok(source.includes("kind:'source_rollup'"));
  assert.ok(source.includes("name:'系統分類'"));
  assert.ok(source.includes("name:'個人分類'"));
  assert.ok(source.includes("ids.push('source_rollup'+String.fromCharCode(0)+'system')"));
  const start=source.indexOf('export function mediaTypeFamily(raw)');
  const end=source.indexOf('const MEDIA_GROUP_NAMES=',start);
  const family=new Function(source.slice(start,end).replace('export function','function')+
    'return mediaTypeFamily;')();
  assert.equal(family('suno'),'music');
  assert.equal(family('facebook_pic'),'image');
  assert.equal(family('youtube_video'),'video');
  assert.equal(family('instagram'),'', 'An unspecific platform must not be guessed as image/video');
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
  const auth={getSession(){},getUser(){},signInWithOAuth(){},signOut(){}};
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


test('Web Settings cannot navigate into the iOS-only local Scope',()=>{
  const settings=readFileSync(new URL('../app/loc/GlobalSettings.jsx',import.meta.url),'utf8');
  const shell=readFileSync(new URL('../app/AppShell.jsx',import.meta.url),'utf8');
  const locApp=readFileSync(new URL('../app/loc/LocApp.jsx',import.meta.url),'utf8');
  const scopeRegistry=readFileSync(new URL('../app/modular/scope-registry.js',import.meta.url),'utf8');
  assert.ok(scopeRegistry.includes('nativeOnly:true'));
  assert.ok(settings.includes("if(native)baseChoices.push({id:'local'"));
  assert.ok(settings.includes("(!native&&getScope(row.scope_id).nativeOnly)"));
  assert.ok(settings.includes("...(native&&Capacitor.getPlatform()==='ios'?[option('files'"));
  assert.ok(settings.includes("native&&Capacitor.getPlatform()==='ios'&&activeSection==='files'?<LocalDatabaseImport/>"));
  assert.ok(!settings.includes('const managedScopes='));
  assert.ok(!settings.includes('loc-import-scope'));
  assert.ok(!settings.includes('ManagementImportPanel'));
  assert.ok(shell.includes("const navScopeId=!native&&currentScope.nativeOnly?'loc'"));
  assert.ok(shell.includes("(native||!getScope(id).nativeOnly)"));
  assert.ok(locApp.includes("router.replace('/local/settings/')"));
  assert.ok(locApp.includes("if(scopeMeta?.nativeOnly&&!nativeOnlyReady)"));
});

test('Settings document import is iOS only, and the existing importer uses local SQLite',()=>{
  const settings=readFileSync(new URL('../app/loc/GlobalSettings.jsx',import.meta.url),'utf8');
  const localImport=readFileSync(new URL('../app/loc/LocalDatabaseImport.jsx',import.meta.url),'utf8');
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  const dbClient=readFileSync(new URL('../app/loc/db-client.mjs',import.meta.url),'utf8');
  assert.match(settings,/native&&Capacitor\.getPlatform\(\)==='ios'\?\[option\('files'/);
  assert.doesNotMatch(settings,/activeSection==='files'&&!native/);
  assert.doesNotMatch(settings,/loc-import-scope|requestedScope|managedScopes|ManagementImportPanel/);
  assert.match(localImport,/importChoice==='yes'\?<ManagementImportPanel scopeId="local"\/>/);
  assert.match(panel,/scopeId==='local'&&Capacitor\.isNativePlatform\(\)&&Capacitor\.getPlatform\(\)==='ios'/);
  assert.match(dbClient,/if\(name==='local'\|\|name\.startsWith\('local_'\)\)return true/);
});

test('LOC public search is global and does not enumerate Scope IDs in its UI',()=>{
  const search=readFileSync(new URL('../app/modular/features/Search.jsx',import.meta.url),'utf8');
  assert.match(search,/const locPublicSearch=scopeId==='loc'&&!managementMode/);
  assert.match(search,/const searchScopes=scopeId==='loc'&&managementMode&&options\.scopeFilter/);
  assert.match(search,/scopeFilter:managementMode\?String\(searchParams\?\.get\('scope'\)\|\|''\):''/);
  assert.match(search,/scopeId==='loc'&&managementMode\?<div className="scope-search-scope-filter">/);
  assert.match(search,/scopeId=\{locPublicSearch\?'':row\.scopeId\}/);
  assert.match(search,/return label&&label!==id\?label:''/);
  assert.match(search,/searchGalaxyRows\(searchScopes,q,/);
  assert.match(search,/queryFn:managementMode\?\(\)=>selectScopeRegistry\(\{scopeKind:'scope'\}\):selectLocSearchScopes/);
});

test('Culture river keeps three collapsed parents, expandable child lanes and touch candidate details',()=>{
  const culture=readFileSync(new URL('../app/modular/features/Culture.jsx',import.meta.url),'utf8');
  const river=readFileSync(new URL('../app/modular/modules/culture-timeline/CultureTimeline.jsx',import.meta.url),'utf8');
  assert.match(culture,/openCultureRoots.*useState/);
  assert.match(culture,/id:'system',label:l\.system/);
  assert.match(culture,/id:'custom',label:l\.custom/);
  assert.match(culture,/id:'media',label:l\.media/);
  assert.match(culture,/onGroupToggle=\{id=>/);
  assert.match(culture,/anchorInsight=\{anchorInsight\}/);
  assert.match(culture,/setFocusedAnchorDate\(date\)/);
  assert.match(river,/button\.setAttribute\('aria-expanded'/);
  assert.match(river,/onGroupToggleRef\.current/);
  assert.match(river,/addCustomTime\(/);
  assert.match(river,/scope-candidate-insight/);
});

test('Culture period and event selectors expose different second-option catalogs',()=>{
  const source=readFileSync(new URL('../app/modular/features/Culture.jsx',import.meta.url),'utf8');
  assert.match(source,/value=\{cultureTimeKind\}/);
  assert.match(source,/setCultureTimeKind\(kind\)/);
  assert.match(source,/cultureTimeKind==='event'/);
  assert.match(source,/cultureEventOptions\.map\(item=><option/);
  assert.match(source,/primaryPeriods\.map\(item=><option/);
  assert.doesNotMatch(source,/<optgroup label=\{l\.eventOption\}>/);
});

test('Culture river hides zero-count parents, folds singleton children and renders a localized empty state',()=>{
  const code=readFileSync(new URL('../app/modular/features/Culture.jsx',import.meta.url),'utf8');
  assert.match(code,/if\(!activeRoots\.has\(parent\.id\)\)continue/);
  assert.match(code,/const onlyChild=members\.length===1\?members\[0\]:null/);
  assert.match(code,/collapsible:members\.length>1/);
  assert.match(code,/label=onlyChild\?\.label\|\|parent\.label/);
  assert.match(code,/!cultureRiver\.hasSourceData/);
  assert.match(code,/noDataInPeriod/);
  const river=readFileSync(new URL('../app/modular/modules/culture-timeline/CultureTimeline.jsx',import.meta.url),'utf8');
  assert.match(river,/timelineDataRef=useRef\(null\)/);
  assert.match(river,/timelineGroupsRef=useRef\(null\)/);
  assert.match(river,/groups\.update\(changedGroups\)/);
  assert.match(river,/data\.update\(changedRows\)/);
  assert.match(river,/heightVariant==='double'\?null:rows/);
});

test('Culture second river waits for its first source snapshot and avoids lazy density remounts',()=>{
  const culture=readFileSync(new URL('../app/modular/features/Culture.jsx',import.meta.url),'utf8');
  const river=readFileSync(new URL('../app/modular/modules/culture-timeline/CultureTimeline.jsx',import.meta.url),'utf8');
  assert.match(culture,/stagedSourceRiver\?sourceRootQuery\.data:sourceSnapshotQuery\.data/);
  assert.match(culture,/openCultureRoots\.length>0/);
  assert.match(culture,/readNumericIsr\(scopeId,'culture-children'/);
  assert.match(culture,/legacyRows=await readNumericIsr\(scopeId,'culture'/);
  assert.doesNotMatch(culture,/\(!sourceSnapshotQuery\.data\|\|riverRangeLoading\|\|cultureRiver\.hasSourceData\)/);
  assert.match(river,/heightVariant==='double'\?null:hiddenDates/);
  assert.match(river,/timeline\.setOptions\(\{hiddenDates:/);
  assert.match(river,/appliedHiddenDatesRef\.current=hiddenDates/);
});
