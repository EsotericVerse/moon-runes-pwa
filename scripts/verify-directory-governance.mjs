import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

const requiredRoots = ['app', 'assets', 'data', 'docs', 'lib', 'scripts', 'services', 'skills'];
for (const name of requiredRoots) {
  if (!existsSync(resolve(root, name))) failures.push(`missing canonical root: ${name}/`);
}

// Ambiguous or already-migrated roots must not be recreated.
for (const name of [
  'images', 'image', 'pic', 'cloudflare', 'api', 'apps', 'loc8-api',
  '64images', 'pics', 'icons', 'card_api', 'loc8_api'
]) {
  if (existsSync(resolve(root, name))) failures.push(`forbidden root directory: ${name}/`);
}

// Mother/source spreadsheets belong under governed data roots, not repository root.
for (const name of ['LunaRune66.xlsx', 'all.xlsx']) {
  if (existsSync(resolve(root, name))) failures.push(`forbidden root data file: ${name}`);
}

// Remaining static-runtime roots are still migration debt until Next promotion is complete.
for (const name of ['engine', 'css', 'js']) {
  if (existsSync(resolve(root, name))) warnings.push(`${name}/ -> legacy migration debt`);
}

// Only files that are operational governance contracts are mandatory Markdown.
// Public site maps, release narratives and user-facing KM belong in routes/structured data.
for (const path of [
  'docs/REPO_DIRECTORY_GOVERNANCE.md',
  'docs/DOMAIN_ARCHITECTURE.md',
  'assets/README.md',
  'services/README.md',
  'data/lunarunes/source/LunaRune66.xlsx',
  'data/source/all.xlsx'
]) {
  if (!existsSync(resolve(root, path))) failures.push(`missing governance file: ${path}`);
}

if (warnings.length) console.warn('[directory-governance] migration debt:\n' + warnings.join('\n'));
if (failures.length) {
  console.error('[directory-governance] violations:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('[directory-governance] canonical roots and migrated-root boundaries verified');
