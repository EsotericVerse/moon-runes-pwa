import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

const requiredRoots = ['app', 'assets', 'data', 'docs', 'lib', 'scripts', 'services', 'skills'];
for (const name of requiredRoots) {
  if (!existsSync(resolve(root, name))) failures.push(`missing canonical root: ${name}/`);
}

// These aliases are intentionally forbidden for new root-level use.
for (const name of ['images', 'image', 'pic', 'cloudflare', 'api', 'apps', 'loc8-api']) {
  if (existsSync(resolve(root, name))) failures.push(`ambiguous root directory is forbidden: ${name}/`);
}

// Legacy roots remain temporarily while consumers are migrated.
for (const name of ['64images', 'pics', 'icons', 'card_api', 'loc8_api', 'engine', 'css', 'js']) {
  if (existsSync(resolve(root, name))) warnings.push(`${name}/ -> legacy migration debt`);
}

const cardApi = resolve(root, 'card_api');
if (existsSync(cardApi)) {
  for (const name of readdirSync(cardApi)) {
    const path = resolve(cardApi, name);
    if (statSync(path).isFile() && /\.(?:md|mdx)$/i.test(name)) {
      failures.push(`API documentation must live under docs/api/: card_api/${name}`);
    }
  }
}

for (const path of [
  'docs/REPO_DIRECTORY_GOVERNANCE.md',
  'docs/DOMAIN_ARCHITECTURE.md',
  'docs/SITE_MAP.md',
  'assets/README.md',
  'services/README.md'
]) {
  if (!existsSync(resolve(root, path))) failures.push(`missing governance file: ${path}`);
}

if (warnings.length) console.warn('[directory-governance] migration debt:\n' + warnings.join('\n'));
if (failures.length) {
  console.error('[directory-governance] violations:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('[directory-governance] canonical roots and migration boundaries verified');
