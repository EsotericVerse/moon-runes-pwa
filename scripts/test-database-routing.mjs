import assert from 'node:assert/strict';
import {selectedDatabaseRouting,invalidateDatabaseRouting} from '../app/loc/providers/routing-state.mjs';
let requests=0;
const primary={activeTarget:async()=>{
  requests++;
  return {data:{provider:'supabase',primary_id:'supabase-current',backup_id:'neon-current',
    backup_provider:'neon',mode:'single',primary_control:true}};
}};
const first=await selectedDatabaseRouting(primary);
assert.equal(first.primaryId,'supabase-current');
assert.equal(first.backupId,'neon-current');
assert.equal(first.mode,'single');
assert.deepEqual(await selectedDatabaseRouting(primary),first);
assert.equal(requests,1,'Normal repeated reads must never poll routing status');
invalidateDatabaseRouting();
const switched=await selectedDatabaseRouting({
  activeTarget:async()=>({data:{provider:'custom',primary_id:'target_azure',
    backup_id:'supabase-current',backup_provider:'supabase',mode:'db-managed',primary_control:false}})
});
assert.equal(switched.primaryControl,false);
assert.equal(switched.backupId,'supabase-current');
assert.equal(switched.mode,'db-managed');
assert.equal(requests,1);
const edge=await import('../app/loc/providers/kysely-edge.mjs');
const calls=[];
const client=edge.createKyselyEdgeClient({url:'https://example.test',publishableKey:'sb_publishable_test',
  role:'anon',target:'backup',fetch:async(_url,options)=>{
    const req=JSON.parse(options.body);
    calls.push(req);
    if(req.operation==='insert')return new Response(JSON.stringify({error:{message:'Backup is read-only'}}),{status:403});
    return new Response(JSON.stringify({data:[]}),{status:200});
  }});
await client.schema('silver').from('runes').select('rune_id');
assert.equal(calls[0].target,'backup');
await assert.rejects(async()=>client.schema('silver').from('runes').insert({rune_id:1}),/read-only/);
assert.equal(calls[1].target,'backup');
console.log('[database-routing] independent main/backup, explicit mode, no polling and fail-closed backup transport');
