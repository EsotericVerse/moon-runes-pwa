import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { LOC_DATA } from '../app/loc/data-paths.mjs';

const root = process.cwd();
const publicRoot = resolve(root, 'public');
const failures = [];
const maxRuntimeJsonBytes = Number(process.env.LOC_CI_MAX_RUNTIME_JSON_BYTES || 512 * 1024 * 1024);
const partitionScopeFields = new Set(['person', 'family', 'generation', 'era', 'source', 'corpus', 'language', 'culture']);
const scopeRequiredDatasets = new Set(['loc4-text-corpus', 'loc3-lyrics-search']);
const maxRoutingPrefixShards = 8;

function normalizeRepoPath(value) {
  return String(value || '').replace(/^\/+/, '').replaceAll('\\', '/');
}

function expectedTier(path) {
  return normalizeRepoPath(path).startsWith('data/json/core/') ? 'core' : 'on-demand';
}

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walkFiles(path, out);
    else out.push(relative(publicRoot, path).replaceAll('\\', '/'));
  }
  return out;
}

function readJson(repoPath) {
  return JSON.parse(readFileSync(resolve(root, normalizeRepoPath(repoPath)), 'utf8'));
}

function manifestShards(repoPath) {
  const manifest = readJson(repoPath);
  const entries = Array.isArray(manifest?.shards) ? manifest.shards : [];
  const baseDir = dirname(normalizeRepoPath(repoPath)).replaceAll('\\', '/');
  return entries.map(entry => {
    if (typeof entry === 'string') return normalizeRepoPath(`${baseDir}/${entry}`);
    if (entry && typeof entry.path === 'string') return normalizeRepoPath(entry.path);
    throw new Error(`[public-payload] unsupported shard entry in ${repoPath}`);
  });
}

const expectedJson = new Set(
  Object.values(LOC_DATA)
    .map(normalizeRepoPath)
    .filter(path => path.startsWith('data/json/'))
);
for (const manifestPath of [
  normalizeRepoPath(LOC_DATA.TEXT_CORPUS_MANIFEST),
  normalizeRepoPath(LOC_DATA.MUSIC_SEARCH_MANIFEST)
]) {
  for (const shardPath of manifestShards(manifestPath)) expectedJson.add(shardPath);
}

const actualJson = new Set(walkFiles(resolve(publicRoot, 'data/json')));
for (const path of expectedJson) if (!actualJson.has(path)) failures.push(`missing staged JSON: ${path}`);
for (const path of actualJson) if (!expectedJson.has(path)) failures.push(`unexpected staged JSON: ${path}`);

const versionManifestPath = resolve(publicRoot, 'loc-data-version.json');
let totalRuntimeJsonBytes = 0;
let versionManifest = null;
if (!existsSync(versionManifestPath)) {
  failures.push('missing runtime data version manifest: loc-data-version.json');
} else {
  versionManifest = JSON.parse(readFileSync(versionManifestPath, 'utf8'));
  const manifestFiles = versionManifest?.files && typeof versionManifest.files === 'object'
    ? versionManifest.files
    : {};
  const versionInput = [];
  const tierTotals = { core: { files: 0, bytes: 0 }, 'on-demand': { files: 0, bytes: 0 } };

  for (const path of [...expectedJson].sort()) {
    const publicPath = `/${path}`;
    const stagedPath = resolve(publicRoot, path);
    if (!existsSync(stagedPath)) continue;
    const bytes = readFileSync(stagedPath);
    const hash = createHash('sha256').update(bytes).digest('hex');
    const tier = expectedTier(path);
    const entry = manifestFiles[publicPath];
    totalRuntimeJsonBytes += bytes.byteLength;
    tierTotals[tier].files += 1;
    tierTotals[tier].bytes += bytes.byteLength;
    versionInput.push(`${publicPath}:${hash}`);

    if (!entry) failures.push(`version manifest missing JSON: ${publicPath}`);
    else {
      if (entry.hash !== hash) failures.push(`version hash mismatch: ${publicPath}`);
      if (entry.bytes !== bytes.byteLength) failures.push(`version byte count mismatch: ${publicPath}`);
      if (entry.tier !== tier) failures.push(`delivery tier mismatch: ${publicPath} expected ${tier}, found ${entry.tier}`);
    }
  }

  for (const publicPath of Object.keys(manifestFiles)) {
    const repoPath = normalizeRepoPath(publicPath);
    if (!expectedJson.has(repoPath)) failures.push(`version manifest has unexpected JSON: ${publicPath}`);
  }

  for (const tier of ['core', 'on-demand']) {
    const declared = versionManifest?.tiers?.[tier];
    if (!declared) failures.push(`version manifest missing tier summary: ${tier}`);
    else {
      if (declared.files !== tierTotals[tier].files) failures.push(`tier file count mismatch: ${tier}`);
      if (declared.bytes !== tierTotals[tier].bytes) failures.push(`tier byte count mismatch: ${tier}`);
    }
  }

  const expectedVersion = createHash('sha256').update(versionInput.join('\n')).digest('hex');
  if (versionManifest?.schema !== 1) failures.push(`unsupported runtime data version schema: ${versionManifest?.schema}`);
  if (versionManifest?.version !== expectedVersion) failures.push('runtime data aggregate version mismatch');
}

