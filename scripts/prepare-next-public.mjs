import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');

const allow = [
  ['assets/lunarunes/cards', 'assets/lunarunes/cards'],
  ['assets/lunarunes/reference', 'assets/lunarunes/reference'],
  ['assets/site/diagrams', 'assets/site/diagrams'],
  ['assets/site/icons', 'assets/site/icons'],
  ['data/html/runes-beginner.html', 'data/html/runes-beginner.html'],
  ['data/json/core', 'data/json/core'],
  ['data/json/derived', 'data/json/derived'],
  ['data/json/generated/search', 'data/json/generated/search'],
  ['data/json/registries', 'data/json/registries'],
  ['data/json/search/faq', 'data/json/search/faq'],
  ['data/json/search/loc3', 'data/json/search/loc3'],
  ['docs/LOC_Canon_1.0.docx', 'docs/LOC_Canon_1.0.docx'],
  ['apple-touch-icon.png', 'apple-touch-icon.png'],
  ['favicon.ico', 'favicon.ico'],
  ['manifest.json', 'manifest.json']
];

await rm(PUBLIC, { recursive: true, force: true });
await mkdir(PUBLIC, { recursive: true });

for (const [sourceRel, targetRel] of allow) {
  const source = path.join(ROOT, sourceRel);
  const target = path.join(PUBLIC, targetRel);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}

console.log(`Prepared Next public payload with ${allow.length} allowlisted sources.`);
