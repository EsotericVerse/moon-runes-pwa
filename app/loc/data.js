export { LOC_DATA } from './data-paths.mjs';

// Runtime data policy:
// - runes.json is the canonical rune source; never duplicate canonical rows here.
// - lots/history/harmony are canonical companion datasets keyed by rune identity.
// - Derived/search JSON stays split so large corpora can be loaded only when needed.
// - All LOC views share this request cache and one global concurrency gate.
// - Concurrency is deliberately capped at 2 to avoid burst memory/network pressure.
const cache = new Map();
const DEFAULT_GLOBAL_CONCURRENCY = 2;
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
