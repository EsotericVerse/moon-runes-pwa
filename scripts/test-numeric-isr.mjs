import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

// The real Route Handler is evaluated against a deterministic shared
// unstable_cache; the mocked RPC count proves warm hits do not rerun SQL.
const code=readFileSync(new URL('../app/api/loc/scopes/[scopeId]/numeric/[kind]/route.js',import.meta.url),'utf8');
async function harness(){
  const queries=[],mediaReads=[],storage=new Map();
  const context=vm.createContext({Response,URL,Date,Promise});
  const values={
    'next/cache':{unstable_cache:(fn,parts)=>async()=>{
      const key=JSON.stringify(parts);
      if(!storage.has(key))storage.set(key,await fn());
      return storage.get(key);
    }},
    '../../../../_cors':{withLocCors:r=>r,locCorsPreflight:()=>new Response(null,{status:204})},
    '../../../../../../modular/published-source-taxonomy.js':{publishedSourceTaxonomy:()=>({
      categories:[{category_code:'facebook',enabled:true}],aliases:[{source_key:'facebook',category_code:'facebook'}]
    })},
    '../../../../../../loc/culture-river-roots.mjs':{selectCultureRiverChildren:(rows,taxonomy,roots)=>roots.includes('system')?rows.filter(x=>x.kind==='source'):[],summarizeCultureRiverRoots:rows=>({
      rootBuckets:rows.filter(x=>x.kind==='source').map(x=>({category:'system',start_date:x.day,item_count:x.item_count})),
      groups:rows.filter(x=>x.kind==='source').map(x=>({source_name:x.category||'facebook',item_count:x.item_count}))
    })},
    '../../../../../../loc/statistics-facets':{StatisticsFacets:{base:{mediaFacetDaily:(rows,dimension)=>rows.map(row=>({
      day:'2026-10-01',category:dimension==='media_type'?row.media_type:'Suno',item_count:1
    }))}}},
    '../../../../_server':{
      validScopeId:x=>/^[a-z][a-z0-9]{0,14}$/.test(x),
      createPublicSupabaseClient:()=>({
        from:table=>({
          select(){return this},order(){return this},range(){return this},gte(){return this},lte(){return this},
          in(){return this},limit(){return this},
          then(resolve){
            mediaReads.push(table);
            const data=table==='lrunes_daily'
              ?[{record_date:'2026-10-01',draw_kind:'main',rune_number:1,direction:'正位',recorded_phase:'滿月'},
                {record_date:'2026-10-02',draw_kind:'supplement',rune_number:2,direction:'逆位',recorded_phase:'下弦'}]
              :table==='runes'
                ?[{rune_id:1,rune_name:'月',moon_phase:2},{rune_id:2,rune_name:'心',moon_phase:1}]
                :[{media_id:1,media_type:'music',createtime:'2026-10-01T10:00:00+08:00'},
                  {media_id:2,media_type:'music',createtime:'2026-10-01T11:00:00+08:00'}];
            resolve({data,error:null});
          }
        }),
        rpc:async(name,args)=>{
        queries.push({name,args});
        return {data:name==='read_scope_earliest'?'2025-01-01'
          :name==='read_loc_statistics'
          ?{earliest:'2023-01-01',scopes:[{scope_id:'lo3rwang',display_name:'作者'}],rows:[{scope_id:'lo3rwang',day:'2026-10-01',item_count:3}]}
          :name==='read_scope_statistics'
          ?[{day:'2026-10-01',kind:'source',item_count:3}]
          :{earliest:'2025-01-01',rows:[{day:'2026-10-01',item_count:5}],categories:[],aliases:[]},
          error:null};
        }
      })
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
  return {GET:module.namespace.GET,queries,mediaReads,storage};
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
test('LOC group statistics ISR lazily loads one shared numeric snapshot',async()=>{
  const h=await harness(),query='?start=2026-01-01&end=2026-10-01';
  for(let i=0;i<5;i++){
    const response=await get(h,'loc','loc-statistics',query);
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.earliest,'2023-01-01');
    assert.equal(data.rows[0].scope_id,'lo3rwang');
  }
  assert.deepEqual(h.queries.map(x=>x.name),['read_loc_statistics']);
  await get(h,'loc','loc-statistics','?start=2026-01-02&end=2026-10-01');
  assert.equal(h.queries.length,2);
  assert.equal((await get(h,'lo3rwang','loc-statistics',query)).status,400);
  assert.equal((await get(h,'loc','loc-statistics',query+'&undated=1')).status,400);
  assert.equal(h.queries.length,2,'Invalid LOC routes must not query SQL');
});

test('Statistics and Culture optional queries stay off until selected',()=>{
  const statistics=readFileSync(new URL('../app/modular/features/Statistics.jsx',import.meta.url),'utf8');
  const culture=readFileSync(new URL('../app/modular/features/Culture.jsx',import.meta.url),'utf8');
  assert.ok(statistics.includes('enabled:periodOptionsRequested&&!isLrunesDaily'));
  assert.ok(statistics.includes("enabled:!isLrunesDaily&&styleFilter==='rune66'"));
  assert.ok(statistics.includes('onFocus={()=>setPeriodOptionsRequested(true)}'));
  assert.ok(culture.includes("enabled:sourceChildrenEnabled&&openCultureRoots.includes('system')"));
  assert.ok(culture.includes("enabled:sourceChildrenEnabled&&openCultureRoots.includes('custom')"));
  assert.ok(culture.includes("enabled:sourceChildrenEnabled&&openCultureRoots.includes('media')"));
});

test('private Scope and invalid numeric requests never execute SQL',async()=>{
  const h=await harness();
  for(const [id,kind,query] of [
    ['local','statistics',''],['admin','statistics',''],
    ['lo3rwang','statistics','?start=invalid'],['lo3rwang','search',''],
    ['lo3rwang','culture','?start=2026-10-01&end=2026-09-01']
  ])assert.equal((await get(h,id,kind,query)).status,400);
  assert.equal(h.queries.length,0);
});

test('media facet ISR returns counts only and repeats without another SQL scan',async()=>{
  const h=await harness();
  const route='?dimension=media_type&start=2026-10-01&end=2026-10-02';
  const first=await get(h,'lo3rwang','facet',route);
  assert.equal(first.status,200);
  assert.deepEqual(await first.json(),[{day:'2026-10-01',category:'music',item_count:2}]);
  for(let i=0;i<4;i++)assert.equal((await get(h,'lo3rwang','facet',route)).status,200);
  assert.deepEqual(h.mediaReads,['lo3rwang_galaxy_media']);
  assert.equal(h.queries.length,0,'Facet payload must not run an unrelated RPC');
  await get(h,'lo3rwang','facet','?dimension=media_platform&start=2026-10-01&end=2026-10-02');
  assert.equal(h.mediaReads.length,2,'Different graph dimensions retain independent cache keys');
  const style=await get(h,'lo3rwang','facet','?dimension=media_style&start=2026-10-01&end=2026-10-02');
  assert.equal(style.status,200);
  assert.deepEqual(await style.json(),[{day:'2026-10-01',category:'Suno',item_count:2}]);
  for(let i=0;i<3;i++)assert.equal((await get(h,'lo3rwang','facet','?dimension=media_style&start=2026-10-01&end=2026-10-02')).status,200);
  assert.equal(h.mediaReads.length,3,'Media style numeric chart is cached, separate from type/platform');
  assert.equal((await get(h,'lo3rwang','facet','?dimension=unknown')).status,400);
});

test('ordinary Rune Culture/Statistics charts also use the public numeric ISR',async()=>{
  const h=await harness();
  const culture=await get(h,'lrunes','culture','?start=2026-01-01&end=2026-10-25');
  const statistics=await get(h,'lrunes','statistics','?start=2026-01-01&end=2026-10-25');
  assert.equal(culture.status,200);
  assert.equal(statistics.status,200);
  await get(h,'lrunes','statistics','?start=2026-01-01&end=2026-10-25');
  assert.deepEqual(h.queries.map(x=>x.name),['read_scope_statistics','read_scope_overview']);
  const client=readFileSync(new URL('../app/loc/numeric-isr-client.js',import.meta.url),'utf8');
  assert.match(client,/scopeId!=='local'/);
  // The general client must accept lrunes culture/statistics.
  // Restricting "daily" and "daily-earliest" to lrunes is correct and independent.
  assert.ok(client.includes("scopeId!=='local'&&scopeId!=='admin'"));
  assert.ok(client.includes("['daily','daily-earliest'].includes(kind)&&scopeId!=='lrunes'"));
  const daily=readFileSync(new URL('../app/modular/features/Statistics.jsx',import.meta.url),'utf8');
  assert.ok(daily.includes("const isLrunesDaily="));
});

test('daily Rune Culture and Statistics reuse one cached public record set per date range',async()=>{
  const h=await harness();
  const url='?start=2026-10-01&end=2026-10-02';
  const response=await get(h,'lrunes','daily',url);
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),[
    {record_date:'2026-10-01',draw_kind:'main',rune_number:1,direction:'正位',
      recorded_phase:'滿月',rune_id:1,rune_name:'月',moon_phase:2},
    {record_date:'2026-10-02',draw_kind:'supplement',rune_number:2,direction:'逆位',
      recorded_phase:'下弦',rune_id:2,rune_name:'心',moon_phase:1}
  ]);
  for(let i=0;i<4;i++)assert.equal((await get(h,'lrunes','daily',url)).status,200);
  assert.deepEqual(h.mediaReads,['lrunes_daily','runes'],
    'Warm ISR hits must not query either the Daily table or Rune catalog');
  await get(h,'lrunes','daily','?start=2026-10-02&end=2026-10-03');
  assert.equal(h.mediaReads.length,4,'A new date range has its own cached payload');
});

