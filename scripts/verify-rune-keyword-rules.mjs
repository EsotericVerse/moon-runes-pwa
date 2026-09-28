import assert from 'node:assert/strict';
import {parseRuneKeywordRules,serializeRuneKeywordRules,splitRuneKeywordEntries} from '../app/loc/model/rune-keyword-rules.mjs';
import {classifyLunaRunesStyleText,compileLunaRunesStyleModel} from '../app/loc/lrunes-style-model.mjs';

const parsed=parseRuneKeywordRules('AND 日、NOR月\nAND日');
assert.deepEqual(parsed.invalid,[]);
assert.deepEqual(parsed.rules.map(rule=>rule.token),['AND日','NOR月']);
assert.equal(serializeRuneKeywordRules(' AND 日, NOR月 '),'AND日、NOR月');
assert.deepEqual(parseRuneKeywordRules('OR日').invalid,['OR日']);
assert.deepEqual(splitRuneKeywordEntries('日、AND晨'),{
  keywords:['日'],
  rules:[{operator:'AND',keyword:'晨',token:'AND晨'}]
});

const styleModel=compileLunaRunesStyleModel([
  {style_no:2,node_type:'style',representative_name:'靈',parent_group_name:'靈魂',order_no:1},
  {style_no:2,node_type:'keyword',keyword_group:'macro',keyword:'精神',order_no:1},
  {style_no:2,node_type:'keyword',keyword_group:'style',keyword:'AND靈',order_no:9000},
  {style_no:27,node_type:'style',representative_name:'花',parent_group_name:'自然',order_no:26},
  {style_no:27,node_type:'keyword',keyword_group:'style',keyword:'花枝NAME',order_no:8990},
  {style_no:27,node_type:'keyword',keyword_group:'style',keyword:'AND花',order_no:9000},
  {style_no:33,node_type:'style',representative_name:'枝',parent_group_name:'自然',order_no:32},
  {style_no:33,node_type:'keyword',keyword_group:'style',keyword:'AND枝',order_no:9000},
  {style_no:50,node_type:'style',representative_name:'日',parent_group_name:'秩序',order_no:49},
  {style_no:50,node_type:'keyword',keyword_group:'macro',keyword:'日蝕',order_no:1},
  {style_no:50,node_type:'keyword',keyword_group:'style',keyword:'NOR日',order_no:9000},
  {style_no:50,node_type:'keyword',keyword_group:'style',keyword:'TO時',order_no:9010},
  {style_no:55,node_type:'style',representative_name:'時',parent_group_name:'秩序',order_no:54},
  {style_no:55,node_type:'keyword',keyword_group:'style',keyword:'AND時',order_no:9000}
]);
assert.deepEqual(classifyLunaRunesStyleText('精神',styleModel).hits.map(item=>item.rune_name),['靈']);
assert.deepEqual(classifyLunaRunesStyleText('日蝕',styleModel).hits.map(item=>item.rune_name),['日']);
assert.deepEqual(classifyLunaRunesStyleText('生日',styleModel).hits.map(item=>item.rune_name),['時']);
assert.deepEqual(classifyLunaRunesStyleText('花枝',styleModel).hits.map(item=>item.rune_name),[]);
assert.deepEqual(new Set(classifyLunaRunesStyleText('花開枝展',styleModel).hits.map(item=>item.rune_name)),new Set(['花','枝']));

console.log('Rune keyword rule syntax and ordered LunaRunes style routing verified.');
