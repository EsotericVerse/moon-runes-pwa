import assert from 'node:assert/strict';
import {parseRuneKeywordRules,serializeRuneKeywordRules,splitRuneKeywordEntries} from '../app/loc/model/rune-keyword-rules.js';
import {buildRuneSuggestionRegistry,classifyText} from '../app/loc/model/style-classifier.js';

const parsed=parseRuneKeywordRules('AND 日、NOR月\nAND日');
assert.deepEqual(parsed.invalid,[]);
assert.deepEqual(parsed.rules.map(rule=>rule.token),['AND日','NOR月']);
assert.equal(serializeRuneKeywordRules(' AND 日, NOR月 '),'AND日、NOR月');
assert.deepEqual(parseRuneKeywordRules('OR日').invalid,['OR日']);
assert.deepEqual(splitRuneKeywordEntries('日、AND晨'),{
  keywords:['日'],
  rules:[{operator:'AND',keyword:'晨',token:'AND晨'}]
});

const profile={groups:buildRuneSuggestionRegistry([
  {rune_number:1,rune_name:'日之符文',group_name:'光',positive_keywords:'光、明、AND日、AND晨',negative_keywords:'暗、NOR月'},
  {rune_number:2,rune_name:'海之符文',group_name:'光',positive_keywords:'海、月、AND潮',negative_keywords:''}
])};

assert.deepEqual(classifyText('光日晨',profile).matches[0].runes.map(rune=>rune.id),[1]);
assert.deepEqual(classifyText('光日',profile).matches.map(match=>match.name),['特殊']);
assert.deepEqual(classifyText('光日晨月',profile).matches.map(match=>match.name),['特殊']);
assert.deepEqual(classifyText('海潮',profile).matches[0].runes.map(rune=>rune.id),[2]);
assert.equal(classifyText('海潮',profile).matches[0].name,'光');
assert.deepEqual(classifyText('月海潮',profile).matches[0].runes.map(rune=>rune.id),[2]);
assert.deepEqual(classifyText('暗海潮',profile).matches.map(match=>match.name),['特殊']);

console.log('Rune keyword AND/NOR rules verified.');
