import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {managementHeroSlot} from '../app/loc/home-block-model.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('five management routes exist for each standalone scope',()=>{
  for(const scope of ['lo3rwang','lrunes','scope-shell']){
    const base='app/'+scope+'/';
    assert.match(read(base+'manage/page.jsx'),/forcedView="manage"/);
    for(const [route,view] of [['culture','culture'],['statics','keywords'],['trace','manage'],['search','searchManage']])
      assert.match(read(base+route+'/manage/page.jsx'),new RegExp('forcedView="'+view+'"'));
  }
  assert.match(read('app/search/manage/page.jsx'),/forcedScope="loc"/);
});
test('one editor gate preserves distinct group and scope permissions',()=>{
  const gate=read('app/loc/ManagementAccess.jsx'),app=read('app/loc/LocApp.jsx');
  assert.match(gate,/grants\?\.canManageGlobalSync/);
  assert.match(gate,/grants\?\.canManageGroupSync\(id\)/);
  assert.match(gate,/grants\?\.canManageScopeSync\(id\)/);
  assert.match(gate,/editorSessionStatus\(window\.sessionStorage\)\.expired/);
  assert.match(gate,/get_my_scope_management/);
  assert.match(app,/scopeMeta\?\.aggregateChildren\?'group':'scope'/);
});
test('management heroes map to the correct copy slot',()=>{
  const pages=[
    ['/lo3rwang/manage','lo3rwang','manage','SpaceAnchor'],
    ['/lo3rwang/culture/manage','lo3rwang','culture','TimeAnchor'],
    ['/lo3rwang/statics/manage','lo3rwang','statics','ScopeKeyword'],
    ['/lo3rwang/trace/manage','lo3rwang','trace','SpaceAnchor'],
    ['/lo3rwang/search/manage','lo3rwang','search','ScopeAdvSearch'],
    ['/culture/manage','loc','culture','GalaxyManage'],
    ['/statics/manage','loc','statics','Groupkeyword'],
    ['/trace/manage','loc','trace','GroupSpace'],
    ['/search/manage','loc','search','GroupArticle']
  ];
  for(const [url,scope,feature,expected] of pages)
    assert.equal(managementHeroSlot(url,scope,true,feature)?.page,expected,url);
});
