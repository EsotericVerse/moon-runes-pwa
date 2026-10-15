import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateUiField} from '../app/i18n/ui-functional-copy.mjs';
for(const [source,expected] of [['主要資料庫','Primary database'],['次要資料庫','Backup database'],['運作模式','Routing mode'],['儲存設定','Save settings'],['全部項目','All items'],['檢視時期範圍','Period range']])assert.equal(translateUiField('en',source),expected);
assert.equal(translateUiField('zh-Hant','主要資料庫'),'主要資料庫');
assert.equal(translateUiField('zh-Hans','主要資料庫'),'主数据库');
assert.equal(translateUiField('en','私人創作內容'),'私人創作內容');
for(const name of ['Search','Statistics','Culture']){
  const path='../app/modular/features/'+name+'.jsx';
  assert.ok(readFileSync(new URL(path,import.meta.url),'utf8').includes('FieldText'));
}
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
assert.equal(pkg.version,'0.9.6-rc.1');
assert.equal(lock.version,pkg.version);
assert.equal(lock.packages[''].version,pkg.version);
const ios=readFileSync(new URL('../.github/workflows/ios-device-build.yml',import.meta.url),'utf8');
assert.ok(ios.includes('LOC-0.9.6.1rc-device-unsigned.ipa'));
assert.ok(ios.includes('MARKETING_VERSION=0.9.6')&&ios.includes('CURRENT_PROJECT_VERSION=8'));
assert.ok(!ios.includes('0.9.5'));
console.log('[ui-i18n] Field-level translation and 0.9.6.1rc release alignment passed');
