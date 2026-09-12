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

const expectedDocs = new Set([
  'docs/LOC_Canon_1.0.docx',
  'docs/ZHENGDE_STYLE_PUBLIC_KM.md'
]);
const actualDocs = new Set(walkFiles(resolve(publicRoot, 'docs')));
for (const path of expectedDocs) if (!actualDocs.has(path)) failures.push(`missing staged doc: ${path}`);
for (const path of actualDocs) if (!expectedDocs.has(path)) failures.push(`unexpected staged doc: ${path}`);

const picFiles = walkFiles(resolve(publicRoot, 'pics'));
if (picFiles.length) failures.push(`pics must not be staged for current Next runtime (${picFiles.length} files found)`);

if (failures.length) {
  console.error('[public-payload] violations:\n' + failures.join('\n'));
  process.exit(1);
}
console.log(`[public-payload] verified ${actualJson.size} JSON files, ${actualDocs.size} docs, 0 pics`);
