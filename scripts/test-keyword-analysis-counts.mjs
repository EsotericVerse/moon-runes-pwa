import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const source=readFileSync(new URL('../app/loc/keyword-analysis.js',import.meta.url),'utf8');
const extract=(start,end,name,deps)=>{
  const from=source.indexOf(start),to=source.indexOf(end,from);
  assert.ok(from>=0&&to>from,'Function source markers must exist');
  return new Function(...Object.keys(deps),
    source.slice(from,to).replace(/^export /,'')+'\nreturn '+name+';')(...Object.values(deps));
};
test('incremental classification counts zero, one and multiple batches',async()=>{
  const classify=extract('async function classifyDocumentsIncrementally(',
    '// Canonical, eternal class_group order','classifyDocumentsIncrementally',{
      classifyRune66Documents:docs=>({classifications:docs.map(row=>({uid:row.uid})),
        classifiedCount:docs.length,unclassifiedCount:0,tieCount:0,
        runeTotals:[],groupTotals:[],unsupportedRules:[]}),
      reportBatchProgress:()=>{},setTimeout
    });
  for(const count of [0,1,121]){
    const docs=Array.from({length:count},(_,i)=>({uid:'D'+i,content:'article'}));
    const result=await classify(docs,[],()=>{});
    assert.equal(result.documentCount,count);
    assert.equal(result.classifications.length,count);
  }
});
test('full analysis reports processed eligible documents after completion',async()=>{
  const rows=[{uid:'A',content:'eligible'},{uid:'B',content:''},{uid:'C',content:'also eligible'}];
  const progress=[];
  const run=extract('export async function runKeywordAnalysisBatch(','\nfunction emptyStored(',
    'runKeywordAnalysisBatch',{
      normalizeScopeId:value=>value,
      reportBatchProgress:(_callback,phase,completed,total,percent)=>progress.push({phase,percent}),
      scopeAndConfig:async()=>({scope:{galaxy:'galaxy',config:'config'},
        config:{current_keyword_class_id:'test',keyword_min_chars:0,keyword_min_documents:0,keyword_meta:{}}}),
      normalizeKeywordMinChars:value=>value,normalizeKeywordMinDocuments:value=>value,
      loadCurrentCatalog:async()=>[{class_group:'靈魂',item_no:1}],
      keywordFingerprint:async()=>({count:3}),checkSkippable:()=>false,
      changedItemNosOf:()=>null,candidateOrFilter:()=>'',selectAllRows:async()=>({rows:rows.map(({uid})=>({uid}))}),
      selectRows:async()=>({rows}),KEYWORD_CLASSIFICATION_BATCH_SIZE:5,
      createDynamicResolver:()=>({classMap:{ordered:[]},
        resolvePage:async docs=>docs.map(({uid})=>({uid,class_id:1,group_lists:'1:1'}))}),
      isEligibleRow:row=>Boolean(row.content),documentOf:row=>({uid:row.uid,content:row.content}),
      metaOf:()=>({}),applyKeywordClassification:async(_scope,{rows:payload})=>({
        count:payload.length,documentCount:payload.length}),
      clearKeywordAnalysisCache:()=>{},
      dbAuthRelation:()=>({select:()=>({eq:()=>({limit:async()=>({
        data:[{staticstime:'2026-10-27T00:00:00Z'}],error:null})})})}),
      selectCount:async()=>2
    });
  const result=await run('lo3rwang',{});
  assert.equal(result.documentCount,2);
  assert.equal(result.keywordDocumentCount,2);
  assert.equal(result.skipped,false);
  assert.ok(progress.some(item=>item.phase==='completed'&&item.percent===100));
});
