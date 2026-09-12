import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

function walk(dir, callback) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, callback);
    else callback(path);
  }
}

// React/Next presentation must be class-driven. No component-local inline styles/colors.
walk(resolve(root, 'app'), path => {
  if (!/\.(?:js|jsx|mjs|css)$/.test(path)) return;
  const rel = relative(root, path).replaceAll('\\', '/');
  const text = readFileSync(path, 'utf8');

  if (/\.(?:js|jsx|mjs)$/.test(path)) {
    if (/\bstyle\s*=\s*\{\{/.test(text)) failures.push(`${rel}: inline React style`);
    if (/<style\b/i.test(text)) failures.push(`${rel}: inline style tag`);
  }

  if (/\.css$/.test(path) && rel !== 'app/styles/tokens.css') {
    const colorMatches = text.match(/#[0-9a-fA-F]{3,8}\b|rgba?\s*\([^)]*\)|hsla?\s*\([^)]*\)/g) || [];
    for (const match of colorMatches) failures.push(`${rel}: raw color ${match}`);
  }
});

// runes.json is the only canonical rune row source.
const canonicalPath = resolve(root, 'data/json/core/runes.json');
if (!existsSync(canonicalPath)) {
  failures.push('data/json/core/runes.json: missing canonical rune source');
} else {
  try {
    const rows = JSON.parse(readFileSync(canonicalPath, 'utf8'));
    if (!Array.isArray(rows) || rows.length < 66) failures.push(`data/json/core/runes.json: expected at least 66 rows, got ${Array.isArray(rows) ? rows.length : 'non-array'}`);
    else {
      const ids = new Set(rows.map(row => Number(row.編號)));
      for (let id = 1; id <= 66; id += 1) if (!ids.has(id)) failures.push(`data/json/core/runes.json: missing rune id ${id}`);
    }
  } catch (error) {
    failures.push(`data/json/core/runes.json: invalid JSON (${error.message})`);
  }
}

const runeAdapterPath = resolve(root, 'lib/runes.js');
const runeAdapter = readFileSync(runeAdapterPath, 'utf8');
if (!runeAdapter.includes("../data/json/core/runes.json")) failures.push('lib/runes.js: must import data/json/core/runes.json');
if (/canonicalRows\s*=\s*\[/.test(runeAdapter)) failures.push('lib/runes.js: embedded duplicate canonical rune rows');

const allowedCanonicalRefs = new Set(['app/loc/data.js', 'lib/runes.js']);
walk(resolve(root, 'app'), path => {
  if (!/\.(?:js|jsx|mjs)$/.test(path)) return;
  const rel = relative(root, path).replaceAll('\\', '/');
  const text = readFileSync(path, 'utf8');
  if (/runes(?:64|66)\.(?:js|json)\b/i.test(text)) failures.push(`${rel}: legacy rune projection reference`);
  if (!allowedCanonicalRefs.has(rel) && /data\/json\/core\/runes\.json\b/.test(text)) failures.push(`${rel}: canonical runes path must go through shared data/adapter module`);
});
walk(resolve(root, 'lib'), path => {
  if (!/\.(?:js|jsx|mjs)$/.test(path)) return;
  const rel = relative(root, path).replaceAll('\\', '/');
  const text = readFileSync(path, 'utf8');
  if (/runes(?:64|66)\.(?:js|json)\b/i.test(text)) failures.push(`${rel}: legacy rune projection reference`);
  if (!allowedCanonicalRefs.has(rel) && /data\/json\/core\/runes\.json\b/.test(text)) failures.push(`${rel}: canonical runes path must go through shared data/adapter module`);
});

// Legacy HTML remains transitional. Report presentation debt until those files become redirects/deleted.
for (const name of readdirSync(root).filter(name => name.endsWith('.html'))) {
  const path = resolve(root, name);
  const text = readFileSync(path, 'utf8');
  const inlineCount = (text.match(/\sstyle\s*=/g) || []).length;
  const styleTagCount = (text.match(/<style\b/gi) || []).length;
  if (inlineCount || styleTagCount) warnings.push(`${name}: ${inlineCount} inline style attrs, ${styleTagCount} style tags`);
}

if (warnings.length) console.warn('[modularity] legacy presentation debt (non-blocking until redirect retirement):\n' + warnings.join('\n'));
if (failures.length) {
  console.error('[modularity] violations:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('[modularity] Next presentation/data modularity verified');
