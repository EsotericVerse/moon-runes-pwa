import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const canonical = resolve(root, 'data/json/core/runes.json');
if (!existsSync(canonical)) {
  console.error('[data-policy] missing canonical data/json/core/runes.json');
  process.exit(1);
}

const runes = JSON.parse(readFileSync(canonical, 'utf8'));
if (!Array.isArray(runes) || runes.length < 66) {
  console.error(`[data-policy] canonical runes.json must be an array with at least 66 rows; got ${Array.isArray(runes) ? runes.length : 'non-array'}`);
  process.exit(1);
}

const ids = new Set(runes.map(row => Number(row.編號)));
for (let id = 1; id <= 66; id += 1) {
  if (!ids.has(id)) {
    console.error(`[data-policy] canonical runes.json missing rune id ${id}`);
    process.exit(1);
  }
}

const scanRoots = ['app', 'lib'].map(path => resolve(root, path));
const forbidden = [
  /runes64\.json\b/gi,
  /runes66\.json\b/gi,
  /runes64\.js\b/gi,
  /runes66\.js\b/gi,
  /(?:data\/json\/core\/)?runes\.json\b/g
];
const allowedCanonicalRefs = new Set([
  'app/loc/data.js',
  'lib/runes.js'
]);
const hits = [];

function walk(dir) {
  if (!statSync(dir, { throwIfNoEntry: false })) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (/\.(?:js|jsx|mjs)$/.test(name)) {
      const rel = relative(root, path).replaceAll('\\', '/');
      const text = readFileSync(path, 'utf8');
      for (const rule of forbidden) {
        rule.lastIndex = 0;
        for (const match of text.matchAll(rule)) {
          if (match[0].includes('runes.json') && allowedCanonicalRefs.has(rel)) continue;
          hits.push(`${rel}: ${match[0]}`);
        }
      }
    }
  }
}

scanRoots.forEach(walk);
if (hits.length) {
  console.error('[data-policy] duplicate/legacy rune runtime references found:\n' + hits.join('\n'));
  process.exit(1);
}
console.log(`[data-policy] canonical runes.json verified (${runes.length} rows); runtime references are centralized`);
