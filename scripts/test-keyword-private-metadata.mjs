import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const code=readFileSync(new URL('../app/loc/keyword-analysis.js',import.meta.url),'utf8');
const runner=code.slice(code.indexOf('export async function runKeywordAnalysisBatch('),
  code.indexOf('\nfunction emptyStored('));
const summary=code.slice(code.indexOf('export async function selectKeywordAnalysisSummary('),
  code.indexOf('\n// Stateless:'));

test('per-Class config stores only completion identity, not private labels or hit totals',()=>{
  assert.match(runner,/const meta=\{class_uid:classUid\};/);
  assert.match(runner,/keyword_meta:saved/);
  assert.doesNotMatch(runner,/keyword_meta:isActiveNow\?\{\.\.\.saved,\.\.\.meta\}/);
  assert.doesNotMatch(runner,/const items=Object\.fromEntries\(/);
  assert.doesNotMatch(runner,/fingerprint/);
});

test('public statistics never return private Class state before checking the authorized catalog',()=>{
  assert.match(summary,/readKeywordTreeCatalog\(id,\{classUid:selectedClass\}\)/);
  assert.match(summary,/if\(directory\.class_uid!==selectedClass\)/);
  assert.match(summary,/return emptyStored\(\{\.\.\.config,staticstime:null,keyword_meta:\{\}\}\)/);
});

test('Group and Item labels are resolved from the authorized live UID tree',()=>{
  assert.match(summary,/keywordTreeCatalog\(directory\.rows,selectedClass\)/);
  assert.match(summary,/classes:Object\.fromEntries\(groups\.map\(group=>\[group\.uid,group\.name\]\)\)/);
  assert.match(summary,/items:Object\.fromEntries\(groups\.flatMap\(group=>group\.items\.map\(item=>\[item\.uid,item\.name\]\)\)\)/);
  assert.match(summary,/readKeywordTreeSummary\(id,\{classUid:selectedClass/);
});

test('reanalysis needs no Galaxy createtime sorting or persistent intermediate results',()=>{
  assert.match(code,/async function keywordEligibleCount\(/);
  assert.doesNotMatch(runner,/keywordFingerprint/);
  assert.doesNotMatch(runner,/order\('createtime'/);
  assert.doesNotMatch(runner,/CREATE TABLE|TEMP TABLE|staging/i);
});
