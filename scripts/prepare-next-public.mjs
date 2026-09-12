import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { LOC_DATA } from '../app/loc/data-paths.mjs';

const root = process.cwd();
const publicRoot = resolve(root, 'public');
const dataRoot = resolve(root, 'data/json');

function bytesInTree(path) {
  if (!existsSync(path)) return 0;
  const stat = statSync(path);
  if (stat.isFile()) return stat.size;
  return readdirSync(path).reduce((total, name) => total + bytesInTree(resolve(path, name)), 0);
}

function normalizeRepoPath(value) {
  return String(value || '').replace(/^\/+/, '').replaceAll('\\', '/');
}

function copyRepoFile(repoPath) {
  const normalized = normalizeRepoPath(repoPath);
  const source = resolve(root, normalized);
  const target = resolve(publicRoot, normalized);
  if (!existsSync(source) || !statSync(source).isFile()) {
    throw new Error(`[next-public] required runtime asset missing: ${normalized}`);
  }
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  return statSync(source).size;
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
    throw new Error(`[next-public] unsupported shard entry in ${repoPath}`);
  });
}

// Generated public payload must never retain stale copies from an older full-tree build.
for (const rel of ['data/json', 'docs', 'pics']) {
  rmSync(resolve(publicRoot, rel), { recursive: true, force: true });
}

const runtimeJson = new Set(
  Object.values(LOC_DATA)
    .map(normalizeRepoPath)
    .filter(path => path.startsWith('data/json/'))
);

// Search corpora stay split. Only manifest-declared shards are published.
for (const manifestPath of [
  normalizeRepoPath(LOC_DATA.TEXT_CORPUS_MANIFEST),
  normalizeRepoPath(LOC_DATA.MUSIC_SEARCH_MANIFEST)
]) {
  for (const shardPath of manifestShards(manifestPath)) runtimeJson.add(shardPath);
}

let stagedJsonBytes = 0;
for (const path of [...runtimeJson].sort()) stagedJsonBytes += copyRepoFile(path);

// Next currently exposes only the canonical public LOC document. Repository-only docs stay out.
const runtimeDocs = ['docs/LOC_Canon_1.0.docx'];
let stagedDocBytes = 0;
for (const path of runtimeDocs) stagedDocBytes += copyRepoFile(path);

const sourceJsonBytes = bytesInTree(dataRoot);
const reduction = sourceJsonBytes
  ? ((1 - stagedJsonBytes / sourceJsonBytes) * 100)
  : 0;
const mib = bytes => (bytes / 1024 / 1024).toFixed(2);

console.log(`[next-public] JSON: ${runtimeJson.size} runtime files, ${mib(stagedJsonBytes)} MiB staged / ${mib(sourceJsonBytes)} MiB source (${reduction.toFixed(1)}% excluded)`);
console.log(`[next-public] Docs: ${runtimeDocs.length} file, ${mib(stagedDocBytes)} MiB staged`);
console.log('[next-public] Pics: 0 files staged (no current Next runtime consumer)');