test('daily Rune earliest date shares ISR and invalid routes cannot read SQL',async()=>{
  const h=await harness();
  const result=await get(h,'lrunes','daily-earliest');
  assert.equal(result.status,200);
  assert.equal(await result.json(),'2026-10-01');
  await get(h,'lrunes','daily-earliest');
  assert.deepEqual(h.mediaReads,['lrunes_daily']);
  for(const [id,kind,query] of [
    ['local','daily','?start=2026-10-01&end=2026-10-02'],
    ['lo3rwang','daily','?start=2026-10-01&end=2026-10-02'],
    ['lrunes','daily',''],['lrunes','daily-earliest','?start=2026-10-01']
  ])assert.equal((await get(h,id,kind,query)).status,400);
  assert.equal(h.mediaReads.length,1);
  const ui=readFileSync(new URL('../app/lrunes/DailyRuneAnalytics.jsx',import.meta.url),'utf8');
  assert.ok(ui.includes("readNumericIsr('lrunes','daily',range)"));
  assert.ok(ui.includes("readNumericIsr('lrunes','daily-earliest')"));
});

test('statistics media earliest date uses one cached RPC across repeated openings',async()=>{
  const h=await harness();
  for(let i=0;i<5;i++){
    const response=await get(h,'lo3rwang','earliest');
    assert.equal(response.status,200);
    assert.equal(await response.json(),'2025-01-01');
  }
  assert.deepEqual(h.queries.map(row=>row.name),['read_scope_earliest']);
  const client=readFileSync(new URL('../app/loc/galaxy-query.js',import.meta.url),'utf8');
  assert.ok(client.includes("if(usesNumericIsr(current.id))return readNumericIsr(current.id,'earliest')"));
});

