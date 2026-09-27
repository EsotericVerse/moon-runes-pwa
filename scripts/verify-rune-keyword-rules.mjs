import assert from 'node:assert/strict';
import {parseRuneKeywordRules,serializeRuneKeywordRules,splitRuneKeywordEntries} from '../app/loc/model/rune-keyword-rules.js';
import {classifyStyleRowsWithCatalog} from '../app/loc/style-classifier.js';

const parsed=parseRuneKeywordRules('AND 日、NOR月\nAND日');
assert.deepEqual(parsed.invalid,[]);
assert.deepEqual(parsed.rules.map(rule=>rule.token),['AND日','NOR月']);
assert.equal(serializeRuneKeywordRules(' AND 日, NOR月 '),'AND日、NOR月');
assert.deepEqual(parseRuneKeywordRules('OR日').invalid,['OR日']);
assert.deepEqual(splitRuneKeywordEntries('日、AND晨'),{
  keywords:['日'],
  rules:[{operator:'AND',keyword:'晨',token:'AND晨'}]
});

const catalog=[
  {rune_number:1,style_label:'日之符文',style_group:'光',keyword_group:'positive',keyword:'光',order:1},
  {rune_number:1,style_label:'日之符文',style_group:'光',keyword_group:'positive',keyword:'AND日',order:2},
  {rune_number:1,style_label:'日之符文',style_group:'光',keyword_group:'positive',keyword:'AND晨',order:3},
  {rune_number:1,style_label:'日之符文',style_group:'光',keyword_group:'rules',keyword:'NOR月',order:4},
  {rune_number:2,style_label:'海之符文',style_group:'水',keyword_group:'positive',keyword:'海',order:5},
  {rune_number:2,style_label:'海之符文',style_group:'水',keyword_group:'positive',keyword:'AND潮',order:6}
];

const rows=classifyStyleRowsWithCatalog([
  {content:'光日晨'},
  {content:'光日'},
  {content:'光日晨月'},
  {content:'海潮'}
],catalog);

assert.equal(rows[0].style_label,'日之符文');
assert.equal(rows[1].style_label,'');
assert.equal(rows[2].style_label,'');
assert.equal(rows[3].style_label,'海之符文');

console.log('Rune keyword AND/NOR rules verified through FlexSearch.');
