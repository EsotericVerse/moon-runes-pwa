import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {STATIC_CACHE_POLICY} from '../app/loc/cache-mode-static.mjs';
import {currentCachePolicy,loadCachePolicy,normalizeCachePolicy} from '../app/loc/cache-mode-client.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('static JS policy never depends on database',async()=>{
  assert.deepEqual(STATIC_CACHE_POLICY,{mode:'cache',origin:''});
  assert.equal(currentCachePolicy(),STATIC_CACHE_POLICY);
  assert.equal(await loadCachePolicy(),STATIC_CACHE_POLICY);
  assert.doesNotMatch(read('app/loc/cache-mode-client.mjs'),/dbPublicClient|dbAuthRelation|\.select\(/);
  assert.doesNotMatch(read('app/api/loc/scopes/[scopeId]/numeric/[kind]/route.js'),/loc_cache_runtime/);
  assert.doesNotMatch(read('app/loc/views/admin-panels/IsrDomainTarget.jsx'),/loc_cache_runtime/);
});
test('invalid remote origins are never adopted',()=>{
  assert.equal(normalizeCachePolicy({mode:'isr',origin:'http://bad.test'}).mode,'cache');
  assert.equal(normalizeCachePolicy({mode:'invalid',origin:''}).mode,'off');
});
