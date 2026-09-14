import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LOC_DATA } from '../app/loc/data-paths.mjs';
import { buildSegmentCatalog } from './partition-catalog.mjs';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');
const MAX_ROUTING_INDEX_SEGMENTS_PER_KEY = 24;

const normalize = value => String(value || '').replace(/^\/+/, '').replaceAll('\\', '/');
const dataTier = rel => normalize(rel).startsWith('data/json/core/') ? 'core' : 'on-demand';

async function copyPath(sourceRel, targetRel = sourceRel) {
  const source = path.join(ROOT, normalize(sourceRel));
  const target = path.join(PUBLIC, normalize(targetRel));
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}

async function readRepoJson(repoPath) {
  return JSON.parse(await readFile(path.join(ROOT, normalize(repoPath)), 'utf8'));
}

async function manifestShardEntries(repoPath) {
  const rel = normalize(repoPath);
  const manifest = await readRepoJson(rel);
  const entries = Array.isArray(manifest?.shards) ? manifest.shards : [];
  const baseDir = path.posix.dirname(rel);
  return entries.map((entry, index) => {
    if (typeof entry === 'string') {
      return { path: normalize(path.posix.join(baseDir, entry)), sequence: index + 1 };
    }
    if (entry && typeof entry.path === 'string') {
      return { ...entry, path: normalize(entry.path), sequence: index + 1 };
    }
    throw new Error(`[prepare-public] unsupported shard entry in ${rel}`);
  });
}

async function manifestShards(repoPath) {
  return (await manifestShardEntries(repoPath)).map(entry => entry.path);
}

