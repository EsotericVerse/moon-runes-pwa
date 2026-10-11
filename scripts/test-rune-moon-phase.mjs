import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Test the actual production moon-phase function with the host ICU and
// simulated iOS/WebKit locales; no copy of the phase algorithm.
const source=readFileSync('app/loc/model/moon-phase.js','utf8')
  .replace('export function realMoonPhase','function realMoonPhase');
function moonWith(intl){
  return new Function('Intl',source+';return realMoonPhase;')(intl);
}
const actualMoon=moonWith(Intl);

test('Taipei lunar dates cover all five canonical database moon labels',()=>{
  const examples=[
    ['2026-10-10T04:00:00Z','新月'],   // Chinese lunar day 1
    ['2026-10-17T04:00:00Z','上弦'],   // day 8
    ['2026-10-24T04:00:00Z','滿月'],   // day 15
    ['2026-10-31T04:00:00Z','下弦'],   // day 22
    ['2026-11-07T04:00:00Z','空亡'],   // day 29
    ['2026-11-09T04:00:00Z','新月']    // next Chinese lunar month
  ];
  for(const [date,want] of examples)assert.equal(actualMoon(new Date(date)),want,date);
});

function fakeLocaleDay(day,{firstLocaleFails=false,firstGregorian=false}={}){
  return {DateTimeFormat:function(locale){
    if(firstLocaleFails&&locale.startsWith('en-'))throw new RangeError('Unsupported locale');
    return {
      resolvedOptions:()=>({calendar:firstGregorian&&locale.startsWith('en-')?'gregory':'chinese'}),
      formatToParts:()=>[{type:'month',value:'十月'},{type:'day',value:day}]
    };
  }};
}
for(const [value,expected] of [
  ['初二','新月'],['初十','上弦'],['十五','滿月'],
  ['廿二','下弦'],['廿九','空亡'],['三十','空亡'],
  ['２９','空亡'],['二十九','空亡'],['8','上弦']
]){
  test('Safari localized lunar date '+value,()=>{
    assert.equal(moonWith(fakeLocaleDay(value))(new Date('2026-10-11')),expected);
  });
}
test('unsupported English Chinese locale falls through to Taiwan locale',()=>{
  assert.equal(moonWith(fakeLocaleDay('初二',{firstLocaleFails:true}))(new Date()),'新月');
});
test('Gregorian fallback is rejected, retries genuine Chinese calendar locale',()=>{
  assert.equal(moonWith(fakeLocaleDay('廿九',{firstGregorian:true}))(new Date()),'空亡');
});
test('invalid date and all unsupported lunar locales fail visibly',()=>{
  assert.equal(actualMoon(new Date(NaN)),'未知');
  const fallback=moonWith({DateTimeFormat:()=>{throw new RangeError('Unsupported Chinese calendar')}});
  assert.equal(fallback(new Date()),'未知');
});

const draw=readFileSync('app/lrunes/RuneDrawClient.jsx','utf8');
assert.match(draw,/const currentMoon=realMoonPhase\(\);/);
assert.match(draw,/setMoonPhase\(currentMoon\);/);
assert.match(draw,/currentMoon\}/);
assert.doesNotMatch(draw,/const moonPhase=useMemo\(\(\)=>realMoonPhase\(\),\[\]\)/);
console.log('[rune-moon-phase] real Chinese-calendar day and iOS/WebKit numeral variants passed');
