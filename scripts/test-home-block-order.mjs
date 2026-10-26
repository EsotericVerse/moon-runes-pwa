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
  for(const page of ['search','trace','group_culture']){
    assert.equal(HomeBlock.isPinnedHomeHero(page,blocks[0]),false);
    assert.equal(HomeBlock.canSwapHomeBlockPositions(page,blocks,0,1),true);
    assert.equal(HomeBlock.canSwapHomeBlockPositions(page,blocks,1,0),true);
    assert.equal(HomeBlock.canSwapHomeBlockPositions(page,blocks,2,3),false);
  }
});

test('management Hero keeps four Scope and five LOC independent title slots',()=>{
  assert.equal(HomeBlock.MANAGEMENT_HERO_SLOTS.length,9);
  assert.deepEqual(HomeBlock.MANAGEMENT_HERO_SLOTS.filter(x=>x.audience==='scope').map(x=>x.label),
    ['時間定錨','關鍵詞','空間定錨','進階搜尋']);
  assert.deepEqual(HomeBlock.MANAGEMENT_HERO_SLOTS.filter(x=>x.audience==='loc').map(x=>x.label),
    ['系統管理','人員作品管理','關鍵詞','痕跡圖管理','文章管理']);
  for(const feature of ['admin','manage','setting'])
    assert.equal(HomeBlock.shouldUseSingleFeatureHeroImage(feature),true);
  assert.equal(HomeBlock.managementHeroSlot('/lo3rwang/manage/search','lo3rwang')?.key,'advanced');
  assert.equal(HomeBlock.managementHeroSlot('/lo3rwang/manage','lo3rwang')?.key,'spatial');
  assert.equal(HomeBlock.managementHeroSlot('/admin','loc')?.key,'system');
  assert.equal(HomeBlock.managementHeroSlot('/admin/search','loc')?.key,'articles');
  const slot=HomeBlock.MANAGEMENT_HERO_SLOTS[0];
  assert.equal(HomeBlock.managementHeroCopy([{block_order:slot.order,block_title:'自訂時間錨點'}],slot).title,'自訂時間錨點');
});
