import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=read('app/modular/ui.jsx');
const action=read('app/modular/ArticleTimeAnchorAction.jsx');

test('time-anchor action lives in the shared article detail Time section',()=>{
  assert.match(ui,/const ArticleTimeAnchorAction=dynamic\(/);
  assert.match(ui,/\{detailReading\?<ArticleRelationNavigation/);
  assert.match(ui,/<h3>時間<\/h3>/);
  assert.match(ui,/row\('重要日',<>/);
  assert.match(ui,/<ArticleTimeAnchorAction\s+scopeId=\{scope\} date=\{day\}/);
  assert.match(ui,/const day=String\(articleDate\|\|''\)\.slice\(0,10\)/);
});

test('action verifies Clerk Scope management on click and preserves guest reading',()=>{
  assert.match(action,/useAccount\(\{enabled:false\}\)/);
  assert.match(action,/const begin=async\(\)=>\{/);
  assert.match(action,/account\.refresh\(\{forceVerify:true\}\)/);
  assert.match(action,/verified\?\.authorizer\?\.canManageScopeSync\(scopeId\)/);
  assert.match(action,/setOpen\(true\)/);
});

test('new Time anchor uses article date, checks duplicates, saves description, and returns to reading',()=>{
  assert.match(action,/filters:\[\{column:'type',operator:'eq',value:'anchor'\},\{column:'address',operator:'eq',value:date\}\]/);
  assert.match(action,/const details=description\.trim\(\)/);
  assert.match(action,/allocateTimeUid\(occupied\)/);
  assert.match(action,/const record=\{uid,type:'anchor',title:date,description:details,/);
  assert.match(action,/address:date,anchor_ids:null,invisible:false/);
  assert.match(action,/await insertRows\(table,\[record\]\)/);
  assert.match(action,/setOpen\(false\)/);
  assert.doesNotMatch(action,/create_at|createtime|created_at/);
});
