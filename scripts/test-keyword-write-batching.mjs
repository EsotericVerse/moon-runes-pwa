import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function extractBatchMethod(stubs){
  const contract=source('app/loc/db-contract.mjs');
  const start=contract.indexOf('  async function applyKeywordClassification(');
  const end=contract.indexOf('\n  // Manually-triggered full wipe',start);
  assert.ok(start>=0&&end>start,'Keyword classification method must exist');
  return new Function(...Object.keys(stubs),
    contract.slice(start,end)+'\nreturn applyKeywordClassification;')(...Object.values(stubs));
}
test('failed 500-row write rolls back and retries 250-row chunks without skipping entries',async()=>{
  const rows=Array.from({length:1200},(_,i)=>({uid:'ID'+i,class_id:1,group_lists:'1:1'}));
  const successes=[],attempts=[],events=[];
  const run=extractBatchMethod({
    normalizeScopeId:scope=>scope,
    KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE:500,
    keywordClassificationWrite:async(_scope,arg)=>{
      attempts.push({mode:arg.mode,rows:arg.rows?.length,scopeBased:arg.scopeBased,uids:arg.uids});
      if(arg.mode==='chunk'){
        if(arg.rows.length>250)throw Error('canceling statement due to statement timeout');
        successes.push(...arg.rows.map(row=>row.uid));
        return arg.rows.length;
      }
      if(arg.mode==='sync')return 0;
      if(arg.mode==='finalize')return 500;
      return 0;
    }
  });
  const result=await run('lo3rwang',{rows,meta:{class_id:'class'},eligibleDocumentCount:1400},{
    onProgress:event=>events.push(event)
  });
  assert.equal(result.count,1200);
  assert.equal(result.changedCount,1200);
  assert.equal(result.documentCount,500);
  assert.deepEqual(successes,rows.map(row=>row.uid));
  assert.equal(attempts.find(row=>row.mode==='chunk').rows,500);
  assert.equal(attempts.filter(row=>row.mode==='chunk'&&row.rows===500).length,1);
  assert.ok(attempts.some(row=>row.mode==='chunk'&&row.rows===250));
  assert.deepEqual(attempts.filter(row=>row.mode==='sync'),[{
    mode:'sync',rows:undefined,scopeBased:true,uids:undefined
  }]);
  assert.equal(events.filter(row=>row.phase==='write').at(-1).completed,1200);
});
test('sync does not accidentally clear unmodified rows from narrowed reanalysis',async()=>{
  const writes=[];
  const run=extractBatchMethod({
    normalizeScopeId:scope=>scope,
    KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE:500,
    keywordClassificationWrite:async(_scope,arg)=>{
      writes.push(arg);
      return arg.mode==='finalize'?10:arg.rows?.length||0;
    }
  });
  const rows=[{uid:'changed1',class_id:1,group_lists:'1:3'}];
  const result=await run('lo3rwang',{rows,meta:{class_id:'class'},eligibleDocumentCount:99931});
  assert.equal(result.count,1);
  assert.ok(writes.some(w=>w.mode==='sync'&&w.scopeBased===true&&!('uids'in w)));
});
test('non-timeout failures fail rather than being silently retried',async()=>{
  let attempts=0;
  const run=extractBatchMethod({
    normalizeScopeId:scope=>scope,KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE:500,
    keywordClassificationWrite:async(_scope,arg)=>{
      if(arg.mode==='chunk'){attempts++;throw Error('permission denied');}
      return 0;
    }
  });
  await assert.rejects(run('lo3rwang',{rows:[{uid:'X'}],eligibleDocumentCount:1}),/permission denied/);
  assert.equal(attempts,1);
});
test('no full UID sweep or 144k-UID sync payload in cloud and local',()=>{
  const analysis=source('app/loc/keyword-analysis.js');
  const contract=source('app/loc/db-contract.mjs');
  const local=source('app/loc/providers/local-sqlite.mjs');
  const migration=source('supabase/migrations/20261027215500_keyword_scope_sync_timeout.sql');
  const start=analysis.indexOf('export async function runKeywordAnalysisBatch(');
  const end=analysis.indexOf('\nfunction emptyStored(',start);
  const runner=analysis.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.doesNotMatch(runner,/columns:'uid',\s*filters:\[\{column:'statistics_able'/);
  assert.match(runner,/eligibleDocumentCount/);
  assert.match(contract,/KEYWORD_CLASSIFICATION_BATCH_SIZE=5000/);
  assert.match(contract,/KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE=500/);
  assert.match(local,/p_rows\?\.scopeBased===true/);
  assert.match(migration,/g\.statistics_able is distinct from true/);
  assert.match(migration,/if not silver\.can_manage_scope\(v_scope\)/);
  assert.match(migration,/if v_mode='finalize' then/);
});
