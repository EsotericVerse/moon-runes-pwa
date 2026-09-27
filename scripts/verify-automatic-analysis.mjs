import assert from 'node:assert/strict';
import {
  analyzeDistribution,
  analyzeDistributionChange,
  analyzeKeywordDiagnostics,
  analyzeKeywordGovernance,
  analyzeTemporalDensity
} from '../app/loc/model/automatic-analysis.mjs';

const density=analyzeTemporalDensity([
  {week_start:'2026-09-01',work_count:2},
  {week_start:'2026-09-08',work_count:2},
  {week_start:'2026-09-15',work_count:8},
  {week_start:'2026-09-22',work_count:2}
],{minimumCount:3,highRatio:1.75});
assert.ok(density.suggestions.some(item=>item.type==='density_high'&&item.date==='2026-09-15'));

const distribution=analyzeDistribution([
  {term:'A',item_count:8},{term:'B',item_count:2},{term:'C',item_count:1}
],{label:'測試'});
assert.ok(distribution.suggestions.some(item=>item.type==='concentration'&&item.term==='A'));

const change=analyzeDistributionChange(
  [
    {term:'上升',item_count:8},
    {term:'新出現',item_count:3},
    {term:'持續',item_count:4}
  ],
  [
    {term:'上升',item_count:3},
    {term:'消失',item_count:4},
    {term:'持續',item_count:4}
  ],
  {minimumCount:2}
);
assert.ok(change.suggestions.some(item=>item.type==='rising'&&item.term==='上升'));
assert.ok(change.suggestions.some(item=>item.type==='emerging'&&item.term==='新出現'));
assert.ok(change.suggestions.some(item=>item.type==='disappeared'&&item.term==='消失'));
assert.ok(change.suggestions.some(item=>item.type==='persistent'&&item.term==='持續'));

const governance=analyzeKeywordGovernance(
  [{term:'文化',item_count:6}],
  [{term:'文化',item_count:2},{term:'舊詞',item_count:4}],
  {
    candidateRows:[{term:'新候選',item_count:5}],
    catalogRows:[{term:'文化'},{term:'舊詞'},{term:'零命中'}],
    minimumCount:2
  }
);
assert.ok(governance.suggestions.some(item=>item.governance==='raise_candidate'&&item.term==='文化'));
assert.ok(governance.suggestions.some(item=>item.governance==='reduce_candidate'&&item.term==='舊詞'));
assert.ok(governance.suggestions.some(item=>item.governance==='reduce_candidate'&&item.term==='零命中'));
assert.ok(governance.suggestions.some(item=>item.governance==='add_candidate'&&item.term==='新候選'));
assert.ok(governance.suggestions.every(item=>!item.text.includes('${')));

const diagnostics=analyzeKeywordDiagnostics({
  totalRecords:10,
  keywords:[
    {term:'廣泛詞',item_count:7,coverage:0.7,top_source:'A',top_source_share:0.5},
    {term:'集中詞',item_count:4,coverage:0.4,top_source:'B',top_source_share:0.8},
    {term:'新興詞',item_count:3,coverage:0.3,top_source:'C',top_source_share:0.9}
  ],
  pairs:[
    {term_a:'集中詞',term_b:'新興詞',item_count:3,share:0.75}
  ]
},{
  changeSuggestions:[{type:'rising',term:'新興詞'}],
  minimumCount:3
});
assert.ok(diagnostics.suggestions.some(item=>item.type==='low_discrimination'&&item.term==='廣泛詞'));
assert.ok(diagnostics.suggestions.some(item=>item.type==='source_concentration'&&item.term==='集中詞'));
assert.ok(diagnostics.suggestions.some(item=>item.type==='emerging_high_discrimination'&&item.term==='新興詞'));
assert.ok(diagnostics.suggestions.some(item=>item.type==='cooccurrence'&&item.term.includes('集中詞')));

console.log('LOC automatic density, distribution, weak-signal, keyword-governance and diagnostics analysis verified.');
