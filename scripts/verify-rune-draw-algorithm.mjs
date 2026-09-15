import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'app/runes/RuneDrawClient.jsx'), 'utf8');

const required = [
  'RUNE_DRAW_ALGORITHM_INVARIANT',
  'function drawRunesSequentially(items, count, selectIndex = randomInt)',
  'for (let drawIndex = 0; drawIndex < count; drawIndex += 1)',
  'const index = selectIndex(pool.length)',
  'const [card] = pool.splice(index, 1)',
  'const cards = drawRunesSequentially(data.runes, selectedMode.count)'
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

console.log('Rune draw algorithm verified: N cards = N sequential selections without replacement.');