async function buildDataVersionManifest(jsonFiles) {
  const files = {};
  const versionInput = [];
  const tiers = { core: { files: 0, bytes: 0 }, 'on-demand': { files: 0, bytes: 0 } };
  const sorted = [...jsonFiles].sort();
  for (const rel of sorted) {
    const bytes = await readFile(path.join(ROOT, rel));
    const hash = createHash('sha256').update(bytes).digest('hex');
    const publicPath = `/${normalize(rel)}`;
    const tier = dataTier(rel);
    files[publicPath] = { hash, bytes: bytes.byteLength, tier };
    tiers[tier].files += 1;
    tiers[tier].bytes += bytes.byteLength;
    versionInput.push(`${publicPath}:${hash}`);
  }
  const version = createHash('sha256').update(versionInput.join('\n')).digest('hex');
  const manifest = { schema: 1, version, tiers, files };
  await writeFile(path.join(PUBLIC, 'loc-data-version.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

function fileMeta(versionManifest, repoPath) {
  const publicPath = `/${normalize(repoPath)}`;
  const entry = versionManifest.files[publicPath];
  if (!entry) throw new Error(`[prepare-public] missing version metadata for ${publicPath}`);
  return { path: publicPath, hash: entry.hash, bytes: entry.bytes, tier: entry.tier };
}

function buildRoutingIndex(segments) {
  const keys = new Map();
  const truncated = new Set();
  for (const segment of segments) {
    for (const key of Array.isArray(segment.routing_keys) ? segment.routing_keys : []) {
      const bucket = keys.get(key) || [];
      if (!bucket.includes(segment.id) && bucket.length < MAX_ROUTING_INDEX_SEGMENTS_PER_KEY) {
        bucket.push(segment.id);
      } else if (!bucket.includes(segment.id)) {
        truncated.add(key);
      }
      keys.set(key, bucket);
    }
  }
  return {
    schema: 1,
    max_segments_per_key: MAX_ROUTING_INDEX_SEGMENTS_PER_KEY,
    truncated_keys: [...truncated].sort(),
    keys: Object.fromEntries([...keys.entries()].sort(([left], [right]) => left.localeCompare(right)))
  };
}

async function buildDataIndex(versionManifest) {
  const loc4ManifestPath = normalize(LOC_DATA.TEXT_CORPUS_MANIFEST);
  const loc3ManifestPath = normalize(LOC_DATA.MUSIC_SEARCH_MANIFEST);
  const loc4ShardEntries = await manifestShardEntries(loc4ManifestPath);
  const loc3ShardEntries = await manifestShardEntries(loc3ManifestPath);
  const segmentCatalog = await buildSegmentCatalog(ROOT, {
    loc4ShardEntries,
    loc3ShardEntries,
    eraRegistryPath: normalize(LOC_DATA.LOC_ERA_REGISTRY),
    loc3ManifestPath
  });
  const reservedSegmentPaths = new Set([
    loc4ManifestPath,
    loc3ManifestPath,
    ...loc4ShardEntries.map(entry => entry.path),
    ...loc3ShardEntries.map(entry => entry.path)
  ]);
  const datasets = {};
  const corePaths = Object.values(LOC_DATA).map(normalize).filter(rel => rel.startsWith('data/json/core/')).sort();

  datasets.core = {
    tier: 'core', strategy: 'canonical-core',
    segments: corePaths.map((rel, index) => ({ id: `core-${String(index + 1).padStart(2, '0')}`, sequence: index + 1, ...fileMeta(versionManifest, rel) }))
  };

  const loc4Segments = loc4ShardEntries.map(entry => {
    const catalogEntry = segmentCatalog[entry.path] || {};
    return {
      id: `loc4-${String(entry.sequence).padStart(2, '0')}`,
      sequence: entry.sequence,
      ...(Number.isFinite(Number(entry.document_count)) ? { document_count: Number(entry.document_count) } : {}),
      scope: catalogEntry.scope || {}, routing_keys: catalogEntry.routing_keys || [], ...fileMeta(versionManifest, entry.path)
    };
  });
  datasets['loc4-text-corpus'] = { tier: 'on-demand', strategy: 'manifest-shards', manifest: fileMeta(versionManifest, loc4ManifestPath), routing_index: buildRoutingIndex(loc4Segments), segments: loc4Segments };

  const loc3Segments = loc3ShardEntries.map(entry => {
    const catalogEntry = segmentCatalog[entry.path] || {};
    return { id: `loc3-${String(entry.sequence).padStart(2, '0')}`, sequence: entry.sequence, scope: catalogEntry.scope || {}, routing_keys: catalogEntry.routing_keys || [], ...fileMeta(versionManifest, entry.path) };
  });
  datasets['loc3-lyrics-search'] = { tier: 'on-demand', strategy: 'manifest-shards', manifest: fileMeta(versionManifest, loc3ManifestPath), routing_index: buildRoutingIndex(loc3Segments), segments: loc3Segments };

  const singletonPaths = Object.values(LOC_DATA).map(normalize).filter(rel => rel.startsWith('data/json/')).filter(rel => dataTier(rel) === 'on-demand').filter(rel => !reservedSegmentPaths.has(rel)).sort();
  datasets['on-demand-singletons'] = { tier: 'on-demand', strategy: 'single-file-segments', segments: singletonPaths.map((rel, index) => ({ id: `single-${String(index + 1).padStart(2, '0')}`, sequence: index + 1, ...fileMeta(versionManifest, rel) })) };

  const totals = Object.values(datasets).reduce((acc, dataset) => {
    for (const segment of dataset.segments) {
      acc.segments += 1; acc.bytes += segment.bytes || 0;
      if (segment.tier === 'core') acc.core_bytes += segment.bytes || 0; else acc.on_demand_bytes += segment.bytes || 0;
    }
    return acc;
  }, { datasets: Object.keys(datasets).length, segments: 0, bytes: 0, core_bytes: 0, on_demand_bytes: 0 });

  const index = { schema: 1, data_version: versionManifest.version, totals, datasets };
  await writeFile(path.join(PUBLIC, 'loc-data-index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return index;
}

await rm(PUBLIC, { recursive: true, force: true });
await mkdir(PUBLIC, { recursive: true });

for (const rel of [
  'assets/lunarunes/cards', 'assets/lunarunes/reference', 'assets/site/diagrams', 'assets/site/icons',
  'pics/01.soul.jpg', 'pics/02_connection.jpg', 'pics/03_life.jpg', 'pics/04_nature.jpg',
  'pics/05_mineral.jpg', 'pics/06_element.jpg', 'pics/07_order.jpg', 'pics/08_disorder.jpg',
  'pics/09_specia.jpg', 'pics/LOC-FrameworkPic.png', 'pics/LOC-PicAll.png', 'pics/LOC-structure.png',
  'pics/LunaRunes.jpg', 'pics/aboutme.png',
  'data/html/runes-beginner.html', 'docs/LOC_Canon_1.0.docx', 'LunarRunesCardCut.pdf',
  'apple-touch-icon.png', 'favicon.ico', 'manifest.json', 'CNAME'
]) await copyPath(rel);
await copyPath('pics/lrunes66_overview.jpg', 'pics/loc_runes_66_overview.jpg');

const jsonFiles = new Set(Object.values(LOC_DATA).map(normalize).filter(rel => rel.startsWith('data/json/')));
for (const manifestPath of [LOC_DATA.TEXT_CORPUS_MANIFEST, LOC_DATA.MUSIC_SEARCH_MANIFEST]) {
  for (const shard of await manifestShards(manifestPath)) jsonFiles.add(shard);
}
for (const rel of jsonFiles) await copyPath(rel);

const versionManifest = await buildDataVersionManifest(jsonFiles);
const dataIndex = await buildDataIndex(versionManifest);
console.log(`Prepared Next public payload with ${jsonFiles.size} explicit JSON files; core=${versionManifest.tiers.core.files}, on-demand=${versionManifest.tiers['on-demand'].files}; datasets=${dataIndex.totals.datasets}, segments=${dataIndex.totals.segments}; data version ${versionManifest.version.slice(0, 12)}.`);