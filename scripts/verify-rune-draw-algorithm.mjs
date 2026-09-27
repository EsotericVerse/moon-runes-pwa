import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const engine = readFileSync(resolve(process.cwd(), 'app/lrunes/rune-draw-engine.js'), 'utf8');
const publicDraw = readFileSync(resolve(process.cwd(), 'app/lrunes/RuneDrawClient.jsx'), 'utf8');
const homeDraw = readFileSync(resolve(process.cwd(), 'app/lrunes/RunesClient.jsx'), 'utf8');
const governance = readFileSync(resolve(process.cwd(), 'docs/LUNARUNES_DRAW_GOVERNANCE.md'), 'utf8');
const semantics = readFileSync(resolve(process.cwd(), 'app/loc/model/semantic-state.mjs'), 'utf8');

const engineRequired = [
  'RUNE_DRAW_ALGORITHM_INVARIANT',
  'export function drawRunesSequentially(items,count,selectIndex=randomInt)',
  'for(let drawIndex=0;drawIndex<count;drawIndex+=1)',
  'const index=selectIndex(pool.length)',
  'const [card]=pool.splice(index,1)',
  'export function drawRuneSession(items,count)'
];
for(const fragment of engineRequired){
  if(!engine.includes(fragment))throw new Error(`Rune draw engine invariant missing required fragment: ${fragment}`);
}
for(const [name,source] of [['RuneDrawClient',publicDraw],['RunesClient',homeDraw]]){
  if(!source.includes('drawRuneSession('))throw new Error(`${name} must use shared drawRuneSession`);
}
for(const fragment of [
  "{ key: 'single', count: 1",
  "{ key: 'daily', count: 1",
  "{ key: '2card', count: 2",
  "{ key: '3card', count: 3",
  "{ key: '5card', count: 5",
  "{ key: 'ow3gs', count: 11"
]){
  if(!publicDraw.includes(fragment))throw new Error(`RuneDrawClient mode invariant missing: ${fragment}`);
}

const forbidden = [
  'function sampleUnique(',
  'pool.slice(0, count)',
  '[pool[i], pool[j]] = [pool[j], pool[i]]'
];

for(const fragment of forbidden){
  for(const [name,source] of [['engine',engine],['RuneDrawClient',publicDraw],['RunesClient',homeDraw]]){
    if(source.includes(fragment))throw new Error(`${name} forbids batch/shuffle sampling: ${fragment}`);
  }
}

const governanceRequired = [
  '特殊化保留原則',
  '單次 Draw Session 原則',
  'Daily 特殊雙卡原則',
  '補抽／解釋抽原則',
  'OW3gs 綜合模組原則',
  '源2 + 轉2 + 合2 + 五卡建議 = 11',
  'Daily 抽牌次數不限',
  '不同 Draw Session 彼此沒有排除關係',
  '四向語意判讀原則',
  '趨勢',
  '結果',
  '不使用數值權重'
];

for (const fragment of governanceRequired) {
  if (!governance.includes(fragment)) {
    throw new Error(`Rune draw governance missing required principle: ${fragment}`);
  }
}

for(const forbiddenToken of ['SPREAD_WEIGHTS','DIRECTION_FACTOR','POLARITY_SCORE','GUIDANCE_RANGES']){
  if(semantics.includes(forbiddenToken))throw new Error(`Rune semantic engine forbids weighted-score token: ${forbiddenToken}`);
}
for(const requiredToken of ['resolveStatePair','resolveSpreadState','正位','半正位','半逆位','逆位','中立','未知']){
  if(!semantics.includes(requiredToken))throw new Error(`Rune semantic engine missing discrete-state contract: ${requiredToken}`);
}

console.log('Rune draw algorithm verified: sequential draws, fixed spread grammar, and discrete four-direction semantics are present.');
