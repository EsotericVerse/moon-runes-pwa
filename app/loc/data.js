export { LOC_DATA } from './data-paths.mjs';

// Runtime data policy:
// - runes.json is the canonical rune source; never duplicate canonical rows here.
// - lots/history/harmony are canonical companion datasets keyed by rune identity.
// - Derived/search JSON stays split so large corpora can be loaded only when needed.
// - All LOC views share this request cache and one global concurrency gate.
// - Persistent HTTP cache keys are versioned by build-time SHA-256 metadata.
const memoryCache = new Map();
const DATA_VERSION_MANIFEST = '/loc-data-version.json';
const DEFAULT_GLOBAL_CONCURRENCY = 2;
const DEFAULT_MAX_BATCH_ITEMS = 24;
const DEFAULT_MAX_RESPONSE_BYTES = 128 * 1024 * 1024;
const DEFAULT_MEMORY_CACHE_ENTRIES = 24;
let activeRequests = 0;
let versionManifestPromise;
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

function trimMemoryCache(maxEntries = DEFAULT_MEMORY_CACHE_ENTRIES) {
  while (memoryCache.size > maxEntries) {
    const oldestKey = memoryCache.keys().next().value;
    memoryCache.delete(oldestKey);
  }
}

function touchMemoryCache(key) {
  if (!memoryCache.has(key)) return;
  const value = memoryCache.get(key);
  memoryCache.delete(key);
  memoryCache.set(key, value);
}

async function loadVersionManifest() {
  if (!versionManifestPromise) {
    versionManifestPromise = fetch(DATA_VERSION_MANIFEST, { cache: 'no-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`${DATA_VERSION_MANIFEST}: HTTP ${response.status}`);
        return response.json();
      })
      .catch(() => ({ schema: 0, version: null, files: {} }));
  }
  return versionManifestPromise;
}

function versionedPath(path, entry) {
  if (!entry?.hash) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${encodeURIComponent(entry.hash.slice(0, 16))}`;
}

async function fetchJsonOnce(path, { maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES } = {}) {
  const manifest = await loadVersionManifest();
  const entry = manifest?.files?.[path];
  if (entry?.bytes && entry.bytes > maxResponseBytes) {
    throw new Error(`${path}: declared size ${entry.bytes} exceeds I/O budget ${maxResponseBytes}`);
  }

  await acquireSlot();
  try {
    const requestPath = versionedPath(path, entry);
    const response = await fetch(requestPath, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);

    const declaredBytes = Number(response.headers.get('content-length') || 0);
    if (declaredBytes && declaredBytes > maxResponseBytes) {
      throw new Error(`${path}: response size ${declaredBytes} exceeds I/O budget ${maxResponseBytes}`);
    }
    return response.json();
  } finally {
    releaseSlot();
  }
}

export function fetchLocJson(path, {
  memory = true,
  maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
  maxMemoryEntries = DEFAULT_MEMORY_CACHE_ENTRIES
} = {}) {
  if (!memory) return fetchJsonOnce(path, { maxResponseBytes });

  if (memoryCache.has(path)) {
    touchMemoryCache(path);
    return memoryCache.get(path);
  }

  const request = fetchJsonOnce(path, { maxResponseBytes }).catch(error => {
    memoryCache.delete(path);
    throw error;
  });
  memoryCache.set(path, request);
  trimMemoryCache(maxMemoryEntries);
  return request;
}

export async function fetchLocJsonBatch(items, {
  concurrency = DEFAULT_GLOBAL_CONCURRENCY,
  maxItems = DEFAULT_MAX_BATCH_ITEMS,
  maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
  memory = true
} = {}) {
  const queue = [...items];
  if (queue.length > maxItems) {
    throw new Error(`LOC data batch has ${queue.length} items; I/O budget allows ${maxItems}`);
  }

  const results = new Array(queue.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= queue.length) return;
      const item = queue[index];
      const path = typeof item === 'string' ? item : item.path;
      const itemMaxBytes = typeof item === 'object' && item?.maxResponseBytes
        ? item.maxResponseBytes
        : maxResponseBytes;
      results[index] = await fetchLocJson(path, { memory, maxResponseBytes: itemMaxBytes });
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, DEFAULT_GLOBAL_CONCURRENCY, queue.length || 1));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export function clearLocJsonCache(path) {
  if (path) memoryCache.delete(path);
  else memoryCache.clear();
}

export function refreshLocDataVersionManifest() {
  versionManifestPromise = undefined;
  return loadVersionManifest();
}

export const LOC_IO_BUDGET = Object.freeze({
  maxBatchItems: DEFAULT_MAX_BATCH_ITEMS,
  maxConcurrentRequests: DEFAULT_GLOBAL_CONCURRENCY,
  maxResponseBytes: DEFAULT_MAX_RESPONSE_BYTES,
  maxMemoryEntries: DEFAULT_MEMORY_CACHE_ENTRIES
});
