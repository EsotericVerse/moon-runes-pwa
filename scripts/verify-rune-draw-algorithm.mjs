import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const engine=readFileSync(resolve(process.cwd(),'app/lrunes/rune-draw-engine.js'),'utf8');
const publicDraw=readFileSync(resolve(process.cwd(),'app/lrunes/RuneDrawClient.jsx'),'utf8');
const homeDraw=readFileSync(resolve(process.cwd(),'app/lrunes/RunesClient.jsx'),'utf8');
const spread=readFileSync(resolve(process.cwd(),'app/loc/model/spread-guidance.mjs'),'utf8');
const governance=readFileSync(resolve(process.cwd(),'docs/LUNARUNES_DRAW_GOVERNANCE.md'),'utf8');
const ritual=readFileSync(resolve(process.cwd(),'app/lrunes/rune-ritual.js'),'utf8');

for(const fragment of [
  'RUNE_DRAW_ALGORITHM_INVARIANT',
  'export function drawRunesSequentially(items,count,selectIndex=randomInt)',
  'for(let drawIndex=0;drawIndex<count;drawIndex+=1)',
  'const index=selectIndex(pool.length)',
  'const [card]=pool.splice(index,1)',
  'export function drawRuneSession(items,count)'
]){
  if(!engine.includes(fragment))throw new Error(`Rune draw engine invariant missing: ${fragment}`);
}

for(const [name,source,modeToken] of [
  ['RuneDrawClient',publicDraw,"drawKey"],
  ['RunesClient',homeDraw,"modeKey"]
]){
  for(const fragment of [
    "const runePool=Array.from({length:66},(_,index)=>index+1);",
    "drawRuneSession(runePool,selectedMode.count)",
    "selectRuneDrawRows(pairs,{types})",
    "buildSpreadGuidance("
  ])if(!source.includes(fragment))throw new Error(`${name} missing precise draw contract: ${fragment}`);
  if(source.includes('resolveSpreadState('))throw new Error(`${name} must not use semantic-state as the public multi-card guidance path`);
  if(source.includes('drawRuneSession(data.runes,selectedMode.count)'))throw new Error(`${name} must not draw from a SELECT-all rune catalog`);
  if(!source.includes('RUNE_RITUAL_DELAY_MS')||!source.includes('runeRitualMessages'))throw new Error(`${name} must retain the five-second ritual`);
}

for(const fragment of [
  "return `因為\${values[0]}，所以\${values[1]}。`;",
  "return `因為\${values[0]}，但會有\${values[1]}的改變，所以\${values[2]}。`;",
  "return `因為\${values[0]}、\${values[1]}，但會有\${values[2]}的變化，所以\${values[3]}、\${values[4]}。`;",
  "return `因為（因為\${values[0]}、\${values[1]}，但會有\${values[2]}、\${values[3]}的變化，所以\${values[4]}、\${values[5]}），所以（因為\${values[6]}、\${values[7]}，但會有\${values[8]}的變化，所以\${values[9]}、\${values[10]}）。`;",
  "DOMAIN_LABELS.map(label=>({",
  "lotsByCard.map(item=>item[label])"
]){
  if(!spread.includes(fragment))throw new Error(`Spread grammar missing: ${fragment}`);
}
for(const forbidden of ['TOPIC_BY_RUNE','STATE_WORD']){
  if(spread.includes(forbidden))throw new Error(`Spread grammar must use selected direction/lots text, not synthetic semantic words: ${forbidden}`);
}

for(const fragment of ['RUNE_RITUAL_DELAY_MS=5000','RUNE_RITUAL_STEP_MS=1000']){
  if(!ritual.includes(fragment))throw new Error(`Rune ritual invariant missing: ${fragment}`);
}
for(const fragment of [
  '特殊化保留原則','單次 Draw Session 原則','Daily 特殊雙卡原則',
  '補抽／解釋抽原則','OW3gs 綜合模組原則','不同 Draw Session 彼此沒有排除關係'
]){
  if(!governance.includes(fragment))throw new Error(`Rune governance missing: ${fragment}`);
}

console.log('Rune draw verified: exact selected-ID reads, fixed 2/3/5/11 grammar, per-card lots advice, and five-second ritual are present.');
