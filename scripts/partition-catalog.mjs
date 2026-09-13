import { readFile } from 'node:fs/promises';
import path from 'node:path';

const normalize = value => String(value || '').replace(/^\/+/, '').replaceAll('\\', '/');
const uniq = values => [...new Set(values.filter(value => value !== '' && value != null).map(value => String(value)))].sort();

async function readJson(root, repoPath) {
  return JSON.parse(await readFile(path.join(root, normalize(repoPath)), 'utf8'));
}

function eraForDate(date, eras) {
  const value = String(date || '').slice(0, 10);
  if (!value) return null;
  return eras.find(era => {
    const start = String(era.start_date || '').slice(0, 10);
    const end = String(era.end_date || '').slice(0, 10);
    return start && value >= start && (!end || value <= end);
  }) || null;
}

function baseScope(corpus) {
  return {
    person: [],
    family: [],
    generation: [],
    era: [],
    source: [],
    corpus: corpus ? [corpus] : [],
    language: [],
    culture: []
  };
}

export async function buildSegmentScopeCatalog(root, {
  loc4ShardEntries,
  loc3ShardEntries,
  eraRegistryPath,
  loc3ManifestPath
}) {
  const eraRegistry = await readJson(root, eraRegistryPath);
  const eras = Array.isArray(eraRegistry?.eras) ? eraRegistry.eras : [];
  const loc3Manifest = await readJson(root, loc3ManifestPath);
  const loc3Language = loc3Manifest?.dataset?.language_scope || '';
  const catalog = {};

  for (const entry of loc4ShardEntries) {
    const data = await readJson(root, entry.path);
    const documents = Array.isArray(data?.documents) ? data.documents : [];
    const scope = baseScope('loc4-text-corpus');
    scope.source = uniq(documents.map(item => item?.source_type));
    scope.era = uniq(documents.map(item => eraForDate(item?.date, eras)?.era_id));
    catalog[normalize(entry.path)] = scope;
  }

  for (const entry of loc3ShardEntries) {
    const data = await readJson(root, entry.path);
    const works = Array.isArray(data?.works) ? data.works : [];
    const scope = baseScope('loc3-lyrics-search');
    scope.source = uniq(works.map(item => item?.content_origin));
    scope.era = uniq(works.map(item => item?.era || eraForDate(item?.created_date, eras)?.era_id));
    if (loc3Language) scope.language = [String(loc3Language)];
    catalog[normalize(entry.path)] = scope;
  }

  return catalog;
}
