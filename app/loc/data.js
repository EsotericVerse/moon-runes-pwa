export const LOC_DATA = Object.freeze({
  RUNES: '/data/json/core/runes.json',
  LOTS: '/data/json/core/lots.json',
  RUNE_GRAMMAR: '/data/json/core/rune_grammar.json',
  RUNE_INTERPRETATIONS: '/data/json/core/rune_interpretations.json',
  THREE_CARD_COMBINATIONS: '/data/json/core/three_card_combinations.json',
  LOC2_EVENT_REGISTRY: '/data/json/registries/LOC2_EVENT_REGISTRY.json',
  LOC4_WRITING_REGISTRY: '/data/json/registries/LOC4_WRITING_REGISTRY.json',
  LOC6_GOVERNANCE_REGISTRY: '/data/json/registries/LOC6_GOVERNANCE_REGISTRY.json',
  LOC_MEDIA_REGISTRY: '/data/json/registries/LOC_MEDIA_REGISTRY.json',
  LOC_KNOWLEDGE_ASSET_REGISTRY: '/data/json/registries/LOC_KNOWLEDGE_ASSET_REGISTRY.json',
  LOC_FAQ: '/data/json/search/faq/LOC_FAQ_RAG_v0.4.json',
  TEXT_CORPUS_MANIFEST: '/data/json/generated/loc4/corpus/LOC4_TEXT_CORPUS_MANIFEST.json',
  MUSIC_SEARCH_MANIFEST: '/data/json/search/loc3/LOC3_LYRICS_SEARCH_v0.1.json',
  RUNE_RESERVED_SNAPSHOT: '/data/json/generated/search/reserved/moon-runes.json'
});

// Runtime data policy:
// - runes.json is the canonical rune source; never duplicate canonical rows here.
// - Derived/search JSON stays split so large corpora can be loaded only when needed.
// - All LOC views share this request cache and one global concurrency gate.
const cache = new Map();
const DEFAULT_GLOBAL_CONCURRENCY = 4;
let activeRequests = 0;
const waiters = [];

function acquireSlot(limit = DEFAULT_GLOBAL_CONCURRENCY) {
  if (activeRequests < limit) {
    activeRequests += 1;
    return Promise.resolve();
  }
  return new Promise(resolve => waiters.push({ resolve, limit }));
}

function releaseSlot() {
  activeRequests = Math.max(0, activeRequests - 1);
  for (let index = 0; index < waiters.length; index += 1) {
    const waiter = waiters[index];
    if (activeRequests < waiter.limit) {
      waiters.splice(index, 1);
      activeRequests += 1;
      waiter.resolve();
      return;
    }
  }
}

async function fetchJsonOnce(path) {
  await acquireSlot();
  try {
    const response = await fetch(path, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  } finally {
    releaseSlot();
  }
}

export function fetchLocJson(path) {
  if (!cache.has(path)) {
    cache.set(path, fetchJsonOnce(path).catch(error => {
      cache.delete(path);
      throw error;
    }));
  }
  return cache.get(path);
}

export async function fetchLocJsonBatch(items, { concurrency = DEFAULT_GLOBAL_CONCURRENCY } = {}) {
  const queue = [...items];
  const results = new Array(queue.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= queue.length) return;
      const item = queue[index];
      const path = typeof item === 'string' ? item : item.path;
      results[index] = await fetchLocJson(path);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, queue.length || 1));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export function clearLocJsonCache(path) {
  if (path) cache.delete(path);
  else cache.clear();
}
