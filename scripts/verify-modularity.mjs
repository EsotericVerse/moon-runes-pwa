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

// React/Next presentation must be class-driven. No component-local inline styles or colors.
walk(resolve(root, 'app'), path => {
  if (!/\.(?:js|jsx|mjs|css)$/.test(path)) return;
  const rel = relative(root, path);
  const text = readFileSync(path, 'utf8');

  if (/\.(?:js|jsx|mjs)$/.test(path) && /\bstyle\s*=\s*\{\{/.test(text)) {
    failures.push(`${rel}: inline React style`);
  }

  if (/\.css$/.test(path) && !rel.endsWith('app/styles/tokens.css')) {
    const colorMatches = text.match(/#[0-9a-fA-F]{3,8}\b|rgba?\s*\([^)]*\)/g) || [];
    for (const match of colorMatches) failures.push(`${rel}: raw color ${match}`);
  }
});

// runes.json is the only canonical rune row source for Next.
const runeAdapterPath = resolve(root, 'lib/runes.js');
const runeAdapter = readFileSync(runeAdapterPath, 'utf8');
if (!runeAdapter.includes("../data/json/core/runes.json")) {
  failures.push('lib/runes.js: must import data/json/core/runes.json');
}
if (/canonicalRows\s*=\s*\[/.test(runeAdapter)) {
  failures.push('lib/runes.js: embedded duplicate canonical rune rows');
}

// Legacy HTML is transitional. Report presentation debt without blocking the Next cutover.
for (const name of readdirSync(root).filter(name => name.endsWith('.html'))) {
  const path = resolve(root, name);
  const text = readFileSync(path, 'utf8');
  const inlineCount = (text.match(/\sstyle\s*=/g) || []).length;
  const styleTagCount = (text.match(/<style\b/gi) || []).length;
  if (inlineCount || styleTagCount) {
    warnings.push(`${name}: ${inlineCount} inline style attrs, ${styleTagCount} style tags`);
  }
}

if (warnings.length) {
  console.warn('[modularity] legacy presentation debt (non-blocking until redirect retirement):\n' + warnings.join('\n'));
}
if (failures.length) {
  console.error('[modularity] violations:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('[modularity] Next presentation/data modularity verified');
