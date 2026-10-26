import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('all browser and native Scopes use direct data readers',async()=>{
  const source=read('app/loc/numeric-isr-client.js');
  assert.doesNotMatch(source,/fetch\(/);
  assert.doesNotMatch(source,/locPublicIsrUrl/);
  const context=vm.createContext({Error});
  const mod=new vm.SourceTextModule(source,{context});
  await mod.link(()=>{throw Error('Unexpected import')});
  await mod.evaluate();
  for(const id of ['loc','lo3rwang','lrunes','local','admin','unknown'])
    assert.equal(mod.namespace.usesNumericIsr(id),false,id);
  await assert.rejects(mod.namespace.readNumericIsr(),/ISR is suspended/);
});

test('retired ISR APIs cannot query SQL or populate cache',()=>{
  for(const path of ['app/api/loc/scopes/[scopeId]/numeric/[kind]/route.js',
    'app/api/loc/revalidate/route.js']){
    const source=read(path);
    assert.match(source,/status:410/);
    assert.match(source,/no-store/);
    assert.doesNotMatch(source,/unstable_cache|revalidateTag|createPublicSupabaseClient/);
  }
});

test('Worker and OpenNext cannot write R2 or Durable Object caches',()=>{
  const openNext=read('open-next.config.ts');
  const wrangler=JSON.parse(read('wrangler.jsonc'));
  assert.match(openNext,/static-assets-incremental-cache/);
  assert.doesNotMatch(openNext,/r2-incremental-cache|do-queue|do-sharded-tag-cache/);
  for(const name of ['r2_buckets','durable_objects','migrations'])assert.equal(wrangler[name],undefined);
  assert.equal(wrangler.assets.binding,'ASSETS');
});

test('Culture, Statistics, Periods, Daily Runes and Trace have direct data providers',()=>{
  const galaxy=read('app/loc/galaxy-query.js');
  const culture=read('app/modular/features/Culture.jsx');
  const stats=read('app/modular/features/Statistics.jsx');
  const daily=read('app/lrunes/DailyRuneAnalytics.jsx');
  const traces=read('app/modular/features/trace/TracePlaceResults.jsx');
  const places=read('app/loc/place-summary-client.js');
  assert.match(galaxy,/readScopeStatistics\(current\.id/);
  assert.match(galaxy,/readScopeOverview\(current\.id/);
  assert.match(galaxy,/readLocStatistics\(/);
  assert.match(culture,/selectScopePeriodSourceSnapshot/);
  assert.match(stats,/selectScopeCultureData\(scopeId\)/);
  assert.match(daily,/selectDailyRuneRange\(range\)/);
  assert.match(traces,/read_trace_place_density/);
  assert.match(places,/read_scope_place_statistics/);
  assert.match(places,/Capacitor\.isNativePlatform/);
});

test('Service Worker and published JS remain independently usable',()=>{
  assert.match(read('public/sw.js'),/staticStrategy\(event\)/);
  const site=read('app/loc/scope-data.js');
  assert.match(site,/PUBLISHED_SITE_BOOTSTRAP/);
  assert.match(site,/loadPublishedBlocks\(id,pageName\)/);
  assert.doesNotMatch(read('scripts/build-static-export.mjs'),/NEXT_PUBLIC_LOC_ISR_ORIGIN/);
});
