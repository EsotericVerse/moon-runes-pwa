import assert from 'node:assert/strict';
import {
  cardSemanticState,
  resolveSpreadState,
  resolveStatePair
} from '../app/loc/model/semantic-state.mjs';
import {dailyPresetRange,summarizeDailyDraws,summarizeDailyRange,summarizeDailyWindows} from '../app/loc/model/daily-trend-engine.mjs';
import {buildSpreadGuidance,knownPairStateKeys} from '../app/loc/model/spread-guidance.mjs';

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
assert.ok(three.guidance.length>0);

const five=resolveSpreadState(
  [positive,positive,positive,positive,positive],
  ['正位','半正位','逆位','半逆位','半正位'],
  '5card'
);
assert.equal(five.layers.length,4);
assert.equal(five.sections.length,3);
assert.ok(five.guidance.length>0);

const ow=resolveSpreadState(
  Array.from({length:11},()=>positive),
  ['正位','半正位','逆位','半逆位','正位','半正位','逆位','半逆位','正位','半正位','正位'],
  'ow3gs'
);
assert.equal(ow.sections.length,2);
assert.equal(ow.sections[0].label,'1–6 因的描述層');
assert.equal(ow.sections[1].label,'7–11 果的判定層');
assert.ok(!/趨勢.+結果/.test(ow.guidance));
assert.ok(ow.guidance.length>0);

const pairAttributes=['正面','中平','負面'];
const pairDirections=['正位','半正位','半逆位','逆位'];
const pairSentences=new Set();
for(const fromAttribute of pairAttributes){
  for(const fromDirection of pairDirections){
    for(const toAttribute of pairAttributes){
      for(const toDirection of pairDirections){
        const reading=buildSpreadGuidance(
          [
            {符文名稱:'靈',卡片屬性:fromAttribute},
            {符文名稱:'向',卡片屬性:toAttribute}
          ],
          [fromDirection,toDirection],
          '2card'
        );
        pairSentences.add(reading.sentence);
      }
    }
  }
}
assert.equal(knownPairStateKeys().length,12);
assert.equal(pairSentences.size,144);

assert.match(
  buildSpreadGuidance(
    [{符文名稱:'玄',卡片屬性:'未知'},{符文名稱:'向',卡片屬性:'中平'}],
    ['正位','正位'],
    '2card'
  ).sentence,
  /來源未知/
);
assert.match(
  buildSpreadGuidance(
    [{符文名稱:'靈',卡片屬性:'正面'},{符文名稱:'命',卡片屬性:'未知'}],
    ['正位','正位'],
    '2card'
  ).sentence,
  /結果.*未知|結果仍然未知/
);
assert.match(
  buildSpreadGuidance(
    [
      {符文名稱:'靈',卡片屬性:'正面'},
      {符文名稱:'玄',卡片屬性:'未知'},
      {符文名稱:'向',卡片屬性:'中平'}
    ],
    ['正位','正位','正位'],
    '3card'
  ).sentence,
  /變數.*未知/
);

const daily=summarizeDailyDraws([
  {record_date:'2026-09-26',draw_kind:'main',rune_number:1,rune_name:'靈',direction:'正位'},
  {record_date:'2026-09-26',draw_kind:'supplement',rune_number:2,rune_name:'魂',direction:'正位'},
  {record_date:'2026-09-27',draw_kind:'main',rune_number:1,rune_name:'靈',direction:'半正位'},
  {record_date:'2026-09-27',draw_kind:'supplement',rune_number:4,rune_name:'彩',direction:'半正位'}
]);
assert.equal(daily.length,2);
assert.equal(daily[0].rows.length,2);
assert.equal(daily[1].rows.length,2);

assert.deepEqual(dailyPresetRange('2026-09-27','today-tomorrow'),{
  startDate:'2026-09-27',endDate:'2026-09-28'
});
assert.deepEqual(dailyPresetRange('2026-09-27','yesterday-today-tomorrow'),{
  startDate:'2026-09-26',endDate:'2026-09-28'
});
assert.deepEqual(dailyPresetRange('2026-09-27','seven-days'),{
  startDate:'2026-09-21',endDate:'2026-09-27'
});

const dailyWindowRows=[
  {record_date:'2026-09-21',draw_kind:'main',rune_number:1,rune_name:'靈',direction:'正位'},
  {record_date:'2026-09-22',draw_kind:'main',rune_number:2,rune_name:'魂',direction:'正位'},
  {record_date:'2026-09-23',draw_kind:'main',rune_number:1,rune_name:'靈',direction:'半逆位'},
  {record_date:'2026-09-25',draw_kind:'supplement',rune_number:9,rune_name:'向',direction:'半正位'},
  {record_date:'2026-09-27',draw_kind:'main',rune_number:1,rune_name:'靈',direction:'逆位'}
];
const seven=summarizeDailyRange(dailyWindowRows,{
  startDate:'2026-09-21',endDate:'2026-09-27',label:'近七天'
});
assert.equal(seven.total_days,7);
assert.equal(seven.total_draws,5);
assert.ok(seven.repeats.some(item=>item.name==='靈'&&item.count===3&&item.days_count===3));
assert.ok(seven.direction_changes.some(item=>item.name==='靈'&&item.from==='正位'&&item.to==='逆位'));
assert.ok(seven.suggestions.some(item=>item.type==='frequency'&&item.rune==='靈'));
assert.ok(seven.suggestions.some(item=>item.type==='direction'&&item.rune==='靈'));

const windows=summarizeDailyWindows(dailyWindowRows,'2026-09-27');
assert.equal(windows.seven_days.start_date,'2026-09-21');
assert.equal(windows.today_tomorrow.start_date,'2026-09-27');
assert.equal(windows.yesterday_today_tomorrow.start_date,'2026-09-26');

console.log('LunaRunes discrete semantics, natural multi-card guidance, and calendar-based daily range analysis verified.');
