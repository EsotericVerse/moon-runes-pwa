import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Culture PELT is never invoked synchronously during React render',()=>{
  const culture=read('app/modular/features/Culture.jsx');
  const hook=read('app/modular/modules/culture-timeline/use-river-density-analysis.js');
  assert.equal((culture.match(/useRiverDensityAnalysis\(/g)||[]).length,3);
  assert.doesNotMatch(culture,/riverDensityAnalyzer\(/);
  assert.doesNotMatch(culture,/import\('\.\.\/modules\/culture-timeline\/river-density-analysis\.mjs'\)/);
  assert.match(hook,/new Worker\(new URL\('\.\/river-density-worker\.mjs',import\.meta\.url\)/);
  assert.match(hook,/worker\.terminate\(\)/);
  assert.match(hook,/settled\?\.rows===rows&&settled\?\.anchorDates===anchorDates/);
  assert.match(culture,/hiddenDates=\{riverAnalysis\.hiddenDates\}/);
  assert.match(culture,/riverAnalysis\.suggestions/);
});

test('Worker returns density analysis result and reports errors without blocking the page',()=>{
  const source=read('app/modular/modules/culture-timeline/river-density-worker.mjs')
    .replace(/^import \{analyzeRiverDensity\} from '\.\/river-density-analysis\.mjs';\s*/, '');
  const posted=[];
  const self={postMessage:message=>posted.push(message)};
  const analyzeRiverDensity=(rows,anchors)=>({density:rows,changepoints:[1],hiddenDates:[],suggestions:[],anchorCount:anchors.length});
  vm.runInNewContext(source,{self,analyzeRiverDensity});
  assert.equal(typeof self.onmessage,'function');
  self.onmessage({data:{rows:[{day:'2026-10-01',item_count:2}],anchorDates:['2026-10-01']}});
  assert.equal(posted[0].result.anchorCount,1);
  assert.equal(posted[0].result.density.length,1);
  self.onmessage({data:{rows:[],anchorDates:[]}});
  assert.equal(posted[1].result.density.length,0);

  const errors=[];
  const failureSelf={postMessage:message=>errors.push(message)};
  vm.runInNewContext(source,{self:failureSelf,analyzeRiverDensity:()=>{throw Error('PELT failed');}});
  failureSelf.onmessage({data:{rows:[{}]}});
  assert.equal(errors[0].error,'PELT failed');
});

test('Worker hook keeps suggestions bounded to their active period',()=>{
  const hook=read('app/modular/modules/culture-timeline/use-river-density-analysis.js');
  assert.match(hook,/return \(\)=>\{active=false;worker\?\.terminate\(\);\}/);
  assert.match(hook,/if\(!active\)return;/);
  assert.match(hook,/enabled&&settled\?\.rows===rows&&settled\?\.anchorDates===anchorDates/);
  assert.match(hook,/worker\.onerror=/);
});
