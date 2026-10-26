import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {summarizeCultureRiverRoots,selectCultureRiverChildren,buildCultureRiverRootPayload} from '../app/loc/culture-river-roots.mjs';
const taxonomy={
  categories:[{category_code:'facebook',enabled:true},{category_code:'others',enabled:true}],
  aliases:[{source_key:'facebook',category_code:'facebook'}]
};
const rows=[
  {day:'2026-10-01',kind:'source',category:'Facebook',item_count:4},
  {day:'2026-10-01',kind:'source',category:'Website',item_count:2},
  {day:'2026-10-01',kind:'media',category:'music',item_count:3},
  {day:'2026-10-01',kind:'total',category:'文字作品',item_count:6},
  {day:'2026-10-01',kind:'total',category:'多媒體',item_count:3},
  {day:'2026-10-02',kind:'source',category:'Facebook',item_count:1}
];
test('root buckets preserve distinct system, personal and media counts',()=>{
  const summary=summarizeCultureRiverRoots(rows,taxonomy);
  assert.deepEqual(summary.rootBuckets,[
    {category:'custom',start_date:'2026-10-01',item_count:2},
    {category:'media',start_date:'2026-10-01',item_count:3},
    {category:'system',start_date:'2026-10-01',item_count:4},
    {category:'system',start_date:'2026-10-02',item_count:1}
  ]);
  assert.equal(summary.groups.length,3);
});
test('expanded root filter never leaks other source types or top-level totals',()=>{
  assert.deepEqual(selectCultureRiverChildren(rows,taxonomy,['system']).map(x=>x.item_count),[4,1]);
  assert.deepEqual(selectCultureRiverChildren(rows,taxonomy,['custom']).map(x=>x.item_count),[2]);
  assert.deepEqual(selectCultureRiverChildren(rows,taxonomy,['media']).map(x=>x.item_count),[3]);
  assert.equal(selectCultureRiverChildren(rows,taxonomy,[]).length,0);
});

test('first paint summarizes only roots; expanded children reuse same numeric RPC data',()=>{
  const counted={
    text:[
      {day:'2026-10-01',category:'Facebook',item_count:4},
      {day:'2026-10-01',category:'Website',item_count:2},
      {day:'2026-10-02',category:'Facebook',item_count:1},
      {day:'',category:'Facebook',item_count:9}
    ],
    media:[{day:'2026-10-01',category:'music',item_count:3}]
  };
  const data=buildCultureRiverRootPayload(counted,taxonomy);
  assert.deepEqual(data.rootBuckets,[
    {category:'custom',start_date:'2026-10-01',item_count:2},
    {category:'media',start_date:'2026-10-01',item_count:3},
    {category:'system',start_date:'2026-10-01',item_count:4},
    {category:'system',start_date:'2026-10-02',item_count:1}
  ]);
  assert.equal(data.groups.length,3);
  assert.equal(data.numericRows.length,5);
  assert.deepEqual(selectCultureRiverChildren(data.numericRows,taxonomy,['system'])
    .filter(row=>row.day).map(row=>row.item_count),[4,1]);
  assert.deepEqual(selectCultureRiverChildren(data.numericRows,taxonomy,['custom'])
    .map(row=>row.item_count),[2]);
  assert.deepEqual(selectCultureRiverChildren(data.numericRows,taxonomy,['media'])
    .map(row=>row.item_count),[3]);
  assert.equal(selectCultureRiverChildren(data.numericRows,taxonomy,[]).length,0);
});

test('empty and single-source Scopes retain correct parent counts without a child network request',()=>{
  const empty=buildCultureRiverRootPayload({text:[],media:[]},taxonomy);
  assert.deepEqual(empty,{rootBuckets:[],groups:[],numericRows:[]});
  const single=buildCultureRiverRootPayload({
    text:[{day:'2026-10-03',category:'Facebook',item_count:7}],
    media:[]
  },taxonomy);
  assert.deepEqual(single.rootBuckets,[
    {category:'system',start_date:'2026-10-03',item_count:7}
  ]);
  assert.equal(single.groups.length,1);
  assert.equal(single.groups[0].item_count,7);
});

test('progressive Culture component uses SQL once and does not require numeric ISR',()=>{
  const source=readFileSync(new URL('../app/modular/features/Culture.jsx',import.meta.url),'utf8');
  assert.match(source,/const stagedSourceRiver=Boolean\(publishedTaxonomy\)/);
  assert.match(source,/queryFn:async\(\)=>\{\s*const \{text,media\}=await selectScopeDailyCounts\(scopeData/);
  assert.match(source,/return buildCultureRiverRootPayload\(\{text,media\},publishedTaxonomy\)/);
  assert.match(source,/return selectCultureRiverChildren\(sourceRootQuery\.data\.numericRows,publishedTaxonomy,expandedSourceRoots\)/);
  assert.match(source,/\(!stagedSourceRiver\|\|expandedSourceReady\)/);
  assert.match(source,/numericRows:requestedChildren/);
  assert.doesNotMatch(source,/readNumericIsr|usesNumericIsr|systemChildrenQuery|customChildrenQuery|mediaChildrenQuery/);
  assert.equal((source.match(/await selectScopeDailyCounts\(scopeData/g)||[]).length,1);
});
