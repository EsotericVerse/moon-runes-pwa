import test from 'node:test';
import assert from 'node:assert/strict';
import {spatialReferenceCandidates,spatialReferenceLikePattern} from '../app/modular/features/trace/trace-spatial-references.mjs';
import {facebookBackupPlace} from '../app/loc/facebook-backup-place.mjs';
import {mappedImportValue,parseImportCreatedTime} from '../app/loc/import-batch.mjs';
import {postalAddressFromNominatim} from '../app/modular/features/trace/trace-postal-evidence.mjs';

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

test('plain Facebook source timestamps are Unix seconds, not 1970 milliseconds',()=>{
  const sample={timestamp:1720000000,place:{name:'某車站'}};
  assert.equal(typeof mappedImportValue(sample,'source_place'),'object');
  assert.equal(facebookBackupPlace(sample),'某車站');
  assert.equal(parseImportCreatedTime(mappedImportValue(sample,'createtime')),
    '2024-07-03T09:46:40.000Z');
});

test('geocoder does not invent a street number or floor from a place label',()=>{
  assert.equal(postalAddressFromNominatim({
    display_name:'某咖啡廳',
    address:{state:'新北市',suburb:'板橋區',road:'文化路一段'}
  }),'');
  assert.equal(postalAddressFromNominatim({
    address:{state:'新北市',suburb:'板橋區',road:'文化路一段',house_number:'100號'}
  }),'新北市板橋區文化路一段100號');
  assert.equal(postalAddressFromNominatim({address:{road:'文化路一段',house_number:'100號'}}),'');
});
