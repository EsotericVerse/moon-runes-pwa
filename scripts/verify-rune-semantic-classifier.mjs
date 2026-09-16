import assert from 'node:assert/strict';
import {classifyRuneSemantics,classifyRuneCorpus} from '../app/loc/model/rune-semantic-classifier.js';
const cases=[['時空',['時','空']],['風向',['風','向']],['明火',['明','火']],['天時',['時','緣']],['時辰',['辰']],['清明',['辰']],['節氣',['辰']],['時期',['辰']],['階段',['辰']],['日期',['時']],['日蝕',['日']],['月蝕',['月']],['日月',['辰']],['日月當空',['明']],['遲到',['緣']],['延誤',['緣']],['錯過',['緣']],['誤判',['誤']],['誤解',['誤']],['錯誤資料',['誤']]];
for(const [text,expected] of cases){const result=classifyRuneSemantics(text);assert.deepEqual(result.runes,expected,`${text}: ${JSON.stringify(result)}`);assert.equal(result.api_used,false)}
assert.deepEqual(classifyRuneSemantics('OW3gs').runes,[],'Author term must not leak outside Author Scope');
assert.deepEqual(classifyRuneSemantics('OW3gs',{authorScope:true}).runes,['德']);
assert.deepEqual(classifyRuneSemantics('微月光',{authorScope:true}).runes,['德']);
assert.deepEqual(classifyRuneSemantics('張政德').runes,[],'literal 德/name must not auto-classify as Author Governance');
assert.deepEqual(classifyRuneSemantics('日').runes,[],'literal 日 must DEFER');
assert.equal(classifyRuneSemantics('日').deferred[0]?.rune,'日');
assert.deepEqual(classifyRuneSemantics('月').runes,[],'literal 月 must DEFER');
const corpus=classifyRuneCorpus([{era:'14',text:'時空'},{era:'66',text:'天時'},{era:'66',text:'延誤'}]);
assert.equal(corpus.records.length,3);assert.equal(corpus.era_counts.find(x=>x.era==='66')?.runes.find(x=>x.rune==='緣')?.count,2);assert.equal(corpus.api_used,false);
console.log(`Rune semantic classifier verified: ${cases.length+7} governed cases plus corpus aggregation.`);
