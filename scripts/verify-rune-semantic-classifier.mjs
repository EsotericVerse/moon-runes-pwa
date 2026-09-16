import assert from 'node:assert/strict';
import {classifyRuneSemantics} from '../app/loc/model/rune-semantic-classifier.js';

const expected=new Map([
  ['時空',['AND','時','空']],['風向',['AND','風','向']],['明火',['AND','明','火']],
  ['天時',['PLUS','時','緣']],['時辰',['OVERRIDE','辰']],['清明',['OVERRIDE','辰']],
  ['日蝕',['DEFER','日']],['月蝕',['DEFER','月']],['日期',['DEFER','時']],
  ['日月當空',['OVERRIDE','明']],['延誤',['OVERRIDE','緣']],['誤判',['OVERRIDE','誤']]
]);

for(const [text,[operation,...runes]] of expected){
  const result=classifyRuneSemantics(text);
  assert.equal(result.decisions.length,1,`${text} must produce one governed decision`);
  assert.equal(result.decisions[0].operation,operation,`${text} operation`);
  assert.deepEqual(result.decisions[0].runes,runes,`${text} runes`);
  assert.equal(result.api_used,false);
}

const period=classifyRuneSemantics('日月象徵一段時期與歲月流逝');
assert.deepEqual(period.runes,['辰']);
assert.equal(period.decisions[0].operation,'DEFER');

const literal=classifyRuneSemantics('今日月色很好');
assert.deepEqual(literal.runes,[],'literal 日/月 must not auto-classify');
assert.equal(literal.requires_review,true);
assert.equal(literal.deferred.length,2);

const unknown=classifyRuneSemantics('這是一段尚未形成通則的內容');
assert.deepEqual(unknown.runes,[]);
assert.equal(unknown.requires_review,true);

console.log(`[rune-semantic-classifier] ${expected.size+3} Canon cases verified without keyword fallback`);
