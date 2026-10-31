import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {isAvailabilityFailure,tryPublicSources,readIsrSummary} from '../app/api/loc/_numeric-failover.mjs';

test('ISR goes to independent Neon after a Supabase 503 (settings or RPC)',async()=>{
  const used=[];
  const sources=['supabase','neon'].map(id=>({id,schema:()=>({id})}));
  const outcome=await tryPublicSources(sources,async db=>{
    used.push(db.id);
    return db.id==='supabase'?{retryable:true,error:'Public ISR settings unavailable'}:{data:[{uid:'aB12cD34'}]};
  });
  assert.deepEqual(used,['supabase','neon']);
  assert.equal(outcome.source,'neon');
  assert.equal(outcome.data[0].uid,'aB12cD34');
});
test('ISR does not fail over when disabled, unauthorized or invalid',async()=>{
  const sources=['supabase','neon'].map(id=>({id,schema:()=>({id})}));
  for(const outcome of [{disabled:true,error:'ISR disabled'},{retryable:false,error:'invalid parameters'}]){
    const seen=[];
    const result=await tryPublicSources(sources,async db=>{seen.push(db.id);return outcome});
    assert.deepEqual(seen,['supabase']);
    assert.equal(result.source,'supabase');
  }
  assert.equal(isAvailabilityFailure({status:401,error:{message:'Unauthorized'}}),false);
  assert.equal(isAvailabilityFailure({status:403,error:{message:'Forbidden'}}),false);
  assert.equal(isAvailabilityFailure({status:503,error:{message:'Database down'}}),true);
  assert.equal(isAvailabilityFailure({status:0,error:{message:'fetch failed'}}),true);
});
test('Public ISR route has independent PostgREST path and bounded primary wait',()=>{
  const route=readFileSync(new URL('../app/api/loc/scopes/[scopeId]/numeric/[kind]/route.js',import.meta.url),'utf8');
  const server=readFileSync(new URL('../app/api/loc/_server.js',import.meta.url),'utf8');
  assert.match(route,/tryPublicSources\(publicNumericSources\(\)/);
  assert.match(server,/createBackupPublicAdapter/);
  assert.match(server,/AbortSignal\.timeout\(6500\)/);
  assert.doesNotMatch(server,/loc-kysely/);
});

test('real ISR summary pipeline uses mirrored config and RPC without Supabase',async()=>{
  const called=[],origin='https://loc-isr.example';
  const sources=['supabase','neon'].map(id=>({id,schema:()=>({
    from(table){
      assert.equal(table,'loc');
      return {select:()=>({eq:()=>({single:async()=>{
        called.push(id+':config');
        if(id==='supabase')return {error:{message:'fetch failed'},status:0};
        return {data:{cache:['isr',origin,JSON.stringify([{origin}]),'{}']}};
      }})})};
    },
    rpc:async(name,args)=>{
      called.push(id+':rpc');
      assert.equal(name,'read_scope_statistics');
      assert.equal(args.p_scope_id,'lo3rwang');
      return {data:[{date:'2026-10-29',total:12}],error:null};
    }
  })}));
  const result=await tryPublicSources(sources,db=>readIsrSummary(db,{
    origin,name:'read_scope_statistics',args:{p_scope_id:'lo3rwang'}
  }));
  assert.equal(result.source,'neon');
  assert.deepEqual(called,['supabase:config','neon:config','neon:rpc']);
  assert.equal(result.data[0].total,12);
});
test('healthy primary with ISR disabled cannot be bypassed through Neon',async()=>{
  const called=[];
  const source={id:'supabase',schema:()=>({from:()=>({select:()=>({eq:()=>({single:async()=>({
    data:{cache:['off','','[]','{}']}
  })})})})})};
  const backup={id:'neon',schema:()=>{called.push('neon');throw Error('Must not use backup')}};
  const result=await tryPublicSources([source,backup],db=>readIsrSummary(db,{
    origin:'https://loc-isr.example',name:'read_scope_statistics',args:{}
  }));
  assert.equal(result.disabled,true);
  assert.deepEqual(called,[]);
});
