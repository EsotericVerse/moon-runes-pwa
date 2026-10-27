import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function extractBatchMethod(stubs){
  const contract=source('app/loc/db-contract.mjs');
  const start=contract.indexOf('  async function applyKeywordClassification(');
  const end=contract.indexOf('\n  // Manually-triggered full wipe',start);
  assert.ok(start>=0&&end>start,'Keyword classification method must exist');
  const deps={...stubs,keywordClassificationWrite:stubs.keywordClassificationWriteUnchecked};
  return new Function(...Object.keys(deps),
    contract.slice(start,end)+'\nreturn applyKeywordClassification;')(...Object.values(deps));
}
test('failed 500-row write rolls back and retries 250-row chunks without skipping entries',async()=>{
  const rows=Array.from({length:1200},(_,i)=>({uid:'ID'+i,class_id:1,group_lists:'1:1'}));
  const successes=[],attempts=[],events=[],delays=[];
  const run=extractBatchMethod({
    normalizeScopeId:scope=>scope,
    flashMessage:()=>{},
    WRITE_FAILED_NOTICE:'儲存失敗',
    KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE:500,
    KEYWORD_CLASSIFICATION_MIN_WRITE_BATCH_SIZE:25,
    KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS:5000,
    setTimeout:(resolve,ms)=>{delays.push(ms);resolve();},
    keywordClassificationWriteUnchecked:async(_scope,arg)=>{
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
  assert.equal(events.filter(row=>row.phase==='write').at(-1).completedBatches,5);
  assert.equal(events.filter(row=>row.phase==='write').at(-1).estimatedBatches,5);
  assert.ok(events.some(row=>row.phase==='cooldown'&&row.retrying&&row.batchSize===250));
  assert.equal(delays.length,25); // 1 failed attempt + 4 gaps, each five seconds.
  assert.ok(delays.every(delay=>delay===1000));
  assert.deepEqual(events.filter(row=>row.phase==='cooldown'&&row.retrying).map(x=>x.seconds),[5,4,3,2,1]);
});
test('ordinary 500-row write waits five seconds only between committed batches',async()=>{
  const items=Array.from({length:1200},(_,i)=>({uid:'R'+i,class_id:2,group_lists:'2:1'}));
  const calls=[],timers=[],progress=[];
  let active=0,maxActive=0;
  const run=extractBatchMethod({
    normalizeScopeId:scope=>scope,
    flashMessage:()=>{},WRITE_FAILED_NOTICE:'儲存失敗',
    KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE:500,
    KEYWORD_CLASSIFICATION_MIN_WRITE_BATCH_SIZE:25,
    KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS:5000,
    setTimeout:(resolve,ms)=>{timers.push(ms);resolve();},
    keywordClassificationWriteUnchecked:async(_scope,request)=>{
      if(request.mode==='chunk'){
        active++;maxActive=Math.max(maxActive,active);
        const count=request.rows.length;
        calls.push(count);
        await Promise.resolve();active--;
        return count;
      }
      if(request.mode==='finalize')return 1200;
      return 0;
    }
  });
  const result=await run('lo3rwang',{rows:items,eligibleDocumentCount:1200,meta:{class_id:'r'}},{
    onProgress:event=>progress.push(event)
  });
  assert.equal(result.count,1200);
  assert.deepEqual(calls,[500,500,200]);
  assert.equal(maxActive,1);
  assert.equal(timers.length,10);
  assert.ok(timers.every(value=>value===1000));
  assert.equal(progress.filter(x=>x.phase==='cooldown').length,10);
  assert.deepEqual(progress.filter(x=>x.phase==='cooldown').map(x=>x.seconds),[5,4,3,2,1,5,4,3,2,1]);
  const writes=progress.filter(x=>x.phase==='write');
  assert.deepEqual(writes.map(x=>x.completedBatches),[1,2,3]);
  assert.deepEqual(writes.map(x=>x.estimatedBatches),[3,3,3]);
  assert.deepEqual(writes.map(x=>x.lastBatchSize),[500,500,200]);
});

test('UI at 10,000 of 29,818 reflects 71 percent and revised batch estimates',()=>{
  const analysis=source('app/loc/keyword-analysis.js');
  const start=analysis.indexOf('    onProgress:({phase,completed,total,seconds=5');
  const end=analysis.indexOf('\n    }\n  });',start);
  assert.ok(start>=0&&end>start,'Analysis UI callback must exist');
  const text=analysis.slice(start,end+6).trim().replace(/^onProgress:/,'');
  const events=[];
  const onProgress=new Function('reportBatchProgress','onProgress',
    'KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE','return ('+text+');')(
    (callback,phase,completed,total,percent,label,details)=>{
      callback({phase,completed,total,percent:Math.round(percent),label,...details});
    },
    event=>events.push(event),500
  );
  onProgress({phase:'write',completed:10000,total:29818,batchSize:500,
    completedBatches:20,estimatedBatches:60,lastBatchSize:500});
  onProgress({phase:'cooldown',completed:10000,total:29818,batchSize:250,
    completedBatches:20,estimatedBatches:100,seconds:5,retrying:true});
  assert.equal(events[0].percent,71);
  assert.equal(events[1].percent,71);
  assert.ok(events[0].label.includes('已完成 20 / 60 批'));
  assert.ok(events[1].label.includes('已完成 20 / 100 批'));
  assert.match(events[1].label,/縮批至 250 篇/);
  assert.match(events[1].label,/等待 5 秒/);
  assert.equal(events[1].completed,10000);
});

test('sync does not accidentally clear unmodified rows from narrowed reanalysis',async()=>{
  const writes=[];
  const run=extractBatchMethod({
    normalizeScopeId:scope=>scope,
    flashMessage:()=>{},
    WRITE_FAILED_NOTICE:'儲存失敗',
    KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE:500,
    KEYWORD_CLASSIFICATION_MIN_WRITE_BATCH_SIZE:25,
    KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS:5000,
    setTimeout:resolve=>resolve(),
    keywordClassificationWriteUnchecked:async(_scope,arg)=>{
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
    normalizeScopeId:scope=>scope,
    flashMessage:()=>{},
    WRITE_FAILED_NOTICE:'儲存失敗',KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE:500,
    KEYWORD_CLASSIFICATION_MIN_WRITE_BATCH_SIZE:25,
    KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS:5000,
    setTimeout:resolve=>resolve(),
    keywordClassificationWriteUnchecked:async(_scope,arg)=>{
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
  assert.match(contract,/KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS=5000/);
  assert.match(local,/p_rows\?\.scopeBased===true/);
  assert.match(migration,/g\.statistics_able is distinct from true/);
  assert.match(migration,/if not silver\.can_manage_scope\(v_scope\)/);
  assert.match(migration,/if v_mode='finalize' then/);
});
