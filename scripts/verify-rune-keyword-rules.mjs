import assert from 'node:assert/strict';
import {parseRuneKeywordRules,serializeRuneKeywordRules,splitRuneKeywordEntries} from '../app/loc/model/rune-keyword-rules.js';

const parsed=parseRuneKeywordRules('AND 日、NOR月\nAND日');
assert.deepEqual(parsed.invalid,[]);
assert.deepEqual(parsed.rules.map(rule=>rule.token),['AND日','NOR月']);
assert.equal(serializeRuneKeywordRules(' AND 日, NOR月 '),'AND日、NOR月');
assert.deepEqual(parseRuneKeywordRules('OR日').invalid,['OR日']);
assert.deepEqual(splitRuneKeywordEntries('日、AND晨'),{
  keywords:['日'],
  rules:[{operator:'AND',keyword:'晨',token:'AND晨'}]
});

console.log('Rune keyword rule syntax verified; FlexSearch behavior is covered by verify:text-engine.');
