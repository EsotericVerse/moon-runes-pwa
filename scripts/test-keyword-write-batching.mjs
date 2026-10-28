import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {MAX_ROWS} from '../app/loc/query-batch-size.mjs';

const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function extractBatchMethod(stubs){
  const contract=source('app/loc/db-contract.mjs');
  const start=contract.indexOf('  async function applyKeywordClassification(');
  const end=contract.indexOf('\n  // Manually-triggered full wipe',start);
  assert.ok(start>=0&&end>start,'Keyword classification method must exist');
  const deps={KEYWORD_CLASSIFICATION_WRITE_PAUSE_INTERVAL:MAX_ROWS,...stubs,keywordClassificationWrite:stubs.keywordClassificationWriteUnchecked};
  return new Function(...Object.keys(deps),
    contract.slice(start,end)+'\nreturn applyKeywordClassification;')(...Object.values(deps));
}

test('SQL timeout retries a smaller batch after exactly one second without duplicating rows',async()=>{
  const rows=Array.from({length:9000},(_,i)=>({uid:'ID'+i,class_id:1,group_lists:'1:1'}));
  const successes=[],attempts=[],events=[],delays=[];
  const run=extractBatchMethod({
    normalizeScopeId:scope=>scope,
    flashMessage:()=>{},
    WRITE_FAILED_NOTICE:'儲存失敗',
    KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE:MAX_ROWS,
    KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS:1000,
    setTimeout:(resolve,ms)=>{delays.push(ms);resolve();},
    keywordClassificationWriteUnchecked:async(_scope,arg)=>{
      attempts.push({mode:arg.mode,rows:arg.rows?.length});
      if(arg.mode==='chunk'){
        if(arg.rows.length>4500)throw Error('canceling statement due to statement timeout');
        successes.push(...arg.rows.map(row=>row.uid));
        return arg.rows.length;
      }
      if(arg.mode==='finalize')return 9000;
      return 0;
    }
  });
  const result=await run('lo3rwang',{rows,meta:{class_id:'class'},eligibleDocumentCount:9000},{
    onProgress:event=>events.push(event)
  });
  assert.equal(result.count,9000);
  assert.equal(result.changedCount,9000);
  assert.deepEqual(successes,rows.map(row=>row.uid));
  assert.deepEqual(attempts.filter(row=>row.mode==='chunk').map(x=>x.rows),[9000,5000,2500,2500,2500,1500]);
  assert.deepEqual(delays,[1000,1000]);
  assert.deepEqual(events.filter(x=>x.phase==='cooldown').map(x=>[x.retrying,x.seconds]),[[true,1],[true,1]]);
});
test('one second of rest only after each full MaxRows of successful work',async()=>{
  const rows=Array.from({length:MAX_ROWS*2+1},(_,i)=>({uid:'R'+i,class_id:2,group_lists:'2:1'}));
  const chunks=[],timers=[],events=[];
  let active=0,maxActive=0;
  const run=extractBatchMethod({
    normalizeScopeId:scope=>scope,
    flashMessage:()=>{},WRITE_FAILED_NOTICE:'儲存失敗',
    KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE:MAX_ROWS,
    KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS:1000,
    setTimeout:(resolve,ms)=>{timers.push(ms);resolve();},
    keywordClassificationWriteUnchecked:async(_scope,arg)=>{
      if(arg.mode==='chunk'){
        active++;maxActive=Math.max(maxActive,active);
        chunks.push(arg.rows.length);
        await Promise.resolve();active--;
        return arg.rows.length;
      }
      return arg.mode==='finalize'?rows.length:0;
    }
  });
  const result=await run('lo3rwang',{rows,eligibleDocumentCount:rows.length,meta:{class_id:'r'}},{
    onProgress:event=>events.push(event)
  });
  assert.equal(result.count,rows.length);
  assert.deepEqual(chunks,[MAX_ROWS,MAX_ROWS,1]);
  assert.equal(maxActive,1);
  assert.deepEqual(timers,[1000,1000]);
  assert.deepEqual(events.filter(x=>x.phase==='cooldown').map(x=>[x.completed,x.retrying]),[[MAX_ROWS,false],[MAX_ROWS*2,false]]);
});
test('under MaxRows finishes without a single idle delay',async()=>{
  const rows=Array.from({length:1200},(_,i)=>({uid:'X'+i,class_id:2,group_lists:'2:1'}));
  const timers=[];
  const run=extractBatchMethod({
    normalizeScopeId:scope=>scope,
    flashMessage:()=>{},WRITE_FAILED_NOTICE:'儲存失敗',
    KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE:MAX_ROWS,
    KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS:1000,
    setTimeout:(resolve,ms)=>{timers.push(ms);resolve();},
    keywordClassificationWriteUnchecked:async(_scope,arg)=>arg.mode==='finalize'?rows.length:arg.rows?.length||0
  });
  const result=await run('lo3rwang',{rows,eligibleDocumentCount:rows.length,meta:{class_id:'r'}});
  assert.equal(result.count,1200);
  assert.deepEqual(timers,[]);
});

test('UI at 10,000 of 29,818 reflects 71 percent and revised batch estimates',()=>{
  const analysis=source('app/loc/keyword-analysis.js');
  const start=analysis.indexOf('    onProgress:({phase,completed,total,seconds=1');
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
  onProgress({phase:'write',completed:10000,total:29818,batchSize:MAX_ROWS,
    completedBatches:1,estimatedBatches:3,lastBatchSize:MAX_ROWS});
  onProgress({phase:'cooldown',completed:10000,total:29818,batchSize:MAX_ROWS/2,
    completedBatches:1,estimatedBatches:5,seconds:1,retrying:true});
  assert.equal(events[0].percent,71);
  assert.equal(events[1].percent,71);
  assert.ok(events[0].label.includes('已完成 1 / 3 批'));
  assert.ok(events[1].label.includes('已完成 1 / 5 批'));
  assert.match(events[1].label,/縮批至 5000 篇/);
  assert.match(events[1].label,/等待 1 秒/);
  assert.equal(events[1].completed,10000);
});

test('sync does not accidentally clear unmodified rows from narrowed reanalysis',async()=>{
  const writes=[];
  const run=extractBatchMethod({
    normalizeScopeId:scope=>scope,
    flashMessage:()=>{},
    WRITE_FAILED_NOTICE:'儲存失敗',
    KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE:MAX_ROWS,
    KEYWORD_CLASSIFICATION_MIN_WRITE_BATCH_SIZE:25,
    KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS:1000,
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
    WRITE_FAILED_NOTICE:'儲存失敗',KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE:MAX_ROWS,
    KEYWORD_CLASSIFICATION_MIN_WRITE_BATCH_SIZE:25,
    KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS:1000,
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
  assert.match(contract,/KEYWORD_CLASSIFICATION_BATCH_SIZE=MAX_ROWS/);
  assert.match(contract,/KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE=MAX_ROWS/);
  assert.match(contract,/KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS=1000/);
  assert.match(local,/p_rows\?\.scopeBased===true/);
  assert.match(migration,/g\.statistics_able is distinct from true/);
  assert.match(migration,/if not silver\.can_manage_scope\(v_scope\)/);
  assert.match(migration,/if v_mode='finalize' then/);
});
