import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const engine=readFileSync(resolve(process.cwd(),'app/lrunes/rune-draw-engine.js'),'utf8');
const publicDraw=readFileSync(resolve(process.cwd(),'app/lrunes/RuneDrawClient.jsx'),'utf8');
const homeDraw=readFileSync(resolve(process.cwd(),'app/lrunes/RunesClient.jsx'),'utf8');
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
    "buildFixedReading(",
    "composeFixedGrammar("
  ])if(!source.includes(fragment))throw new Error(`${name} missing precise draw contract: ${fragment}`);
  if(source.includes('resolveSpreadState('))throw new Error(`${name} must not use semantic-state as the public multi-card guidance path`);
  if(source.includes('drawRuneSession(data.runes,selectedMode.count)'))throw new Error(`${name} must not draw from a SELECT-all rune catalog`);
  if(!source.includes('RUNE_RITUAL_DELAY_MS')||!source.includes('runeRitualMessages'))throw new Error(`${name} must retain the five-second ritual`);
}

for(const source of [publicDraw,homeDraw]){
  for(const fragment of [
    "return \`因為${parts[0]}，所以${parts[1]}。\`;",
    "return \`因為${parts[0]}，但會有${parts[1]}的改變，所以${parts[2]}。\`;",
    "return \`因為${parts[0]}、${parts[1]}，但會有${parts[2]}的變化，所以${parts[3]}、${parts[4]}。\`;",
    "return \`因為（因為${parts[0]}、${parts[1]}，但會有${parts[2]}、${parts[3]}的變化，所以${parts[4]}、${parts[5]}），所以（因為${parts[6]}、${parts[7]}，但會有${parts[8]}的變化，所以${parts[9]}、${parts[10]}）。\`;"
  ])if(!source.includes(fragment))throw new Error(`Fixed rune grammar missing: ${fragment}`);
  for(const forbidden of ['semantic-state','spread-guidance','resolveSpreadState','buildSpreadGuidance'])if(source.includes(forbidden))throw new Error(`Public draw must not use semantic rendering layer: ${forbidden}`);
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

console.log('Rune draw verified: exact selected-ID reads, fixed 2/3/5/11 structural grammar, direct lots text, and five-second ritual are present.');
