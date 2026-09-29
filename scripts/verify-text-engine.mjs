import assert from 'node:assert/strict';
import {createTextIndex,literalTextMatches,searchTextIndex} from '../app/loc/text-engine.mjs';

const engine=createTextIndex();
engine.add('a','光 日 晨',{id:'a'});
engine.add('b','月光 光 日',{id:'b'});
engine.add('c','月光 光 日 晨 月',{id:'c'});
engine.add('d','海 潮',{id:'d'});
engine.add('e','微月光',{id:'e'});

assert.deepEqual(new Set(searchTextIndex(engine,'月光',{limit:10}).ids),new Set(['b','c','e']));
assert.deepEqual(searchTextIndex(engine,'光',{and:['日','晨'],nor:['月'],limit:10}).ids,['a']);
assert.deepEqual(searchTextIndex(engine,'海',{and:['潮'],limit:10}).ids,['d']);
assert.equal(literalTextMatches('微月光','月光'),true);
assert.equal(literalTextMatches('月亮 夜色 星光','月光'),false);
assert.equal(literalTextMatches('光 日 晨','光',{and:['日','晨'],nor:['月']}),true);
assert.equal(literalTextMatches('月光 光 日 晨 月','光',{and:['日','晨'],nor:['月']}),false);

const page1=searchTextIndex(engine,'月光',{limit:1,offset:0});
const page2=searchTextIndex(engine,'月光',{limit:1,offset:1});
const page3=searchTextIndex(engine,'月光',{limit:1,offset:2});

assert.equal(page1.totalCount,null);
assert.equal(page1.ids.length,1);
assert.equal(page1.hasMore,true);
assert.equal(page1.nextOffset,1);

assert.equal(page2.totalCount,null);
assert.equal(page2.ids.length,1);
assert.equal(page2.hasMore,true);
assert.equal(page2.nextOffset,2);
assert.notEqual(page1.ids[0],page2.ids[0]);

assert.equal(page3.totalCount,null);
assert.equal(page3.ids.length,1);
assert.equal(page3.hasMore,false);
assert.equal(page3.nextOffset,null);
assert.equal(new Set([...page1.ids,...page2.ids,...page3.ids]).size,3);

console.log('FlexSearch candidate index + literal lexical verification / AND / NOR / native offset verified.');
