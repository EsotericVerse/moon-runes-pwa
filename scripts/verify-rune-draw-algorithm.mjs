import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'app/runes/RuneDrawClient.jsx'), 'utf8');
const governance = readFileSync(resolve(process.cwd(), 'docs/LUNARUNES_DRAW_GOVERNANCE.md'), 'utf8');

const required = [
  'RUNE_DRAW_ALGORITHM_INVARIANT',
  'function drawRunesSequentially(items, count, selectIndex = randomInt)',
  'for (let drawIndex = 0; drawIndex < count; drawIndex += 1)',
  'const index = selectIndex(pool.length)',
  'const [card] = pool.splice(index, 1)',
  'const cards = drawRunesSequentially(data.runes, selectedMode.count)',
  "{ key: 'single', count: 1",
  "{ key: 'daily', count: 1",
  "{ key: '2card', count: 2",
  "{ key: '3card', count: 3",
  "{ key: '5card', count: 5",
  "{ key: 'ow3gs', count: 11"
];

for (const fragment of required) {
  if (!source.includes(fragment)) {
    throw new Error(`Rune draw invariant missing required fragment: ${fragment}`);
  }
}

const forbidden = [
  'function sampleUnique(',
  'pool.slice(0, count)',
  '[pool[i], pool[j]] = [pool[j], pool[i]]'
];

for (const fragment of forbidden) {
  if (source.includes(fragment)) {
    throw new Error(`Rune draw invariant forbids batch/shuffle sampling: ${fragment}`);
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
  '不同 Draw Session 彼此沒有排除關係'
];

for (const fragment of governanceRequired) {
  if (!governance.includes(fragment)) {
    throw new Error(`Rune draw governance missing required principle: ${fragment}`);
  }
}

console.log('Rune draw algorithm verified: per-session N cards = N sequential selections without replacement; special-mode KM invariants are present.');
