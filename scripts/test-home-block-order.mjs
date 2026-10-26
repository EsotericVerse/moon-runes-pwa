import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
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
  assert.equal(HomeBlock.MANAGEMENT_HERO_IMAGE_URL,'https://loc.lo3rwang.cc/pics/scope-gn.jpg');
  assert.equal(HomeBlock.MANAGEMENT_HERO_SLOTS[0].englishTitle,'TimeAnchor');
  assert.equal(HomeBlock.managementHeroSlot('/admin','loc'),null);
  assert.equal(HomeBlock.managementHeroSlot('/lo3rwang/culture/manage','lo3rwang',true,'culture')?.key,'time');
  assert.equal(HomeBlock.managementHeroSlot('/lo3rwang/statics/manage','lo3rwang',true,'statics')?.key,'keywords');
  assert.equal(HomeBlock.managementHeroSlot('/lo3rwang/trace/manage','lo3rwang',true,'trace')?.key,'spatial');
  assert.equal(HomeBlock.managementHeroSlot('/lo3rwang/search/manage','lo3rwang',true,'search')?.key,'advanced');
  assert.equal(HomeBlock.managementHeroSlot('/lo3rwang/manage/search','lo3rwang')?.key,'advanced');
  assert.equal(HomeBlock.managementHeroSlot('/lo3rwang/manage','lo3rwang')?.key,'spatial');
  assert.equal(HomeBlock.managementHeroSlot('/admin','loc'),null);
  assert.equal(HomeBlock.managementHeroSlot('/admin/search','loc')?.key,'articles');
  const slot=HomeBlock.MANAGEMENT_HERO_SLOTS[0];
  assert.equal(HomeBlock.managementHeroCopy([{block_order:slot.order,block_title:'自訂時間錨點'}],slot).title,'自訂時間錨點');
});

test('Article Control and feature-aligned management Hero editor remain functional',()=>{
  const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
  const articles=read('app/loc/SearchManagement.jsx');
  const spatial=read('app/loc/ScopeManagement.jsx');
  const hero=read('app/loc/views/admin-panels/FeatureHeroImages.jsx');
  const css=read('app/styles/uiux.css');
  for(const name of ["shortLabel:'發表'","shortLabel:'區塊修改'","shortLabel:'匯入'","shortLabel:'個人分類'"])
    assert.ok(articles.includes(name),'Article Control is missing '+name);
  assert.match(articles,/ManagementArticlePublisher scopeId=\{scopeId\}/);
  assert.match(articles,/ManagementMediaWorkspace scopeId=\{scopeId\}/);
  assert.match(articles,/page="search" orders=\{\[1\]\}/);
  assert.match(articles,/page="trace"/);
  assert.match(articles,/ScopeOthersSources.*scopeId=\{scopeId\}/);
  assert.doesNotMatch(spatial,/section==='import'/);
  assert.doesNotMatch(spatial,/section==='others'/);
  assert.match(spatial,/requestedSection.*section/);
  assert.match(hero,/management-hero-copy-row/);
  assert.doesNotMatch(hero,/id:'manage',label:'頁面控管'/);
  assert.match(hero,/pageOverride="scope_manage"/);
  assert.match(hero,/block_title:title/);
  assert.match(hero,/儲存 Hero 圖片路徑/);
  assert.match(hero,/儲存後資料庫讀回不一致/);
  assert.match(hero,/uid:HomeBlock.createUid\(\)/);
  assert.match(css,/\.scope-main--edit-workspace \.scope-feature-hero--manage\s*\{[^}]*background-size:100% 100%,cover/);
  assert.match(css,/\.article-control-stacked/);
});

test('Article Control name is translated in all four UI dictionaries',()=>{
  const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.match(read('app/AppShell.jsx'),/translateUiField\(activeLocale,'文章控管'\)/);
  for(const locale of ['zh_tw','zh_cn','en','ja'])
    assert.match(read('app/i18n/sections/fields.'+locale+'.js'),/"文章控管":/);
});
