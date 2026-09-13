import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { LOC_DATA } from '../app/loc/data-paths.mjs';

const root = process.cwd();
const publicRoot = resolve(root, 'public');
const failures = [];

function normalizeRepoPath(value) {
  return String(value || '').replace(/^\/+/, '').replaceAll('\\', '/');
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

// User-facing governance/KM lives in routes or structured data; only the Canon doc is staged here.
const expectedDocs = new Set(['docs/LOC_Canon_1.0.docx']);
const actualDocs = new Set(walkFiles(resolve(publicRoot, 'docs')));
for (const path of expectedDocs) if (!actualDocs.has(path)) failures.push(`missing staged doc: ${path}`);
for (const path of actualDocs) if (!expectedDocs.has(path)) failures.push(`unexpected staged doc: ${path}`);

// Formal homepage, framework and LunaRunes concept/group visuals staged from the preserved pics/ source directory.
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
  'pics/loc_runes_66_overview.jpg'
]);
const actualPics = new Set(walkFiles(resolve(publicRoot, 'pics')));
for (const path of expectedPics) if (!actualPics.has(path)) failures.push(`missing staged pic: ${path}`);
for (const path of actualPics) if (!expectedPics.has(path)) failures.push(`unexpected staged pic: ${path}`);

// Physical card production PDF is a public Runes asset, not tutorial content.
const printablePdf = resolve(publicRoot, 'LunarRunesCardCut.pdf');
if (!existsSync(printablePdf)) failures.push('missing staged printable card PDF: LunarRunesCardCut.pdf');

if (failures.length) {
  console.error('[public-payload] violations:\n' + failures.join('\n'));
  process.exit(1);
}
console.log(`[public-payload] verified ${actualJson.size} JSON files, ${actualDocs.size} docs, ${actualPics.size} formal pics and printable card PDF`);
