import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../app/loc/keyword-analysis.js',import.meta.url),'utf8');
const runner=code.slice(code.indexOf('export async function runKeywordAnalysisBatch('),code.indexOf('\nfunction emptyStored('));
const summary=code.slice(code.indexOf('export async function selectKeywordAnalysisSummary('),
 code.indexOf('\nexport function clearKeywordAnalysisCache('));
test('analysis reads Galaxy articles but never updates Galaxy classification columns',()=>{
 assert.match(runner,/\.select\('uid,content,searchable'\)/);
 assert.match(runner,/dbAuthRelation\(scope\.galaxy\)/);
 assert.match(runner,/reanalyzeKeywordClass/);
 assert.match(runner,/update\(\{uid_lists\}\)/);
 assert.doesNotMatch(runner,/\.update\(\{class_id|group_lists|applyKeywordClassification/);
});
test('analysis identifies Class and Items exclusively through four-character UID',()=>{
 assert.match(runner,/current_keyword_class_uid/);
 assert.match(runner,/\.select\('uid,type,name,desc,lists'\)/);
 assert.match(runner,/keywordTreeCatalog/);
 assert.doesNotMatch(runner,/keyword_id|item_no|class_id/);
});
test('public Culture and Statistics summary invokes UID-tree RPC',()=>{
 assert.match(summary,/readKeywordTreeSummary/);
 assert.doesNotMatch(summary,/readRune66Summary|group_lists/);
});
test('stale marker precedes every Group and Item write',()=>{
 assert.ok(runner.indexOf('staticstime:null')<runner.indexOf('writeNode:async'));
});

test('COUNT uses owner visibility and 1000-row cursor batches before writes',()=>{
 const start=code.indexOf('async function keywordEligibleCount(');
 const end=code.indexOf('export async function selectActiveKeywordClassName(',start);
 const countFunction=code.slice(start,end);
 assert.ok(countFunction.includes('dbAuthRelation(scope.galaxy)'));
 assert.ok(countFunction.includes("count:'exact',head:true"));
 assert.doesNotMatch(countFunction,/selectCount\(/);
 assert.ok(code.includes('KEYWORD_ANALYSIS_READ_PAGE_SIZE=1000'));
 assert.ok(runner.includes('expectedCount:eligibleCount'));
 assert.ok(runner.includes(".gt('uid',lastArticleUid)"));
});
