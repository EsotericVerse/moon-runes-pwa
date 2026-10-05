import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.cwd();
const publicDraw=readFileSync(resolve(root,'app/lrunes/RuneDrawClient.jsx'),'utf8');
const governance=readFileSync(resolve(root,'docs/LUNARUNES_DRAW_GOVERNANCE.md'),'utf8');
const ritual=readFileSync(resolve(root,'app/lrunes/rune-ritual.js'),'utf8');
const guidance=readFileSync(resolve(root,'app/lrunes/rune-guidance-engine.mjs'),'utf8');
const dailySurface=readFileSync(resolve(root,'app/lrunes/RuneSingleDailySurface.jsx'),'utf8');

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
    'buildSpreadAdvice(',
    "moonTypes:['sit_q','sit_a']",
    "moonTypes:['sit_q','sit_a','daily_r','daily_g','daily_b']",
    "{column:'current_moon',operator:'eq',value:currentMoon}",
    'RUNE_RITUAL_DELAY_MS',
    'runeRitualMessages'
  ])if(!source.includes(fragment))throw new Error(name+' missing Current draw contract: '+fragment);
}
for(const source of [publicDraw]){
  for(const fragment of [
    "return `因為${parts[0]}，所以${parts[1]}。`;",
    "return `因為${parts[0]}，但會有${parts[1]}的改變，所以${parts[2]}。`;",
    "return `因為${parts[0]}、${parts[1]}，但會有${parts[2]}的變化，所以${parts[3]}、${parts[4]}。`;",
    "return `因為（因為${parts[0]}、${parts[1]}，但會有${parts[2]}、${parts[3]}的變化，所以${parts[4]}、${parts[5]}），所以（因為${parts[6]}、${parts[7]}，但會有${parts[8]}的變化，所以${parts[9]}、${parts[10]}）。`;"
  ])if(!source.includes(fragment))throw new Error('Current Rune grammar missing: '+fragment);
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
  "mode==='5card'",
  "x:[0,1]",
  "y:[3,4]"
])if(!guidance.includes(fragment))throw new Error('Rune x/y guidance missing: '+fragment);
for(const fragment of ['狀況形容','狀況表達','每日占卜提醒','每日占卜引導','每日占卜祝福'])if(!dailySurface.includes(fragment))throw new Error('Daily moon-aware layer missing: '+fragment);
for(const fragment of ['## Draw pool','## Precise directional query','### Two cards','### Three cards','### Five cards','### OW3gs','## Daily'])if(!governance.includes(fragment))throw new Error('Draw Governance missing Current section: '+fragment);
console.log('[rune-draw] Current 66-Rune draw, exact moon-aware Situation/Daily reads, x/y guidance, 2/3/5/11 grammar and ritual verified');
