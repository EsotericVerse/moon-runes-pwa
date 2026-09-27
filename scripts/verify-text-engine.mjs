import assert from 'node:assert/strict';
import {createTextIndex,searchTextIndex} from '../app/loc/text-engine.mjs';

const engine=createTextIndex();
engine.add('a','光 日 晨',{id:'a'});
engine.add('b','月光 光 日',{id:'b'});
engine.add('c','月光 光 日 晨 月',{id:'c'});
engine.add('d','海 潮',{id:'d'});
engine.add('e','微月光',{id:'e'});

assert.deepEqual(new Set(searchTextIndex(engine,'月光',{limit:10}).ids),new Set(['b','c','e']));
assert.deepEqual(searchTextIndex(engine,'光',{and:['日','晨'],nor:['月'],limit:10}).ids,['a']);
assert.deepEqual(searchTextIndex(engine,'海',{and:['潮'],limit:10}).ids,['d']);

const page1=searchTextIndex(engine,'月光',{limit:1,offset:0});
const page2=searchTextIndex(engine,'月光',{limit:1,offset:1});
assert.equal(page1.totalCount,3);
assert.equal(page1.ids.length,1);
assert.equal(page2.ids.length,1);
assert.notEqual(page1.ids[0],page2.ids[0]);

console.log('FlexSearch shared text engine CJK / AND / NOR / offset verified.');
