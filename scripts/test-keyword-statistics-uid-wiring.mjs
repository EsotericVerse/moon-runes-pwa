import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const chart=read('app/modular/modules/statistics/StatisticsMultiChart.jsx');
const intersection=read('app/modular/modules/statistics/ScopeSelfIntersection.jsx');
const culture=read('app/modular/features/Culture.jsx');
const kysely=read('app/loc/providers/kysely-runtime.mjs');

test('Kysely routes shared directories through the unified view with required scope',()=>{
  assert.ok(kysely.includes("'silver.read_scope_analytics':['p_scope_id','p_view','p_start','p_end','p_options']"));
  assert.ok(kysely.includes("'silver.read_scope_analytics':['p_scope_id','p_view']"));
  assert.ok(!kysely.includes("'silver.read_shared_keyword_classes':["));

});

test('Statistics binds Item UID directly to Group UID even with duplicate labels',()=>{
  const start=chart.indexOf('  const classByItem=new Map(');
  const end=chart.indexOf('  const groupsWithItems=',start);
  assert.ok(start>=0&&end>start);
  const extract=chart.slice(start,end);
  assert.doesNotMatch(extract,/classByGroup|row\.class_group/);
  const catalog={data:[
    {uid:'I001',group_uid:'G001',class_group:'同名'},
    {uid:'I002',group_uid:'G002',class_group:'同名'}
  ]};
  const mapping=new Function('groupCatalog',extract+';return classByItem;')(catalog);
  assert.equal(mapping.get('I001'),'G001');
  assert.equal(mapping.get('I002'),'G002');
  assert.notEqual(mapping.get('I001'),mapping.get('I002'));
});

test('Self-intersection maps Group membership by UID, not visible label',()=>{
  const start=intersection.indexOf('  const keywordItemGroup=useMemo(');
  const end=intersection.indexOf('  const categoryList=',start);
  assert.ok(start>=0&&end>start);
  const snippet=intersection.slice(start,end);
  assert.match(snippet,/item\.group_uid/);
  assert.doesNotMatch(snippet,/\.class_group/);
  const keywordCatalog={data:[
    {uid:'I001',group_uid:'G001',class_group:'同名'},
    {uid:'I002',group_uid:'G002',class_group:'同名'}
  ]};
  const useMemo=fn=>fn();
  const mapping=new Function('keywordCatalog','useMemo',snippet+';return keywordItemGroup;')(
    keywordCatalog,useMemo);
  assert.equal(mapping.get('I001'),'G001');
  assert.equal(mapping.get('I002'),'G002');
  assert.match(intersection,/item\.group_uid===group\.uid/);
  assert.doesNotMatch(intersection,/item\.group===group\.group/);
});

test('All consumers request the Class UID that produced the summary',()=>{
  assert.match(chart,/readKeywordTreeCatalog\(scopeId,\{classUid:meta\.class_uid\}\)/);
  assert.match(intersection,/readKeywordTreeCatalog\(scope\.id,\{classUid:keywords\.data\.keywordMeta\.class_uid\}\)/);
  assert.match(culture,/readKeywordTreeCatalog\(scopeId,\{classUid:resolvedKeywordClassUid\}\)/);
});

test('Culture and Statistics offer only authorized Class choices and bind queries to UID',()=>{
  for(const code of [culture,read('app/modular/features/Statistics.jsx')]){
    assert.match(code,/selectAvailableKeywordClasses/);
    assert.match(code,/resolvedKeywordClassUid/);
    assert.match(code,/availableKeywordClasses\.map\(item=>/);
  }
  assert.match(read('app/loc/keyword-analysis.js'),/selectAvailableKeywordClasses/);
  assert.match(intersection,/classUid:keywords\.data\?\.keywordMeta\?\.class_uid\|\|classUid/);
});
