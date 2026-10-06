import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.cwd();
const publicDraw=readFileSync(resolve(root,'app/lrunes/RuneDrawClient.jsx'),'utf8');
const drawModes=readFileSync(resolve(root,'app/lrunes/rune-draw-modes.mjs'),'utf8');
const governance=readFileSync(resolve(root,'docs/LUNARUNES_DRAW_GOVERNANCE.md'),'utf8');
const ritual=readFileSync(resolve(root,'app/lrunes/rune-ritual.js'),'utf8');
const guidance=readFileSync(resolve(root,'app/lrunes/rune-guidance-engine.mjs'),'utf8');
const dailySurface=readFileSync(resolve(root,'app/lrunes/RuneSingleDailySurface.jsx'),'utf8');
const runeHome=readFileSync(resolve(root,'app/lrunes/RunesClient.jsx'),'utf8');
const customSelector=readFileSync(resolve(root,'app/lrunes/CustomDrawSelector.jsx'),'utf8');

for(const [name,source] of [['RuneDrawClient',publicDraw]]){
  for(const fragment of [
    'function randomIndex(max)',
    'function drawRuneSession(items,count)',
    'const pool=[...items],cards=[];',
    'cards.push(pool.splice(pick,1)[0]);',
    'const directionIndexes=cards.map(()=>randomIndex(4));',
    'const runePool=Array.from({length:66},(_,index)=>index+1);',
    'drawRuneSession(runePool,selectedMode.count)',
    'loadDrawCards(pairs,queryPlan)',
    "selectRows('silver.runes'",
    "selectRows('silver.runes_etc'",
    'buildFixedReading(',
    'composeFixedGrammar(',
    'poeticClause(',
    'return cleanGrammarPart(situationQuestion(card,direction));',
    'drawSegments(',
    'joinPoeticGroup(',
    "return {sentence,domains:[],evaluation:weighted};",
    "moonTypes:['sit_q','sit_a']",
    "moonTypes:['sit_q','sit_a','daily_r','daily_g','daily_b']",
    ":{staticTypes:['direction'],moonTypes:['sit_q'],currentMoon:moonPhase};",
    "{column:'current_moon',operator:'eq',value:currentMoon}",
    'RUNE_RITUAL_DELAY_MS',
    'runeRitualMessages'
  ])if(!source.includes(fragment))throw new Error(name+' missing Current draw contract: '+fragment);
}

for(const fragment of [
  "return `${groups[0]}，故${groups[1]}。`;",
  "function trendConnector(trend)",
  "if(trend==='轉強')return '遂';",
  "if(trend==='轉弱')return '然';",
  "return '而';",
  "trendConnector(trend)",
  "const rows=Array.isArray(selectedMode?.displayRows)?selectedMode.displayRows:[];"
])if(!publicDraw.includes(fragment))throw new Error('Rune verse grammar missing: '+fragment);

for(const forbidden of [
  'function MultiReading(',
  '完整解讀',
  '五卡完整解讀',
  'OW3gs · 雙模型判讀',
  '愛情建議',
  '事業建議',
  '關係建議',
  '健康建議'
])if(publicDraw.includes(forbidden))throw new Error('Multi-card draw must remain verse-only: '+forbidden);

if(!publicDraw.includes('<RuneSingleDailySurface'))throw new Error('Single/Daily surface contract missing');

const standardStart=drawModes.indexOf('export const RUNE_DRAW_MODES=');
const customStart=drawModes.indexOf('export const RUNE_CUSTOM_DRAW_MODES=');
if(standardStart<0||customStart<0||customStart<=standardStart)throw new Error('Rune draw mode partitions missing');
const standardModes=drawModes.slice(standardStart,customStart);
const customModes=drawModes.slice(customStart);
for(const key of ["key:'single'","key:'daily'","key:'2card'","key:'3card'","key:'5card'","key:'ow3gs'"]){
  if(!standardModes.includes(key))throw new Error('Standard draw choice missing: '+key);
}
for(const key of ["key:'4card'","key:'6card'","key:'7card'","key:'8card'","key:'9card'","key:'10card'"]){
  if(standardModes.includes(key))throw new Error('Custom draw count leaked into standard choices: '+key);
  if(!customModes.includes(key))throw new Error('Custom draw count missing: '+key);
}
if(!runeHome.includes('<CustomDrawSelector'))throw new Error('Rune home custom count selector missing');
if(!customSelector.includes('指定抽牌數量')||!customSelector.includes('window.location.assign'))throw new Error('Custom count selector navigation missing');

const spreadContracts=[
  ["key:'2card'","segments:[1,1]"],
  ["key:'3card'","segments:[1,1,1]"],
  ["key:'4card'","segments:[1,2,1]"],
  ["key:'5card'","segments:[2,1,2]"],
  ["key:'6card'","segments:[2,2,2]"],
  ["key:'7card'","segments:[2,3,2]"],
  ["key:'8card'","segments:[3,2,3]"],
  ["key:'9card'","segments:[3,3,3]"],
  ["key:'10card'","segments:[4,2,4]"],
  ["key:'10card'","displayRows:[2,2,2,2,2]"]
];
for(const [mode,shape] of spreadContracts){
  if(!drawModes.includes(mode)||!drawModes.includes(shape))throw new Error('Flexible Rune spread missing: '+mode+' '+shape);
}

for(const fragment of ['RUNE_RITUAL_DELAY_MS=5000','RUNE_RITUAL_STEP_MS=1000'])if(!ritual.includes(fragment))throw new Error('Rune ritual invariant missing: '+fragment);
for(const fragment of [
  "const DIRECTION_FACTOR=Object.freeze({",
  "'正位':1",
  "'半正位':0.5",
  "'半逆位':-0.5",
  "'逆位':-1",
  'export function evaluateSpreadXY',
  'const delta=y-x;',
  'const sum=x+y;',
  "'4card':{x:[0],variable:[1,2],y:[3]}",
  "'5card':{x:[0,1],variable:[2],y:[3,4]}",
  "'6card':{x:[0,1],variable:[2,3],y:[4,5]}",
  "'7card':{x:[0,1],variable:[2,3,4],y:[5,6]}",
  "'8card':{x:[0,1,2],variable:[3,4],y:[5,6,7]}",
  "'9card':{x:[0,1,2],variable:[3,4,5],y:[6,7,8]}",
  "'10card':{x:[0,1,2,3],variable:[4,5],y:[6,7,8,9]}"
])if(!guidance.includes(fragment))throw new Error('Rune x/y guidance missing: '+fragment);
for(const fragment of ['狀況形容','狀況表達','每日占卜提醒','每日占卜引導','每日占卜祝福'])if(!dailySurface.includes(fragment))throw new Error('Daily moon-aware layer missing: '+fragment);
for(const fragment of [
  '## Draw pool',
  '## Precise directional query',
  '## Draw entry points',
  '抽牌張數上限固定為 11',
  '### Two cards',
  '### Four cards',
  '### Six cards',
  '### Seven cards',
  '### Eight cards',
  '### Nine cards',
  '### Ten cards',
  '### OW3gs',
  '## Daily'
])if(!governance.includes(fragment))throw new Error('Draw Governance missing Current section: '+fragment);

console.log('[rune-draw] Current 66-Rune draw, exact moon-aware Situation/Daily reads, linked Rune verse grammar, flexible 2–10 card spreads, OW3gs and ritual verified');
