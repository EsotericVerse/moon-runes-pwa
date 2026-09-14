import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const normalize = value => String(value || '').replace(/^\/+/, '').replaceAll('\\', '/');
const uniq = values => [...new Set(values.filter(value => value !== '' && value != null).map(value => String(value)))].sort();
const MAX_ROUTING_KEYS = 512;

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

function routingTokens(value) {
  const text = String(value || '').normalize('NFKC').toLocaleLowerCase('zh-Hant');
  const out = [];
  for (const run of text.match(/[\u3400-\u9fff]+/g) || []) {
    const chars = Array.from(run);
    for (let index = 0; index < chars.length; index += 1) {
      out.push(chars[index]);
      if (index + 1 < chars.length) out.push(chars[index] + chars[index + 1]);
    }
  }
  for (const word of text.match(/[a-z0-9][a-z0-9_-]{1,}/g) || []) out.push(word);
  return out;
}

function addRoutingText(counts, value, weight = 1) {
  for (const token of routingTokens(value)) counts.set(token, (counts.get(token) || 0) + weight);
}

function routingKeys(records, metadataFields, bodyFields) {
  const counts = new Map();
  for (const row of records) {
    for (const field of metadataFields) {
      const value = row?.[field];
      if (Array.isArray(value)) addRoutingText(counts, value.join(' '), 4);
      else addRoutingText(counts, value, 4);
    }
    for (const field of bodyFields) addRoutingText(counts, row?.[field], 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'zh-Hant'))
    .slice(0, MAX_ROUTING_KEYS)
    .map(([token]) => createHash('sha256').update(token).digest('hex').slice(0, 16));
}

export async function buildSegmentCatalog(root, {
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
    catalog[normalize(entry.path)] = {
      scope,
      routing_keys: routingKeys(
        documents,
        ['title', 'section', 'work_id', 'source_type', 'content_type'],
        ['retrieval_text', 'text']
      )
    };
  }

  for (const entry of loc3ShardEntries) {
    const data = await readJson(root, entry.path);
    const works = Array.isArray(data?.works) ? data.works : [];
    const scope = baseScope('loc3-lyrics-search');
    scope.source = uniq(works.map(item => item?.content_origin));
    scope.era = uniq(works.map(item => item?.era || eraForDate(item?.created_date, eras)?.era_id));
    if (loc3Language) scope.language = [String(loc3Language)];
    catalog[normalize(entry.path)] = {
      scope,
      routing_keys: routingKeys(
        works,
        [
          'title', 'summary', 'style', 'tags', 'semantic_keywords', 'reasoning_tags',
          'key_propositions', 'category', 'start_state', 'turn_method', 'final_state',
          'emotion_function', 'ending_structure', 'hope_extension', 'content_origin',
          'period', 'era_name', 'playlists'
        ],
        ['retrieval_text']
      )
    };
  }

  return catalog;
}

export async function buildSegmentScopeCatalog(root, options) {
  const catalog = await buildSegmentCatalog(root, options);
  return Object.fromEntries(
    Object.entries(catalog).map(([repoPath, entry]) => [repoPath, entry.scope || {}])
  );
}
