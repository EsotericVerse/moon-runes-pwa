import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { LOC_DATA } from '../app/loc/data-paths.mjs';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');

const normalize = value => String(value || '').replace(/^\/+/, '').replaceAll('\\', '/');

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

await rm(PUBLIC, { recursive: true, force: true });
await mkdir(PUBLIC, { recursive: true });

// Static presentation assets that are intentionally public.
for (const rel of [
  'assets/lunarunes/cards',
  'assets/lunarunes/reference',
  'assets/site/diagrams',
  'assets/site/icons',
  'data/html/runes-beginner.html',
  'docs/LOC_Canon_1.0.docx',
  'apple-touch-icon.png',
  'favicon.ico',
  'manifest.json',
  'CNAME'
]) await copyPath(rel);

// Runtime JSON is an explicit allowlist derived from the paths the Next app actually uses.
const jsonFiles = new Set(
  Object.values(LOC_DATA)
    .map(normalize)
    .filter(rel => rel.startsWith('data/json/'))
);
for (const manifestPath of [LOC_DATA.TEXT_CORPUS_MANIFEST, LOC_DATA.MUSIC_SEARCH_MANIFEST]) {
  for (const shard of await manifestShards(manifestPath)) jsonFiles.add(shard);
}
for (const rel of jsonFiles) await copyPath(rel);

console.log(`Prepared Next public payload with ${jsonFiles.size} explicit JSON files and public assets.`);
