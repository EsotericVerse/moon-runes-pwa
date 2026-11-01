import test from 'node:test';
import assert from 'node:assert/strict';
import {coalescePendingPublicRead} from '../app/loc/inflight-public-read.mjs';

test('100 identical concurrent public reads issue one request',async()=>{
 let calls=0;
 const query=()=>coalescePendingPublicRead('silver.lo3rwang_galaxy:uid=demo',async()=>{
   calls++;await new Promise(resolve=>setImmediate(resolve));return {rows:[{uid:'ABcd1234'}]};
 });
 const results=await Promise.all(Array.from({length:100},query));
 assert.equal(calls,1);
 assert.equal(results.length,100);
 assert.equal(results[0].rows[0].uid,'ABcd1234');
});
test('different queries do not share results',async()=>{
 let calls=0;
 const a=coalescePendingPublicRead('scope=A',()=>{calls++;return Promise.resolve('A')});
 const b=coalescePendingPublicRead('scope=B',()=>{calls++;return Promise.resolve('B')});
 assert.deepEqual(await Promise.all([a,b]),['A','B']);
 assert.equal(calls,2);
});
test('failed request is released and retry works',async()=>{
 let calls=0;
 await assert.rejects(coalescePendingPublicRead('fail',()=>{calls++;throw Error('temporary')}),/temporary/);
 assert.equal(await coalescePendingPublicRead('fail',()=>{calls++;return 'ok'}),'ok');
 assert.equal(calls,2);
});
test('successful request is never cached after completion',async()=>{
 let calls=0;
 await coalescePendingPublicRead('fresh',()=>++calls);
 await coalescePendingPublicRead('fresh',()=>++calls);
 assert.equal(calls,2);
});
