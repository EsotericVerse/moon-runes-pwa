import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

const requiredRoots = ['app', 'assets', 'data', 'docs', 'js', 'scripts', 'services', 'skills', 'pics'];
for (const name of requiredRoots) {
  if (!existsSync(resolve(root, name))) failures.push(`missing canonical root: ${name}/`);
}

// Ambiguous or retired roots must not be recreated. `pics/` is intentionally retained
// for approved source diagrams; JavaScript belongs in `js/`, never `lib/`.
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
  'pics/LOC-FrameworkPic.png',
  'pics/LOC-structure.png'
]) {
  if (!existsSync(resolve(root, path))) failures.push(`missing frozen source asset: ${path}`);
}

// all.xlsx remains governed under data/source rather than repository root.
if (existsSync(resolve(root, 'all.xlsx'))) failures.push('forbidden root data file: all.xlsx');

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
  'services/README.md',
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
