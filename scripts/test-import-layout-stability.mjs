import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../app/styles/features.css',import.meta.url),'utf8');
const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');

test('import cards use shrinkable grid tracks for long ZIP paths and external URLs',()=>{
  assert.match(css,/\.scope-management-imports\{[^}]*grid-template-columns:minmax\(0,1fr\)/s);
  assert.match(css,/\.scope-import-body\{[^}]*grid-template-columns:minmax\(0,1fr\)/s);
  assert.match(css,/\.scope-import-preview\{[^}]*grid-template-columns:minmax\(0,1fr\)/s);
  assert.match(css,/\.scope-import-preview :is\(ul,li,dd\)\{[^}]*overflow-wrap:anywhere/s);
  assert.match(css,/grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,14rem\),1fr\)\)/);
});

test('ZIP scanning reports numeric progress without reflowing variable-length paragraphs',()=>{
  assert.match(panel,/onProgress:p=>setProgress\(\{stage:'正在辨識 ZIP 檔案'/);
  assert.match(panel,/onProgress:p=>setProgress\(\{stage:'正在解析 ZIP 文章與媒體'/);
  assert.doesNotMatch(panel,/onProgress:p=>setStatus\('正在辨識 ZIP/);
  assert.doesNotMatch(panel,/onProgress:p=>setStatus\('正在解析 ZIP/);
  assert.match(panel,/setBusy\(false\);setProgress\(null\);/);
  assert.match(panel,/scope-status scope-import-live-status/);
  assert.match(css,/\.scope-import-live-status\{[^}]*min-height:4rem/s);
});
