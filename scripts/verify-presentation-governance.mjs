import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const scanRoots = ['app'].map(path => resolve(root, path));
const hits = [];

const rules = [
  { name: 'inline style prop', re: /\bstyle\s*=\s*\{\{/g },
  { name: 'inline style tag', re: /<style\b/gi },
  { name: 'hard-coded JSX color', re: /(?:color|background(?:Color)?|border(?:Color)?|boxShadow)\s*:\s*['"`]\s*(?:#(?:[0-9a-f]{3,8})\b|rgba?\(|hsla?\()/gi }
];

function walk(dir) {
  if (!statSync(dir, { throwIfNoEntry: false })) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (/\.(?:js|jsx|mjs)$/.test(name)) {
      const text = readFileSync(path, 'utf8');
      for (const rule of rules) {
        rule.re.lastIndex = 0;
        for (const match of text.matchAll(rule.re)) {
          const line = text.slice(0, match.index).split('\n').length;
          hits.push(`${relative(root, path)}:${line} ${rule.name}`);
        }
      }
    }
  }
}

scanRoots.forEach(walk);
if (hits.length) {
  console.error('[presentation-governance] presentation leaked into JSX/JS:\n' + hits.join('\n'));
  process.exit(1);
}
console.log('[presentation-governance] app presentation is CSS-controlled; no inline style/color blocks found');
