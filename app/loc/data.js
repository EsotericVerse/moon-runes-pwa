import { createClient } from '@neondatabase/neon-js';
export { LOC_DATA } from './data-paths.mjs';

// Current runtime contract:
// - Shared LOC data is read only from Neon's public api.runtime_json_documents projection.
// - Bronze / Silver / Vault are never exposed to the browser.
// - Vercel/GitHub Pages only serve the static application shell and routing metadata.
// - Browser IndexedDB is not a dataset cache or runtime source.
const NEON_AUTH_URL = process.env.NEXT_PUBLIC_NEON_AUTH_URL
  || 'https://ep-rapid-queen-b3oyboy6.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth';
const NEON_DATA_API_URL = process.env.NEXT_PUBLIC_NEON_DATA_API_URL
  || 'https://ep-rapid-queen-b3oyboy6.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';
const DATA_INDEX_MANIFEST = '/loc-data-index.json';
const DEFAULT_GLOBAL_CONCURRENCY = 2;
const DEFAULT_MAX_BATCH_ITEMS = 24;
const DEFAULT_MAX_RESPONSE_BYTES = 128 * 1024 * 1024;
const DEFAULT_MEMORY_CACHE_ENTRIES = 24;
const DEFAULT_MAX_SEGMENTS = 8;
const DEFAULT_MAX_SEGMENT_BATCH_BYTES = 192 * 1024 * 1024;

const neon = createClient({
  auth: {
    url: NEON_AUTH_URL,
    allowAnonymous: true
  },
  dataApi: {
    url: NEON_DATA_API_URL,
    options: { db: { schema: 'api' } }
  }
});

const memoryCache = new Map();
let activeRequests = 0;
let dataIndexPromise;
const waiters = [];

function normalizeSourcePath(path) {
  const value = String(path || '').trim().replace(/^\/+/, '');
  if (!value) throw new Error('LOC Neon data path is required');
  return value;
}

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

async function loadDataIndex() {
  if (!dataIndexPromise) {
    dataIndexPromise = fetch(DATA_INDEX_MANIFEST, { cache: 'force-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`${DATA_INDEX_MANIFEST}: HTTP ${response.status}`);
        return response.json();
      });
  }
  return dataIndexPromise;
}

async function fetchJsonOnce(path, { maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES } = {}) {
  const sourcePath = normalizeSourcePath(path);
  await acquireSlot();
  try {
    const { data, error } = await neon
      .from('runtime_json_documents')
      .select('payload,blob_sha')
      .eq('source_path', sourcePath)
      .limit(1);

    if (error) throw new Error(`${sourcePath}: Neon Data API ${error.message || 'query failed'}`);
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) throw new Error(`${sourcePath}: not published in Neon runtime projection`);

    const payload = row.payload;
    const approxBytes = JSON.stringify(payload).length;
    if (approxBytes > maxResponseBytes) {
      throw new Error(`${sourcePath}: response size ${approxBytes} exceeds I/O budget ${maxResponseBytes}`);
    }
    return payload;
  } finally {
    releaseSlot();
  }
}

export function fetchLocJson(path, {
  memory = true,
  maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
  maxMemoryEntries = DEFAULT_MEMORY_CACHE_ENTRIES
} = {}) {
  const key = normalizeSourcePath(path);
  if (!memory) return fetchJsonOnce(key, { maxResponseBytes });

  if (memoryCache.has(key)) {
    touchMemoryCache(key);
    return memoryCache.get(key);
  }

  const request = fetchJsonOnce(key, { maxResponseBytes }).catch(error => {
    memoryCache.delete(key);
    throw error;
  });
  memoryCache.set(key, request);
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

export async function getLocDataIndex() {
  return loadDataIndex();
}

export async function getLocDataDataset(datasetId) {
  const index = await loadDataIndex();
  const dataset = index?.datasets?.[datasetId];
  if (!dataset) throw new Error(`Unknown LOC data dataset: ${datasetId}`);
  return dataset;
}

export async function fetchLocDataSegments(datasetId, {
  segmentIds,
  fromSequence,
  toSequence,
  maxSegments = DEFAULT_MAX_SEGMENTS,
  maxTotalBytes = DEFAULT_MAX_SEGMENT_BATCH_BYTES,
  maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
  memory = true
} = {}) {
  const dataset = await getLocDataDataset(datasetId);
  let segments = Array.isArray(dataset?.segments) ? dataset.segments : [];

  if (Array.isArray(segmentIds) && segmentIds.length) {
    const wanted = new Set(segmentIds);
    segments = segments.filter(segment => wanted.has(segment.id));
  }
  if (Number.isFinite(Number(fromSequence))) {
    segments = segments.filter(segment => Number(segment.sequence) >= Number(fromSequence));
  }
  if (Number.isFinite(Number(toSequence))) {
    segments = segments.filter(segment => Number(segment.sequence) <= Number(toSequence));
  }

  segments = [...segments].sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
  if (segments.length > maxSegments) {
    throw new Error(`LOC dataset ${datasetId} selected ${segments.length} segments; segment budget allows ${maxSegments}`);
  }

  const totalBytes = segments.reduce((sum, segment) => sum + Number(segment.bytes || 0), 0);
  if (totalBytes > maxTotalBytes) {
    throw new Error(`LOC dataset ${datasetId} selected ${totalBytes} bytes; segment I/O budget allows ${maxTotalBytes}`);
  }

  const data = await fetchLocJsonBatch(
    segments.map(segment => ({
      path: segment.path,
      maxResponseBytes: Math.min(maxResponseBytes, Number(segment.bytes || maxResponseBytes))
    })),
    { maxItems: maxSegments, maxResponseBytes, memory }
  );

  return segments.map((segment, index) => ({ segment, data: data[index] }));
}

export function clearLocJsonCache(path) {
  if (path) memoryCache.delete(normalizeSourcePath(path));
  else memoryCache.clear();
}

export function refreshLocDataVersionManifest() {
  return Promise.resolve({ schema: 1, source: 'neon', version: null, files: {} });
}

export function refreshLocDataIndex() {
  dataIndexPromise = undefined;
  return loadDataIndex();
}

export const LOC_RUNTIME = Object.freeze({
  provider: 'neon',
  authUrl: NEON_AUTH_URL,
  dataApiUrl: NEON_DATA_API_URL,
  projection: 'api.runtime_json_documents'
});

export const LOC_IO_BUDGET = Object.freeze({
  maxBatchItems: DEFAULT_MAX_BATCH_ITEMS,
  maxConcurrentRequests: DEFAULT_GLOBAL_CONCURRENCY,
  maxResponseBytes: DEFAULT_MAX_RESPONSE_BYTES,
  maxMemoryEntries: DEFAULT_MEMORY_CACHE_ENTRIES,
  maxSegments: DEFAULT_MAX_SEGMENTS,
  maxSegmentBatchBytes: DEFAULT_MAX_SEGMENT_BATCH_BYTES
});
