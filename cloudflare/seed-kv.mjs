import { readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const eraPath = join(repoRoot, 'data', 'json', 'registries', 'LOC_ERA_REGISTRY.json');
const dailyPath = join(repoRoot, 'data', 'json', 'registries', 'LOC8_DAILY_RUNE_REPO_HISTORY.json');
const LEGACY_CONTEXT_API = 'https://script.google.com/macros/s/AKfycby_-G_G5EqwvIRguRw9DtAt-_v9953N7z9dav5UuHoRajv1IDbas0y4HqOcXXYOa2ei/exec';

const era = JSON.parse(await readFile(eraPath, 'utf8'));
const daily = JSON.parse(await readFile(dailyPath, 'utf8'));

if (!Array.isArray(era.eras) || !era.eras.length) {
  throw new Error('ERA registry has no eras');
}
if (!Array.isArray(daily.daily_draws) || !daily.daily_draws.length) {
  throw new Error('Daily rune history has no daily_draws');
}

async function fetchLegacy(action) {
  const url = new URL(LEGACY_CONTEXT_API);
  url.searchParams.set('action', action);
  url.searchParams.set('user_id', 'lo3rwang');
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Legacy ${action} fetch failed: HTTP ${response.status}`);
  const data = await response.json();
  if (action === 'relations') return Array.isArray(data) ? data : (data.relations || []);
  return Array.isArray(data) ? data : (data.events || []);
}

const [legacyEvents, legacyRelations] = await Promise.all([
  fetchLegacy('events'),
  fetchLegacy('relations')
]);

const dailyIndex = {
  schema_version: 'kv-1',
  updated_at: new Date().toISOString(),
  daily_draws: daily.daily_draws
};
const contextEvents = {
  schema_version: 'kv-1',
  updated_at: new Date().toISOString(),
  events: legacyEvents
};
const contextRelations = {
  schema_version: 'kv-1',
  updated_at: new Date().toISOString(),
  relations: legacyRelations
};

const stamp = `${process.pid}-${Date.now()}`;
const eraTemp = join(tmpdir(), `loc-era-seed-${stamp}.json`);
const dailyIndexTemp = join(tmpdir(), `loc-daily-index-${stamp}.json`);
const contextEventsTemp = join(tmpdir(), `loc-context-events-seed-${stamp}.json`);
const contextRelationsTemp = join(tmpdir(), `loc-context-relations-seed-${stamp}.json`);

await Promise.all([
  writeFile(eraTemp, JSON.stringify(era)),
  writeFile(dailyIndexTemp, JSON.stringify(dailyIndex)),
  writeFile(contextEventsTemp, JSON.stringify(contextEvents)),
  writeFile(contextRelationsTemp, JSON.stringify(contextRelations))
]);

function run(args) {
  const result = spawnSync('npx', args, {
    cwd: here,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

try {
  console.log(`Seeding ${era.eras.length} ERA rows to loc:era:registry ...`);
  run(['wrangler', 'kv', 'key', 'put', 'loc:era:registry', '--path', eraTemp, '--binding', 'LOC_KV', '--remote']);

  console.log(`Seeding ${daily.daily_draws.length} daily rune rows to loc:daily-rune:index ...`);
  run(['wrangler', 'kv', 'key', 'put', 'loc:daily-rune:index', '--path', dailyIndexTemp, '--binding', 'LOC_KV', '--remote']);

  console.log(`Migrating ${legacyEvents.length} context events to loc:context:events ...`);
  run(['wrangler', 'kv', 'key', 'put', 'loc:context:events', '--path', contextEventsTemp, '--binding', 'LOC_KV', '--remote']);

  console.log(`Migrating ${legacyRelations.length} context relations to loc:context:relations ...`);
  run(['wrangler', 'kv', 'key', 'put', 'loc:context:relations', '--path', contextRelationsTemp, '--binding', 'LOC_KV', '--remote']);

  console.log(`KV seed complete. ERA=${era.eras.length}, Daily=${daily.daily_draws.length}, Events=${legacyEvents.length}, Relations=${legacyRelations.length}`);
} finally {
  await Promise.allSettled([
    rm(eraTemp, { force: true }),
    rm(dailyIndexTemp, { force: true }),
    rm(contextEventsTemp, { force: true }),
    rm(contextRelationsTemp, { force: true })
  ]);
}