const dataIndexPath = resolve(publicRoot, 'loc-data-index.json');
if (!existsSync(dataIndexPath)) {
  failures.push('missing runtime data index: loc-data-index.json');
} else if (versionManifest) {
  const dataIndex = JSON.parse(readFileSync(dataIndexPath, 'utf8'));
  const datasets = dataIndex?.datasets && typeof dataIndex.datasets === 'object' ? dataIndex.datasets : {};
  const indexedPaths = new Map();
  let segmentCount = 0;
  let segmentBytes = 0;
  let coreBytes = 0;
  let onDemandBytes = 0;

  function verifyIndexedEntry(entry, label) {
    if (!entry?.path) {
      failures.push(`runtime data index missing path: ${label}`);
      return;
    }
    const repoPath = normalizeRepoPath(entry.path);
    const publicPath = `/${repoPath}`;
    const versionEntry = versionManifest.files?.[publicPath];
    indexedPaths.set(repoPath, (indexedPaths.get(repoPath) || 0) + 1);
    if (!versionEntry) {
      failures.push(`runtime data index references unknown JSON: ${entry.path}`);
      return;
    }
    if (entry.hash !== versionEntry.hash) failures.push(`runtime data index hash mismatch: ${entry.path}`);
    if (entry.bytes !== versionEntry.bytes) failures.push(`runtime data index byte mismatch: ${entry.path}`);
    if (entry.tier !== versionEntry.tier) failures.push(`runtime data index tier mismatch: ${entry.path}`);
  }

  function verifySegmentScope(scope, label, required) {
    if (scope == null) {
      if (required) failures.push(`runtime data index missing partition scope: ${label}`);
      return;
    }
    if (typeof scope !== 'object' || Array.isArray(scope)) {
      failures.push(`runtime data index invalid partition scope object: ${label}`);
      return;
    }
    for (const [field, values] of Object.entries(scope)) {
      if (!partitionScopeFields.has(field)) failures.push(`runtime data index unknown partition scope field: ${label}.${field}`);
      if (!Array.isArray(values)) {
        failures.push(`runtime data index partition scope must be array: ${label}.${field}`);
        continue;
      }
      if (values.some(value => typeof value !== 'string')) failures.push(`runtime data index partition scope must contain strings: ${label}.${field}`);
    }
  }

  function verifyRoutingIndex(dataset, datasetId) {
    const routing = dataset?.routing_index;
    if (!routing) return;
    if (routing.schema === 2 && routing.strategy === 'prefix-sharded') {
      const prefixLength = Number(routing.prefix_length);
      if (!Number.isInteger(prefixLength) || prefixLength < 1) failures.push(`invalid routing prefix length: ${datasetId}`);
      const shards = routing.shards && typeof routing.shards === 'object' ? routing.shards : null;
      if (!shards) {
        failures.push(`missing routing shards map: ${datasetId}`);
        return;
      }
      const prefixes = Object.keys(shards);
      if (prefixes.length > maxRoutingPrefixShards) failures.push(`routing prefix shard fan-out exceeds budget: ${datasetId}`);
      for (const [prefix, publicPath] of Object.entries(shards)) {
        if (typeof publicPath !== 'string' || !publicPath.startsWith('/loc-routing-index/')) {
          failures.push(`invalid routing shard path: ${datasetId}.${prefix}`);
          continue;
        }
        const repoPath = normalizeRepoPath(publicPath);
        const staged = resolve(publicRoot, repoPath);
        if (!existsSync(staged)) failures.push(`missing routing shard: ${publicPath}`);
        else {
          const shard = JSON.parse(readFileSync(staged, 'utf8'));
          if (shard?.schema !== 2 || shard?.dataset !== datasetId || shard?.prefix !== prefix) failures.push(`routing shard metadata mismatch: ${publicPath}`);
        }
      }
      if (prefixes.length > 0 && !Number.isInteger(prefixLength)) return;
      for (const prefix of prefixes) {
        if (prefix.length > prefixLength) failures.push(`routing prefix exceeds configured length: ${datasetId}.${prefix}`);
      }
    } else if (routing.schema !== 1 || typeof routing.keys !== 'object') {
      failures.push(`unsupported routing index schema: ${datasetId}`);
    }
  }

  for (const [datasetId, dataset] of Object.entries(datasets)) {
    if (!['core', 'on-demand'].includes(dataset?.tier)) failures.push(`runtime data index invalid dataset tier: ${datasetId}`);
    if (dataset?.manifest) verifyIndexedEntry(dataset.manifest, `${datasetId}.manifest`);
    verifyRoutingIndex(dataset, datasetId);

    const segments = Array.isArray(dataset?.segments) ? dataset.segments : [];
    const sequences = [];
    for (const segment of segments) {
      const label = `${datasetId}.${segment?.id || 'segment'}`;
      verifyIndexedEntry(segment, label);
      verifySegmentScope(segment?.scope, label, scopeRequiredDatasets.has(datasetId));
      segmentCount += 1;
      segmentBytes += Number(segment?.bytes || 0);
      if (segment?.tier === 'core') coreBytes += Number(segment?.bytes || 0);
      else onDemandBytes += Number(segment?.bytes || 0);
      sequences.push(Number(segment?.sequence));
      if (Array.isArray(segment?.routing_keys)) failures.push(`segment retains duplicated routing_keys: ${label}`);
    }
    const expectedSequences = Array.from({ length: segments.length }, (_, index) => index + 1);
    if (sequences.some((value, index) => value !== expectedSequences[index])) {
      failures.push(`runtime data index non-contiguous sequence: ${datasetId}`);
    }
  }

  for (const path of expectedJson) {
    const count = indexedPaths.get(path) || 0;
    if (count === 0) failures.push(`runtime data index missing JSON: /${path}`);
    if (count > 1) failures.push(`runtime data index duplicates JSON: /${path}`);
  }
  for (const path of indexedPaths.keys()) {
    if (!expectedJson.has(path)) failures.push(`runtime data index has unexpected JSON: /${path}`);
  }

  if (dataIndex?.schema !== 1) failures.push(`unsupported runtime data index schema: ${dataIndex?.schema}`);
  if (dataIndex?.data_version !== versionManifest.version) failures.push('runtime data index version mismatch');
  if (dataIndex?.totals?.datasets !== Object.keys(datasets).length) failures.push('runtime data index dataset count mismatch');
  if (dataIndex?.totals?.segments !== segmentCount) failures.push('runtime data index segment count mismatch');
  if (dataIndex?.totals?.bytes !== segmentBytes) failures.push('runtime data index segment byte total mismatch');
  if (dataIndex?.totals?.core_bytes !== coreBytes) failures.push('runtime data index core byte total mismatch');
  if (dataIndex?.totals?.on_demand_bytes !== onDemandBytes) failures.push('runtime data index on-demand byte total mismatch');
}

