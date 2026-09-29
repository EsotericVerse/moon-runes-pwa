import assert from 'node:assert/strict';
import {
  cardSemanticState,
  resolveSpreadState,
  resolveStatePair
} from '../app/loc/model/semantic-state.mjs';
import {dailyPresetRange,summarizeDailyDraws,summarizeDailyRange,summarizeDailyWindows} from '../app/loc/model/daily-trend-engine.mjs';
import {buildSpreadGuidance} from '../app/loc/model/spread-guidance.mjs';

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

const grammarCard=(name,directionText,lotsText)=>({
  rune_name:name,
  card_attribute:'正面',
  positive_meaning:directionText,
  lots_positive:lotsText
});
const grammarCards=Array.from({length:11},(_,index)=>grammarCard(
  String(index+1),
  '句'+String(index+1),
  '愛情：愛'+String(index+1)+'。事業：事'+String(index+1)+'。關係：關'+String(index+1)+'。健康：健'+String(index+1)+'。'
));
const grammarDirections=Array.from({length:11},()=> '正位');

assert.equal(buildSpreadGuidance(grammarCards.slice(0,2),grammarDirections.slice(0,2),'2card').sentence,'因為句1，所以句2。');
assert.equal(buildSpreadGuidance(grammarCards.slice(0,3),grammarDirections.slice(0,3),'3card').sentence,'因為句1，但會有句2的改變，所以句3。');
assert.equal(buildSpreadGuidance(grammarCards.slice(0,5),grammarDirections.slice(0,5),'5card').sentence,'因為句1、句2，但會有句3的變化，所以句4、句5。');
assert.equal(buildSpreadGuidance(grammarCards,grammarDirections,'ow3gs').sentence,'因為（因為句1、句2，但會有句3、句4的變化，所以句5、句6），所以（因為句7、句8，但會有句9的變化，所以句10、句11）。');

const pairAdvice=buildSpreadGuidance(grammarCards.slice(0,2),grammarDirections.slice(0,2),'2card').advice;
assert.equal(pairAdvice.length,4);
assert.equal(pairAdvice.find(item=>item.label==='愛情建議')?.text,'因為愛1，所以愛2。');
const fiveAdvice=buildSpreadGuidance(grammarCards.slice(0,5),grammarDirections.slice(0,5),'5card').advice;
assert.equal(fiveAdvice.find(item=>item.label==='事業建議')?.text,'因為事1、事2，但會有事3的變化，所以事4、事5。');
const owAdvice=buildSpreadGuidance(grammarCards,grammarDirections,'ow3gs').advice;
assert.equal(owAdvice.find(item=>item.label==='健康建議')?.text,'因為（因為健1、健2，但會有健3、健4的變化，所以健5、健6），所以（因為健7、健8，但會有健9的變化，所以健10、健11）。');

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

console.log('LunaRunes discrete reference semantics, fixed multi-card grammar, per-card lots advice, and calendar-based daily range analysis verified.');
