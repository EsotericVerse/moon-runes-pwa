import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const source=readFileSync(new URL('../app/loc/keyword-analysis.js',import.meta.url),'utf8');
const extract=(start,end,name,deps)=>{
  const from=source.indexOf(start),to=source.indexOf(end,from);
  assert.ok(from>=0&&to>from,'Current Keywords analysis function must exist');
  return new Function(...Object.keys(deps),
    source.slice(from,to).replace(/^export /,'')+'\nreturn '+name+';')(...Object.values(deps));
};
test('full reanalysis uses current Class uidlist and never writes Galaxy',async()=>{
  const writes=[],progress=[];
  let finalized=null;
  const items=[{keyword_id:1,class_uid:'aB3d',class_name:'符文66',
    class_group:'靈魂',item_name:'靈',order_no:1}];
  function relation(name){
    const state={filters:[],operation:null,values:null};
    return {
      update(values){state.operation='update';state.values=values;return this;},
      select(columns){
        if(!state.operation){
          state.operation='read';state.columns=columns;
        }else state.columns=columns;
        return this;
      },
      eq(col,value){state.filters.push([col,value]);return this;},
      async limit(){return {data:[{staticstime:'2026-10-29T00:00:00Z',
        keyword_meta:{class_uid:'aB3d',matchedDocuments:1}}],error:null};},
      then(resolve,reject){
        const response=state.operation==='update'
          ?{data:name==='config'?[{id:'scope',staticstime:'2026-10-29T00:00:00Z'}]:[{keyword_id:1}],error:null}
          :{data:[],error:null};
        writes.push({name,...state});
        return Promise.resolve(response).then(resolve,reject);
      }
    };
  }
  const runner=extract('export async function runKeywordAnalysisBatch(','\nfunction emptyStored(',
    'runKeywordAnalysisBatch',{
      normalizeScopeId:id=>id,
      reportBatchProgress:(cb,phase,completed,total,percent,label)=>cb?.({phase,completed,total,percent,label}),
      scopeAndConfig:async()=>({scope:{config:'config',keywords:'keywords',galaxy:'galaxy'},
        config:{current_keyword_class_uid:'aB3d',keyword_min_chars:0,
          keyword_min_documents:0}}),
      selectAllRows:async()=>({rows:items}),
      selectRows:async()=>({rows:[{default_keyword_id:1}]}),
      buildClassMap:()=>({ordered:[{class_id:1,group:'靈魂'}]}),
      keywordFingerprint:async()=>({count:1}),
      dbAuthRelation:relation,
      clearKeywordAnalysisCache:()=>{},
      normalizeKeywordMinChars:Number,normalizeKeywordMinDocuments:Number,
      KEYWORD_CLASSIFICATION_BATCH_SIZE:1000,
      reanalyzeKeywordClass:async opts=>{
        assert.equal(opts.classUid,'aB3d');
        const articles=await opts.readPage({offset:0,limit:1000});
        assert.ok(Array.isArray(articles));
        await opts.writeItem({keywordId:'1',uidlist:[{uid:'Ab12Cd34',times:2}]});
        finalized={classUid:'aB3d',analyzedDocuments:1,matchedDocuments:1,itemMatches:1,occurrences:2};
        await opts.finalize(finalized);
        opts.onProgress({phase:'completed',completed:1,total:1});
        return finalized;
      },
    });
  const result=await runner('scope',{onProgress:event=>progress.push(event)});
  assert.equal(result.documentCount,1);
  assert.equal(result.keywordDocumentCount,1);
  assert.ok(writes.some(w=>w.name==='keywords'&&w.values?.uidlist?.length===1));
  assert.ok(writes.every(w=>w.name!=='galaxy'));
  assert.ok(progress.some(item=>item.phase==='completed'&&item.percent===100));
});
test('summary reads aggregate uidlist API and not Galaxy-derived columns',async()=>{
  const code=source.slice(source.indexOf('export async function selectKeywordAnalysisSummary('),
    source.indexOf('\nexport function clearKeywordAnalysisCache('));
  assert.ok(!code.includes('group_lists'));
  assert.ok(code.includes('readKeywordUidlistSummary'));
  const runner=source.slice(source.indexOf('export async function runKeywordAnalysisBatch('),
    source.indexOf('\nfunction emptyStored('));
  assert.ok(!runner.includes('applyKeywordClassification('));
  assert.ok(!runner.includes('.update({class_id'));
  assert.ok(!runner.includes('group_lists'));
});