if (totalRuntimeJsonBytes > maxRuntimeJsonBytes) {
  failures.push(`runtime JSON budget exceeded: ${totalRuntimeJsonBytes} bytes > ${maxRuntimeJsonBytes} bytes`);
}

const expectedDocs = new Set(['docs/LOC_Canon_1.0.docx']);
const actualDocs = new Set(walkFiles(resolve(publicRoot, 'docs')));
for (const path of expectedDocs) if (!actualDocs.has(path)) failures.push(`missing staged doc: ${path}`);
for (const path of actualDocs) if (!expectedDocs.has(path)) failures.push(`unexpected staged doc: ${path}`);

const expectedPics = new Set([
  'pics/01.soul.jpg',
  'pics/02_connection.jpg',
  'pics/03_life.jpg',
  'pics/04_nature.jpg',
  'pics/05_mineral.jpg',
  'pics/06_element.jpg',
  'pics/07_order.jpg',
  'pics/08_disorder.jpg',
  'pics/09_specia.jpg',
  'pics/LOC-FrameworkPic.png',
  'pics/LOC-PicAll.png',
  'pics/LOC-structure.png',
  'pics/LunaRunes.jpg',
  'pics/aboutme.png',
  'pics/loc_runes_66_overview.jpg'
]);
const actualPics = new Set(walkFiles(resolve(publicRoot, 'pics')));
for (const path of expectedPics) if (!actualPics.has(path)) failures.push(`missing staged pic: ${path}`);
for (const path of actualPics) if (!expectedPics.has(path)) failures.push(`unexpected staged pic: ${path}`);

const printablePdf = resolve(publicRoot, 'LunarRunesCardCut.pdf');
if (!existsSync(printablePdf)) failures.push('missing staged printable card PDF: LunarRunesCardCut.pdf');

if (failures.length) {
  console.error('[public-payload] violations:\n' + failures.join('\n'));
  process.exit(1);
}
console.log(
  `[public-payload] verified ${actualJson.size} JSON files (${totalRuntimeJsonBytes} bytes), ` +
  `${actualDocs.size} docs, ${actualPics.size} formal pics and printable card PDF`
);
