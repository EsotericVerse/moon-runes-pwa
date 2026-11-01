import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapBounded} from '../app/loc/bounded-parallel.mjs';

test('100 independent reads run with at most three active database lanes and preserve order',async()=>{
  const items=Array.from({length:100},(_,i)=>i);
  let active=0,peak=0;
  const results=await mapBounded(items,3,async item=>{
    active++;peak=Math.max(active,peak);
    await new Promise(resolve=>setImmediate(resolve));
    active--;
    return item*2;
  });
  assert.equal(peak,3);
  assert.deepEqual(results,items.map(item=>item*2));
});

test('a failing batch prevents new requests but waits for started lanes',async()=>{
  const invoked=[],settled=[];
  let finishSlow;
  const slow=new Promise(resolve=>{finishSlow=resolve;});
  const pending=mapBounded([0,1,2,3],2,async item=>{
    invoked.push(item);
    if(item===0)throw Error('database read failed');
    await slow;
    settled.push(item);
    return item;
  });
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(invoked,[0,1]);
  finishSlow();
  await assert.rejects(pending,/database read failed/);
  assert.deepEqual(settled,[1]);
});

test('empty and bounded inputs do not spin up excess lanes',async()=>{
  let calls=0;
  assert.deepEqual(await mapBounded([],3,async()=>{calls++;}),[]);
  assert.deepEqual(await mapBounded([1,2],3,async value=>{calls++;return value;}),[1,2]);
  assert.equal(calls,2);
});
