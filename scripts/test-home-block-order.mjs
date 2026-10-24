import assert from 'node:assert/strict';
import {test} from 'node:test';
import {HomeBlock} from '../app/loc/home-block-model.js';

const blocks=[{order:1,uid:'hero'},{order:2,uid:'second'},{order:3,uid:'third'}];
test('home Hero stays first; second cannot move over Hero',()=>{
  for(const page of ['index','hero']){
    assert.equal(HomeBlock.isPinnedHomeHero(page,blocks[0]),true);
    assert.equal(HomeBlock.canSwapHomeBlockPositions(page,blocks,0,1),false);
    assert.equal(HomeBlock.canSwapHomeBlockPositions(page,blocks,1,0),false);
    assert.equal(HomeBlock.canSwapHomeBlockPositions(page,blocks,1,2),true);
    assert.equal(HomeBlock.canSwapHomeBlockPositions(page,blocks,2,1),true);
  }
});
test('ordinary blocks may still change order',()=>{
  for(const page of ['search','governance','group_culture']){
    assert.equal(HomeBlock.isPinnedHomeHero(page,blocks[0]),false);
    assert.equal(HomeBlock.canSwapHomeBlockPositions(page,blocks,0,1),true);
    assert.equal(HomeBlock.canSwapHomeBlockPositions(page,blocks,1,0),true);
    assert.equal(HomeBlock.canSwapHomeBlockPositions(page,blocks,2,3),false);
  }
});
