import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LOC_DATA } from '../app/loc/data-paths.mjs';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');

const normalize = value => String(value || '').replace(/^\/+/, '').replaceAll('\\', '/');
const dataTier = rel => normalize(rel).startsWith('data/json/core/') ? 'core' : 'on-demand';

async function copyPath(sourceRel, targetRel = sourceRel) {
  const source = path.join(ROOT, normalize(sourceRel));
  const target = path.join(PUBLIC, normalize(targetRel));
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}

async function manifestShards(repoPath) {
  const rel = normalize(repoPath);
  const manifest = JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'));
  const entries = Array.isArray(manifest?.shards) ? manifest.shards : [];
  const baseDir = path.posix.dirname(rel);
  return entries.map(entry => {
    if (typeof entry === 'string') return normalize(path.posix.join(baseDir, entry));
    if (entry && typeof entry.path === 'string') return normalize(entry.path);
    throw new Error(`[prepare-public] unsupported shard entry in ${rel}`);
  });
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

await rm(PUBLIC, { recursive: true, force: true });
await mkdir(PUBLIC, { recursive: true });

// Static presentation assets that are intentionally public.
for (const rel of [
  'assets/lunarunes/cards',
  'assets/lunarunes/reference',
  'assets/site/diagrams',
  'assets/site/icons',
  'pics',
  'data/html/runes-beginner.html',
  'docs/LOC_Canon_1.0.docx',
  'LunarRunesCardCut.pdf',
  'apple-touch-icon.png',
  'favicon.ico',
  'manifest.json',
  'CNAME'
]) await copyPath(rel);

// Runtime JSON is an explicit deployment allowlist. Delivery tier is separate:
// canonical core data is eligible for light/core loading, while registries,
// search projections and corpus shards remain on-demand.
const jsonFiles = new Set(
  Object.values(LOC_DATA)
    .map(normalize)
    .filter(rel => rel.startsWith('data/json/'))
);
for (const manifestPath of [LOC_DATA.TEXT_CORPUS_MANIFEST, LOC_DATA.MUSIC_SEARCH_MANIFEST]) {
  for (const shard of await manifestShards(manifestPath)) jsonFiles.add(shard);
}
for (const rel of jsonFiles) await copyPath(rel);

const versionManifest = await buildDataVersionManifest(jsonFiles);
console.log(
  `Prepared Next public payload with ${jsonFiles.size} explicit JSON files; ` +
  `core=${versionManifest.tiers.core.files}, on-demand=${versionManifest.tiers['on-demand'].files}; ` +
  `data version ${versionManifest.version.slice(0, 12)}.`
);
