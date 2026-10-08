import assert from 'node:assert/strict';
import {stripLocHomeEditorPlaceholders} from '../app/loc/loc-home-text.mjs';

const replacement='\uFFFC';
const source='<p>第一段</p><p>'+replacement+'</p><p>第二段<br>同段換行</p>';
assert.equal(stripLocHomeEditorPlaceholders(source),'<p>第一段</p><p>第二段<br>同段換行</p>');
assert.equal(stripLocHomeEditorPlaceholders('<p>abc'+replacement+'def</p>'),'<p>abc'+replacement+'def</p>');
assert.equal(stripLocHomeEditorPlaceholders('<p>&#65532;</p><p>&#xFFFC;</p><p>正文</p>'),'<p>正文</p>');
assert.equal(stripLocHomeEditorPlaceholders('<p>\u00a0'+replacement+'\n</p><p>原文</p>'),'<p>原文</p>');
assert.equal(stripLocHomeEditorPlaceholders('<p><br></p><p><a href="https://example.com">連結</a></p>'),'<p><br></p><p><a href="https://example.com">連結</a></p>');
assert.equal(stripLocHomeEditorPlaceholders('<p>Lucas Oscar Wang 政德. 2026.10.01.(ex-admin of StarRiver BBS.)</p>'),'<p>Lucas Oscar Wang 政德. 2026.10.01.(ex-admin of StarRiver BBS.)</p>');
console.log('[loc-home-text] only orphan placeholder paragraphs stripped, real paragraphs, <br>, links and signature preserved');
