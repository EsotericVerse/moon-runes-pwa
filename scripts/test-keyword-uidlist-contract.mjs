import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createDatabaseClient} from '../app/loc/db-contract.mjs';

const makeClient=rpc=>{
  const endpoint={schema:()=>({rpc})};
  return createDatabaseClient({
    publicClient:endpoint,authClient:endpoint,
    auth:{getSession:async()=>({}),getUser:async()=>({}),signInWithOAuth:async()=>({}),signOut:async()=>({})}
  });
};
test('Keywords uidlist summary reads canonical PostgreSQL RPC and preserves source case',async()=>{
  let last;
  const client=makeClient(async(name,args)=>{
    last={name,args};
    return {data:[{kind:'eligible',hit_count:7,document_count:5}],error:null};
  });
  const data=await client.readKeywordUidlistSummary('Lo3Rwang',{
    startDate:'2026-10-01',endDate:'2026-10-29',source:'Threads'
  });
  assert.deepEqual(last,{name:'read_keyword_uidlist_summary',args:{
    p_scope_id:'lo3rwang',p_start:'2026-10-01',p_end:'2026-10-29',p_source:'Threads'
  }});
  assert.equal(data[0].document_count,5);
});
test('Keywords uidlist reader rejects missing RPC and normalizes empty response',async()=>{
  const bad=makeClient(async()=>({error:{code:'42883',message:'Function absent'}}));
  await assert.rejects(bad.readKeywordUidlistSummary('lo3rwang'),e=>e.code==='42883');
  const empty=makeClient(async()=>({data:null,error:null}));
  assert.deepEqual(await empty.readKeywordUidlistSummary('lo3rwang'),[]);
});
