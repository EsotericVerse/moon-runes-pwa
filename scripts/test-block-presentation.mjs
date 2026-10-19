import assert from 'node:assert/strict';
import {HomeBlock} from '../app/loc/home-block-model.js';

assert.equal(HomeBlock.childPresentation(''),'bubble','no title must display a bubble');
assert.equal(HomeBlock.childPresentation('  '),'bubble','whitespace-only title must display a bubble');
assert.equal(HomeBlock.childPresentation('文化'),'card','any title must display a text card');
assert.equal(HomeBlock.childPresentation('Card'), 'card');
assert.equal(HomeBlock.childPresentation(null),'bubble');
const subtitle='<p>透過以時間作為分類標準，來找尋各項時期的變化趨勢。</p>';
const text=subtitle+'<p>文字留下<strong>風格</strong>，風格經過時間累積，才看得見文字風格的變化。<br><a href="https://example.com">閱讀更多</a></p><p><br></p>';
const result=HomeBlock.removeDuplicatedLegacySubtitle(text,subtitle);
assert.equal(result,'<p>文字留下<strong>風格</strong>，風格經過時間累積，才看得見文字風格的變化。<br><a href="https://example.com">閱讀更多</a></p><p><br></p>');
assert.equal(HomeBlock.removeDuplicatedLegacySubtitle(text,'<p>不相符</p>'),text,'unrelated content must stay untouched');
assert.equal(HomeBlock.removeDuplicatedLegacySubtitle(text,''),text,'blank subtitle must not remove content');
assert.equal(HomeBlock.removeDuplicatedLegacySubtitle('',''),'');

console.log('[block-presentation] title-free bubble, title-driven card, rich body and newline safety verified');
