import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const query=read('app/loc/culture-query.js');
const culture=read('app/modular/features/Culture.jsx');

test('LOC first river does not read daily Galaxy or media counts',()=>{
  const first=query.slice(query.indexOf('export async function selectScopeCultureData('),
    query.indexOf('export async function selectScopePeriodSourceSnapshot('));
  assert.doesNotMatch(first,/selectScopeDailyCounts\(/);
  assert.match(first,/scopeTimeRanges/);
  assert.match(first,/intersectionWindows/);
  assert.match(first,/scopeRanges:\[\]/);
  assert.match(first,/sourceRiverItems:\[\]/);
});

test('LOC second river requests densities only after explicit expansion',()=>{
  assert.match(culture,/const \[locDensityOpen,setLocDensityOpen\]=useState\(false\)/);
  assert.match(culture,/enabled:isAggregateScope&&scopeId==='loc'&&!isLocItemView&&locDensityOpen/);
  assert.match(culture,/onToggle=\{event=>setLocDensityOpen\(event.currentTarget.open\)\}/);
  assert.match(culture,/selectLocCultureDensity\(/);
  assert.match(culture,/locDensityQuery\.data\?\.sourceRiverItems/);
  assert.match(culture,/locDensityQuery\.data\?\.scopeRanges/);
  assert.match(culture,/locDensityQuery\.isPending/);
  assert.match(culture,/locDensityQuery\.error/);
});

test('LOC density keeps per-Scope daily counts, source ratios and sparse intersection windows',async()=>{
  const start=query.indexOf('export async function selectLocCultureDensity(');
  const end=query.indexOf('export async function selectScopeCultureData(',start);
  assert.ok(start>=0&&end>start);
  const src=query.slice(start,end).replace('export async function','async function');
  let calls=0;
  const run=new Function('selectScopeDailyCounts','buildLocSourceRiver','buildLocScopeDistribution',
    src+'return selectLocCultureDensity;')(
      async()=>{calls++;return {
        text:[{day:'2026-10-01',category:'Facebook',item_count:4},
          {day:'2026-10-02',category:'Threads',item_count:5}],
        media:[{day:'2026-10-01',category:'image',item_count:3}]
      };},
      rows=>({sourceRiverItems:rows,sourceGroups:[{site:'Facebook',item_count:rows.length}]}),
      rows=>rows
    );
  const windows=[{startDate:'2026-10-01',endDate:'2026-10-01'},
    {startDate:'2026-10-03',endDate:'2026-10-03'}];
  assert.deepEqual(await run({scopes:[],intersectionWindows:windows,
    intersectionStart:'2026-10-01',intersectionEnd:'2026-10-03'}),
    {scopeRanges:[],sourceRiverItems:[],sourceGroups:[]});
  assert.equal(calls,0);
  const data=await run({scopes:[{id:'author'}],intersectionWindows:windows,
    intersectionStart:'2026-10-01',intersectionEnd:'2026-10-03'});
  assert.equal(calls,1);
  assert.equal(data.scopeRanges.length,2);
  assert.ok(data.scopeRanges.every(row=>row.day==='2026-10-01'&&row.scope_id==='author'));
  assert.match(culture,/ratio\.toFixed\(1\)/);
  assert.match(culture,/density_ratio:count\/Math\.max\(1,perScopeMax\.get\(scope\)\|\|1\)/);
});
