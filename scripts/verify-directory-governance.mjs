import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

const requiredRoots = ['app', 'assets', 'data', 'docs', 'scripts', 'skills', 'pics'];
for (const name of requiredRoots) {
  if (!existsSync(resolve(root, name))) failures.push(`missing canonical root: ${name}/`);
}

// Ambiguous or retired roots must not be recreated. `pics/` is intentionally retained.
// Current application JavaScript belongs under `app/`; root `js/` runtime is retired.
for (const name of [
  'images', 'image', 'pic', 'cloudflare', 'api', 'apps', 'loc8-api',
  '64images', 'icons', 'card_api', 'loc8_api', 'lib'
]) {
  if (existsSync(resolve(root, name))) failures.push(`forbidden root directory: ${name}/`);
}

// Frozen source assets. These are protected in place and must not be moved or deleted
// by directory migration. LunaRune66.xlsx is the canonical mother workbook.
for (const path of [
  'LunaRune66.xlsx',
  'LunarRunesCardCut.pdf',
]) {
  if (!existsSync(resolve(root, path))) failures.push(`missing frozen source asset: ${path}`);
}

// all.xlsx remains governed under data/source rather than repository root.
if (existsSync(resolve(root, 'all.xlsx'))) failures.push('forbidden root data file: all.xlsx');

const allowedRootJs = [];
for (const name of ['galaxy.js','quick-selector.js','rune-draw.js','rune-graph-core.js','rune.js','runes-core.js','runes-pwa-ia.js']) {
  if (existsSync(resolve(root, 'js', name))) failures.push('retired root JS runtime returned: js/' + name);
}

for (const path of [
  'scripts/build_loc4_runtime_index.py',
  'scripts/build_threads_search_index.py',
  'scripts/partition-catalog.mjs',
  'services/api/loc8/Code.gs',
  'services/api/loc8/appsscript.json'
]) {
  if (existsSync(resolve(root, path))) failures.push('retired executable architecture returned: ' + path);
}

// Remaining static-runtime roots are still migration debt until Next promotion is complete.
for (const name of ['engine', 'css']) {
  if (existsSync(resolve(root, name))) warnings.push(`${name}/ -> legacy migration debt`);
}

// Governed mirrors/runtime sources must also remain available. Do not infer that these
// copies replace or authorize removal of the frozen root originals above.
for (const path of [
  'docs/REPO_DIRECTORY_GOVERNANCE.md',
  'docs/DOMAIN_ARCHITECTURE.md',
  'assets/README.md',
  'data/lunarunes/source/LunaRune66.xlsx',
  'data/source/all.xlsx',
  'docs/LunarRunesCardCut.pdf'
]) {
  if (!existsSync(resolve(root, path))) failures.push(`missing governance/runtime asset: ${path}`);
}

if (warnings.length) console.warn('[directory-governance] migration debt:\n' + warnings.join('\n'));
if (failures.length) {
  console.error('[directory-governance] violations:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('[directory-governance] canonical roots, frozen sources and migrated-root boundaries verified');
