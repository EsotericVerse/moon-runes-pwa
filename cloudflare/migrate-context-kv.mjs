import { writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const LEGACY_CONTEXT_API = 'https://script.google.com/macros/s/AKfycby_-G_G5EqwvIRguRw9DtAt-_v9953N7z9dav5UuHoRajv1IDbas0y4HqOcXXYOa2ei/exec';
const EVENTS_KEY = 'loc:context:events';
const RELATIONS_KEY = 'loc:context:relations';
const FORCE = process.argv.includes('--force');

function runCapture(args) {
  const result = spawnSync('npx', args, {
    cwd: here,
    encoding: 'utf8',
    shell: process.platform === 'win32'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `wrangler exited ${result.status}`).trim());
  }
  return String(result.stdout || '').trim();
}

function runInherit(args) {
  const result = spawnSync('npx', args, {
    cwd: here,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

function getRemoteJson(key) {
  try {
    const out = runCapture(['wrangler', 'kv', 'key', 'get', key, '--binding', 'LOC_KV', '--remote']);
    return out ? JSON.parse(out) : null;
  } catch (error) {
    const msg = String(error?.message || error);
    if (/not found|does not exist|404/i.test(msg)) return null;
    throw error;
  }
}

async function putRemoteJson(key, value, label) {
  const temp = join(tmpdir(), `loc-context-kv-${label}-${process.pid}-${Date.now()}.json`);
  await writeFile(temp, JSON.stringify(value));
  try {
    runInherit(['wrangler', 'kv', 'key', 'put', key, '--path', temp, '--binding', 'LOC_KV', '--remote']);
  } finally {
    await rm(temp, { force: true });
  }
}

async function fetchLegacy(action) {
  const url = new URL(LEGACY_CONTEXT_API);
  url.searchParams.set('action', action);
  url.searchParams.set('user_id', 'lo3rwang');
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Legacy ${action} fetch failed: HTTP ${response.status}`);
  const data = await response.json();
  return action === 'relations'
    ? (Array.isArray(data) ? data : (data.relations || []))
    : (Array.isArray(data) ? data : (data.events || []));
}

function countRows(doc, field) {
  return Array.isArray(doc?.[field]) ? doc[field].length : 0;
}

async function verifyCrudOnEvents() {
  const original = getRemoteJson(EVENTS_KEY) || { schema_version: 'kv-1', updated_at: '', events: [] };
  const backup = JSON.stringify(original);
  const id = `KV-CRUD-TEST-${Date.now()}`;

  try {
    const created = structuredClone(original);
    created.events = Array.isArray(created.events) ? created.events : [];
    created.events.push({
      id,
      user_id: 'lo3rwang',
      date: '2099-01-01',
      event_type: 'test',
      event_title: 'KV CRUD TEST CREATE',
      object_type: 'system',
      object_id: 'LOC',
      description: 'temporary verification row',
      state_before: '',
      state_after: 'created',
      era: '',
      status: 'current',
      confidence: 'recorded'
    });
    created.updated_at = new Date().toISOString();
    await putRemoteJson(EVENTS_KEY, created, 'crud-create');
    let remote = getRemoteJson(EVENTS_KEY);
    if (!remote?.events?.some(x => String(x.id) === id && x.state_after === 'created')) {
      throw new Error('CRUD create verification failed');
    }

    const edited = structuredClone(remote);
    const row = edited.events.find(x => String(x.id) === id);
    row.event_title = 'KV CRUD TEST EDIT';
    row.state_after = 'edited';
    edited.updated_at = new Date().toISOString();
    await putRemoteJson(EVENTS_KEY, edited, 'crud-edit');
    remote = getRemoteJson(EVENTS_KEY);
    if (!remote?.events?.some(x => String(x.id) === id && x.state_after === 'edited' && x.event_title === 'KV CRUD TEST EDIT')) {
      throw new Error('CRUD edit verification failed');
    }

    const deleted = structuredClone(remote);
    deleted.events = deleted.events.filter(x => String(x.id) !== id);
    deleted.updated_at = new Date().toISOString();
    await putRemoteJson(EVENTS_KEY, deleted, 'crud-delete');
    remote = getRemoteJson(EVENTS_KEY);
    if (remote?.events?.some(x => String(x.id) === id)) {
      throw new Error('CRUD delete verification failed');
    }

    console.log('CRUD verification: CREATE ✓  EDIT ✓  DELETE ✓');
  } finally {
    await putRemoteJson(EVENTS_KEY, JSON.parse(backup), 'crud-restore');
  }
}

const existingEvents = getRemoteJson(EVENTS_KEY);
const existingRelations = getRemoteJson(RELATIONS_KEY);
const existingEventCount = countRows(existingEvents, 'events');
const existingRelationCount = countRows(existingRelations, 'relations');

if (!FORCE && (existingEventCount > 0 || existingRelationCount > 0)) {
  throw new Error(
    `Context KV already contains data (events=${existingEventCount}, relations=${existingRelationCount}). ` +
    'Migration stopped to avoid overwrite. Use --force only after comparing the existing KV data.'
  );
}

console.log('Reading legacy Google Sheets data once for migration ...');
const [legacyEvents, legacyRelations] = await Promise.all([
  fetchLegacy('events'),
  fetchLegacy('relations')
]);

const eventsDoc = {
  schema_version: 'kv-1',
  migrated_from: 'google-sheets',
  migrated_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  events: legacyEvents
};
const relationsDoc = {
  schema_version: 'kv-1',
  migrated_from: 'google-sheets',
  migrated_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  relations: legacyRelations
};

console.log(`Legacy counts: events=${legacyEvents.length}, relations=${legacyRelations.length}`);
await putRemoteJson(EVENTS_KEY, eventsDoc, 'events-migration');
await putRemoteJson(RELATIONS_KEY, relationsDoc, 'relations-migration');

const migratedEvents = getRemoteJson(EVENTS_KEY);
const migratedRelations = getRemoteJson(RELATIONS_KEY);
const migratedEventCount = countRows(migratedEvents, 'events');
const migratedRelationCount = countRows(migratedRelations, 'relations');

if (migratedEventCount !== legacyEvents.length) {
  throw new Error(`Event count mismatch: legacy=${legacyEvents.length}, KV=${migratedEventCount}`);
}
if (migratedRelationCount !== legacyRelations.length) {
  throw new Error(`Relation count mismatch: legacy=${legacyRelations.length}, KV=${migratedRelationCount}`);
}

console.log(`Migration count verification: events=${migratedEventCount} ✓, relations=${migratedRelationCount} ✓`);
await verifyCrudOnEvents();
console.log('Context KV migration and CRUD verification complete. No test row remains.');
