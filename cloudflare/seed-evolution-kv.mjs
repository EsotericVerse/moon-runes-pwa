import { readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const registryDir = join(repoRoot, 'data', 'json', 'registries');

const sources = [
  {
    label: 'shared evolution registry',
    path: join(registryDir, 'LOC_EVOLUTION_SHARED_REGISTRY.json'),
    key: 'loc:evolution:shared'
  },
  {
    label: 'LunaRunes evolution history',
    path: join(registryDir, 'LUNARUNE_EVOLUTION_HISTORY.json'),
    key: 'loc:evolution:runes'
  },
  {
    label: 'language evolution registry',
    path: join(registryDir, 'LOC_LANGUAGE_EVOLUTION_REGISTRY.json'),
    key: 'loc:evolution:language'
  }
];

const stamp = `${process.pid}-${Date.now()}`;
const temps = [];

function run(args) {
  const result = spawnSync('npx', args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

try {
  for (const source of sources) {
    const raw = await readFile(source.path, 'utf8');
    const data = JSON.parse(raw);
    const body = {
      schema_version: 'kv-1',
      updated_at: new Date().toISOString(),
      source_registry: source.path.slice(repoRoot.length + 1).replaceAll('\\', '/'),
      data
    };
    const temp = join(tmpdir(), `loc-evolution-${stamp}-${source.key.split(':').at(-1)}.json`);
    temps.push(temp);
    await writeFile(temp, JSON.stringify(body));
    console.log(`Seeding ${source.label} to ${source.key} ...`);
    run(['wrangler', 'kv', 'key', 'put', source.key, '--path', temp, '--binding', 'LOC_KV', '--remote']);
  }
  console.log('Evolution KV seed complete.');
} finally {
  await Promise.allSettled(temps.map(path => rm(path, { force: true })));
}
