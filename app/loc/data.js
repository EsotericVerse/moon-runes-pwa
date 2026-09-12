export const LOC_DATA = Object.freeze({
  RUNES: '/data/json/core/runes.json',
  LOTS: '/data/json/core/lots.json',
  RUNE_GRAMMAR: '/data/json/core/rune_grammar.json',
  RUNE_INTERPRETATIONS: '/data/json/core/rune_interpretations.json',
  THREE_CARD_COMBINATIONS: '/data/json/core/three_card_combinations.json',
  TEXT_CORPUS_MANIFEST: '/data/json/generated/loc4/corpus/LOC4_TEXT_CORPUS_MANIFEST.json',
  MUSIC_SEARCH_MANIFEST: '/data/json/search/loc3/LOC3_LYRICS_SEARCH_v0.1.json',
  RUNE_RESERVED_SNAPSHOT: '/data/json/generated/search/reserved/moon-runes.json'
});

const cache = new Map();

export function fetchLocJson(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path, { cache: 'force-cache' }).then(response => {
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      return response.json();
    }).catch(error => {
      cache.delete(path);
      throw error;
    }));
  }
  return cache.get(path);
}

export async function fetchLocJsonBatch(items, { concurrency = 4 } = {}) {
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
