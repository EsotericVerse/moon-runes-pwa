import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scopeFeatureColumns,scopeFeatureEnabled,scopeFeaturePatch,scopeTagColumn,scopeTagNames} from '../app/loc/scope-config-fields.mjs';

test('author config uses the compact JSONB feature flags without affecting other Scopes',()=>{
  assert.equal(scopeFeatureColumns('lo3rwang'),'abilities');
  assert.equal(scopeFeatureColumns('lrunes'),'search_able,statistics_able,culture_able');
  const config={abilities:{search_able:false,statistics_able:true,culture_able:false}};
  assert.equal(scopeFeatureEnabled(config,'search_able'),false);
  assert.equal(scopeFeatureEnabled(config,'statistics_able'),true);
  assert.deepEqual(scopeFeaturePatch('lo3rwang',config),{abilities:config.abilities});
  assert.deepEqual(scopeFeaturePatch('loc',{search_able:false}),{search_able:false,statistics_able:true,culture_able:true});
});
test('ArticleTag JSONB retains the original ordered array and other Scopes remain compatible',()=>{
  const entries=['suno','kkcity','其他'];
  assert.equal(scopeTagColumn('lo3rwang'),'ArticleTag');
  assert.equal(scopeTagColumn('loc'),'DefaultArticleClass');
  assert.equal(scopeTagColumn('lrunes'),'txt_class');
  assert.deepEqual(scopeTagNames('lo3rwang',{ArticleTag:entries}),entries);
  assert.deepEqual(scopeTagNames('loc',{DefaultArticleClass:entries}),entries);
});
test('source editing, publication, and feature settings read their respective columns',()=>{
  const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
  assert.match(read('app/loc/scope-data.js'),/scopeConfigColumns\(scope\.id\)/);
  assert.match(read('app/loc/views/admin-panels/AdminRegistry.jsx'),/scopeFeaturePatch\(current\.scope_id,currentConfig\)/);
  assert.match(read('app/loc/FlatClassificationEditor.jsx'),/scopeTagColumn\(scopeId\)/);
  assert.match(read('app/loc/FlatClassificationEditor.jsx'),/update_group_default_article_class/);
  assert.match(read('scripts/generate-public-blocks.mjs'),/scopeConfigColumns\(id\)/);
  assert.match(read('scripts/generate-public-blocks.mjs'),/scopeTagColumn\(id\)/);
});
