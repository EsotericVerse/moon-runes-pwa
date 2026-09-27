import assert from 'node:assert/strict';
import {
  cardSemanticState,
  resolveSpreadState,
  resolveStatePair
} from '../app/loc/model/semantic-state.mjs';
import {summarizeDailyDraws} from '../app/loc/model/daily-trend-engine.mjs';

const positive={card_attribute:'正面'};
const negative={card_attribute:'負面'};
const neutral={card_attribute:'中立'};
const unknown={card_attribute:'未知'};

assert.equal(cardSemanticState(positive,'正位'),'正位');
assert.equal(cardSemanticState(positive,'半正位'),'半正位');
assert.equal(cardSemanticState(negative,'正位'),'逆位');
assert.equal(cardSemanticState(negative,'半正位'),'半逆位');
assert.equal(cardSemanticState(negative,'半逆位'),'半正位');
assert.equal(cardSemanticState(negative,'逆位'),'正位');
assert.equal(cardSemanticState(neutral,'逆位'),'中立');
assert.equal(cardSemanticState(unknown,'正位'),'未知');

assert.deepEqual(resolveStatePair('正位','半正位'),{
  from:'正位',result:'半正位',trend:'半逆位'
});
assert.deepEqual(resolveStatePair('半正位','正位'),{
  from:'半正位',result:'正位',trend:'半正位'
});
assert.deepEqual(resolveStatePair('半正位','半正位'),{
  from:'半正位',result:'半正位',trend:'中立'
});
assert.deepEqual(resolveStatePair('未知','半正位'),{
  from:'未知',result:'半正位',trend:'未知'
});

const three=resolveSpreadState(
  [positive,positive,positive],
  ['正位','逆位','半正位'],
  '3card'
);
assert.equal(three.layers.length,2);
assert.equal(three.trend,'半逆位');
assert.equal(three.result,'半正位');
assert.equal(three.guidance,'中途轉為明顯偏弱的狀態；原有優勢仍在，但後續力道稍有收斂。');

const five=resolveSpreadState(
  [positive,positive,positive,positive,positive],
  ['正位','半正位','逆位','半逆位','半正位'],
  '5card'
);
assert.equal(five.layers.length,4);
assert.equal(five.sections.length,3);
assert.equal(five.guidance,'意外因素呈現明顯偏弱的狀態；原有優勢仍在，但後續力道稍有收斂。');

const ow=resolveSpreadState(
  Array.from({length:11},()=>positive),
  ['正位','半正位','逆位','半逆位','正位','半正位','逆位','半逆位','正位','半正位','正位'],
  'ow3gs'
);
assert.equal(ow.sections.length,2);
assert.equal(ow.sections[0].label,'1–6 因的描述層');
assert.equal(ow.sections[1].label,'7–11 果的判定層');
assert.ok(!/趨勢.+結果/.test(ow.guidance));
assert.ok(ow.guidance.includes('前因脈絡顯示'));
assert.ok(ow.guidance.includes('核心判定則顯示'));

const daily=summarizeDailyDraws([
  {record_date:'2026-09-26',draw_kind:'main',rune_number:1,direction:'正位',card_attribute:'正面'},
  {record_date:'2026-09-26',draw_kind:'supplement',rune_number:2,direction:'正位',card_attribute:'正面'},
  {record_date:'2026-09-27',draw_kind:'main',rune_number:3,direction:'正位',card_attribute:'正面'},
  {record_date:'2026-09-27',draw_kind:'supplement',rune_number:4,direction:'半正位',card_attribute:'正面'}
]);
assert.equal(daily.length,2);
assert.equal(daily[0].result,'正位');
assert.equal(daily[1].result,'半正位');
assert.equal(daily[1].daily_trend,'半逆位');
assert.equal(daily[1].daily_result,'半正位');
assert.equal(daily[1].guidance,'趨勢半逆位，結果半正位。');

console.log('LunaRunes discrete semantics, natural multi-card guidance, and FlexSearch daily trend verified.');
