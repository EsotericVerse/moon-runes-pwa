import test from 'node:test';
import assert from 'node:assert/strict';
import {spatialReferenceCandidates,spatialReferenceLikePattern} from '../app/modular/features/trace/trace-spatial-references.mjs';
import {facebookBackupPlace} from '../app/loc/facebook-backup-place.mjs';

test('scope identity is not a shared UID',()=>{
  const base={uid:'TEST0001',scope_id:'loc',title:'某車站',longitude:121.5,latitude:25};
  const results=spatialReferenceCandidates([[base,{...base,scope_id:'lrunes'}],[base]]);
  assert.equal(results.length,2);
  assert.deepEqual(results.map(row=>row.source_scope),['loc','lrunes']);
});
test('no empty locations or unbounded result sets',()=>{
  const base={scope_id:'loc',title:'商店',longitude:121.5,latitude:25};
  const rows=Array.from({length:12},(_,i)=>({...base,uid:'A'+String(i).padStart(7,'0')}));
  assert.equal(spatialReferenceCandidates([rows]).length,8);
  assert.equal(spatialReferenceCandidates([[{...base,uid:'BLANK001',latitude:''}]]).length,0);
});
test('literal wildcards are not treated as patterns',()=>{
  assert.equal(spatialReferenceLikePattern('台'),'');
  assert.equal(spatialReferenceLikePattern('路%_'),'%路\\%\\_%');
});
test('facebook data-array place is retained while text alone is not guessed',()=>{
  assert.equal(facebookBackupPlace({data:[{place:{name:'某車站'}}]}),'某車站');
  assert.equal(facebookBackupPlace({data:[{post:'某車站'}]}),'');
  assert.equal(facebookBackupPlace({data:[{place:{name:'A'}},{place:{name:'B'}}]}),'');
});
