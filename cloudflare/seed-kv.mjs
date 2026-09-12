import { readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const eraPath = join(repoRoot, 'data', 'json', 'registries', 'LOC_ERA_REGISTRY.json');
const dailyPath = join(repoRoot, 'data', 'json', 'registries', 'LOC8_DAILY_RUNE_REPO_HISTORY.json');

const era = JSON.parse(await readFile(eraPath, 'utf8'));
const daily = JSON.parse(await readFile(dailyPath, 'utf8'));

if (!Array.isArray(era.eras) || !era.eras.length) {
  throw new Error('ERA registry has no eras');
}
if (!Array.isArray(daily.daily_draws) || !daily.daily_draws.length) {
  throw new Error('Daily rune history has no daily_draws');
}

const dailyIndex = {
  schema_version: 'kv-1',
  updated_at: new Date().toISOString(),
  daily_draws: daily.daily_draws
};

const stamp = `${process.pid}-${Date.now()}`;
const eraTemp = join(tmpdir(), `loc-era-seed-${stamp}.json`);
const dailyIndexTemp = join(tmpdir(), `loc-daily-index-${stamp}.json`);
await writeFile(eraTemp, JSON.stringify(era));
await writeFile(dailyIndexTemp, JSON.stringify(dailyIndex));

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
function run(args) {
  const result = spawnSync(npx, args, {
    cwd: here,
    stdio: 'inherit',
    shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

try {
  console.log(`Seeding ${era.eras.length} ERA rows to loc:era:registry ...`);
  run(['wrangler', 'kv', 'key', 'put', 'loc:era:registry', '--path', eraTemp, '--binding', 'LOC_KV', '--remote']);

  console.log(`Seeding ${daily.daily_draws.length} daily rune rows to loc:daily-rune:index ...`);
  run(['wrangler', 'kv', 'key', 'put', 'loc:daily-rune:index', '--path', dailyIndexTemp, '--binding', 'LOC_KV', '--remote']);

  console.log('KV seed complete.');
} finally {
  await Promise.allSettled([
    rm(eraTemp, { force: true }),
    rm(dailyIndexTemp, { force: true })
  ]);
}