test('media style chart uses numeric ISR; raw cross-tag scan is explicitly on demand',()=>{
  const view=readFileSync(new URL('../app/modular/features/Statistics.jsx',import.meta.url),'utf8');
  const model=readFileSync(new URL('../app/modular/modules/statistics/MediaFacetStatistics.jsx',import.meta.url),'utf8');
  assert.ok(view.includes('const mediaRows=mediaQuery.data||[];'));
  assert.ok(view.includes("enabled:rankingType==='media_style'&&crossTagRequested"));
  assert.ok(view.includes('onOpen={()=>setCrossTagRequested(true)}'));
  assert.ok(view.includes('onRequestRawStyles={()=>setCrossTagRequested(true)}'));
  assert.ok(model.includes("if(next!=='tags')onRequestRawStyles?.()"));
});

test('initial compact Culture roots and later detail reuse the SAME ISR SQL result',async()=>{
  const h=await harness(),q='?start=2026-01-01&end=2026-10-01&undated=1';
  const root=await get(h,'lo3rwang','culture-roots',q);
  assert.equal(root.status,200);
  assert.equal((await root.json()).rootBuckets[0].item_count,3);
  const detail=await get(h,'lo3rwang','culture',q);
  assert.equal(detail.status,200);
  assert.equal((await detail.json()).length,1);
  assert.equal(h.queries.length,1);
  assert.equal(h.queries[0].args.p_include_undated,true);
});

test('opening one classified root requests only its children, with no new SQL',async()=>{
  const h=await harness(),q='?start=2026-01-01&end=2026-10-01&undated=1';
  await get(h,'lo3rwang','culture-roots',q);
  const details=await get(h,'lo3rwang','culture-children',q+'&roots=system');
  assert.equal(details.status,200);
  assert.equal((await details.json()).length,1);
  assert.equal(h.queries.length,1);
  assert.equal((await get(h,'lo3rwang','culture-children',q+'&roots=invalid')).status,400);
});
