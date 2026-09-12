import { writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const LEGACY_CONTEXT_API = 'https://script.google.com/macros/s/AKfycby_-G_G5EqwvIRguRw9DtAt-_v9953N7z9dav5UuHoRajv1IDbas0y4HqOcXXYOa2ei/exec';
const EVENTS_KEY = 'loc:context:events';
const RELATIONS_KEY = 'loc:context:relations';
const FORCE = process.argv.includes('--force');

function runCapture(args) {
  const result = spawnSync('npx', args, {
    cwd: repoRoot,
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
    cwd: repoRoot,
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

async function verifyEventCrud() {
  const original = getRemoteJson(EVENTS_KEY) || { schema_version: 'kv-1', updated_at: '', events: [] };
  const backup = JSON.stringify(original);
  const id = `KV-EVENT-CRUD-TEST-${Date.now()}`;

  try {
    const created = structuredClone(original);
    created.events = Array.isArray(created.events) ? created.events : [];
    created.events.push({
      id,
      user_id: 'lo3rwang',
      date: '2099-01-01',
      event_type: 'test',
      event_title: 'KV EVENT CRUD TEST CREATE',
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
    await putRemoteJson(EVENTS_KEY, created, 'event-create');
    let remote = getRemoteJson(EVENTS_KEY);
    if (!remote?.events?.some(x => String(x.id) === id && x.state_after === 'created')) {
      throw new Error('Event CREATE verification failed');
    }

    const edited = structuredClone(remote);
    const row = edited.events.find(x => String(x.id) === id);
    row.event_title = 'KV EVENT CRUD TEST EDIT';
    row.state_after = 'edited';
    edited.updated_at = new Date().toISOString();
    await putRemoteJson(EVENTS_KEY, edited, 'event-edit');
    remote = getRemoteJson(EVENTS_KEY);
    if (!remote?.events?.some(x => String(x.id) === id && x.state_after === 'edited' && x.event_title === 'KV EVENT CRUD TEST EDIT')) {
      throw new Error('Event EDIT verification failed');
    }

    const deleted = structuredClone(remote);
    deleted.events = deleted.events.filter(x => String(x.id) !== id);
    deleted.updated_at = new Date().toISOString();
    await putRemoteJson(EVENTS_KEY, deleted, 'event-delete');
    remote = getRemoteJson(EVENTS_KEY);
    if (remote?.events?.some(x => String(x.id) === id)) {
      throw new Error('Event DELETE verification failed');
    }

    console.log('Event CRUD: CREATE ✓  EDIT ✓  DELETE ✓');
  } finally {
    await putRemoteJson(EVENTS_KEY, JSON.parse(backup), 'event-restore');
  }
}

async function verifyRelationCrud() {
  const original = getRemoteJson(RELATIONS_KEY) || { schema_version: 'kv-1', updated_at: '', relations: [] };
  const backup = JSON.stringify(original);
  const id = `KV-RELATION-CRUD-TEST-${Date.now()}`;

  try {
    const created = structuredClone(original);
    created.relations = Array.isArray(created.relations) ? created.relations : [];
    created.relations.push({
      id,
      user_id: 'lo3rwang',
      date: '2099-01-01',
      relation_type: 'references',
      source_type: 'system',
      source_id: 'LOC',
      target_type: 'system',
      target_id: 'KV-CRUD-TEST',
      direction: 'forward',
      confidence: 'recorded',
      summary: 'created',
      era: '',
      status: 'current',
      evidence: 'temporary verification row'
    });
    created.updated_at = new Date().toISOString();
    await putRemoteJson(RELATIONS_KEY, created, 'relation-create');
    let remote = getRemoteJson(RELATIONS_KEY);
    if (!remote?.relations?.some(x => String(x.id) === id && x.summary === 'created')) {
      throw new Error('Relation CREATE verification failed');
    }

    const edited = structuredClone(remote);
    const row = edited.relations.find(x => String(x.id) === id);
    row.summary = 'edited';
    row.target_id = 'KV-CRUD-TEST-EDITED';
    edited.updated_at = new Date().toISOString();
    await putRemoteJson(RELATIONS_KEY, edited, 'relation-edit');
    remote = getRemoteJson(RELATIONS_KEY);
    if (!remote?.relations?.some(x => String(x.id) === id && x.summary === 'edited' && x.target_id === 'KV-CRUD-TEST-EDITED')) {
      throw new Error('Relation EDIT verification failed');
    }

    const deleted = structuredClone(remote);
    deleted.relations = deleted.relations.filter(x => String(x.id) !== id);
    deleted.updated_at = new Date().toISOString();
    await putRemoteJson(RELATIONS_KEY, deleted, 'relation-delete');
    remote = getRemoteJson(RELATIONS_KEY);
    if (remote?.relations?.some(x => String(x.id) === id)) {
      throw new Error('Relation DELETE verification failed');
    }

    console.log('Relation CRUD: CREATE ✓  EDIT ✓  DELETE ✓');
  } finally {
    await putRemoteJson(RELATIONS_KEY, JSON.parse(backup), 'relation-restore');
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

const migratedAt = new Date().toISOString();
const eventsDoc = {
  schema_version: 'kv-1',
  migrated_from: 'google-sheets',
  migrated_at: migratedAt,
  updated_at: migratedAt,
  events: legacyEvents
};
const relationsDoc = {
  schema_version: 'kv-1',
  migrated_from: 'google-sheets',
  migrated_at: migratedAt,
  updated_at: migratedAt,
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
await verifyEventCrud();
await verifyRelationCrud();
console.log('Context KV migration and CRUD verification complete. No test rows remain.');
