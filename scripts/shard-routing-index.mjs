import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PUBLIC = path.join(process.cwd(), 'public');
const PREFIX_LENGTH = 2;
const ROOT_INDEX = path.join(PUBLIC, 'loc-data-index.json');

const readJson = async file => JSON.parse(await readFile(file, 'utf8'));

function shardRoutingIndex(datasetId, routingIndex) {
  const keys = routingIndex?.keys && typeof routingIndex.keys === 'object' ? routingIndex.keys : {};
  const truncated = new Set(Array.isArray(routingIndex?.truncated_keys) ? routingIndex.truncated_keys : []);
  const groups = new Map();
  for (const [key, ids] of Object.entries(keys)) {
    const prefix = key.slice(0, PREFIX_LENGTH) || '__';
    const row = groups.get(prefix) || { keys: {}, truncated_keys: [] };
    row.keys[key] = ids;
    if (truncated.has(key)) row.truncated_keys.push(key);
    groups.set(prefix, row);
  }

  const shards = {};
  for (const [prefix, row] of groups) {
    row.truncated_keys.sort();
    const rel = `loc-routing-index/${datasetId}/${prefix}.json`;
    const payload = `${JSON.stringify({ schema: 2, dataset: datasetId, prefix, prefix_length: PREFIX_LENGTH, ...row }, null, 2)}\n`;
    shards[prefix] = `/${rel}`;
    returnNodeWrite.push({ rel, payload });
  }
  return { schema: 2, strategy: 'prefix-sharded', prefix_length: PREFIX_LENGTH, max_segments_per_key: Number(routingIndex?.max_segments_per_key || 24), shards };
}

const returnNodeWrite = [];
const index = await readJson(ROOT_INDEX);
for (const [datasetId, dataset] of Object.entries(index.datasets || {})) {
  const routingIndex = dataset?.routing_index;
  if (!routingIndex?.keys || typeof routingIndex.keys !== 'object') continue;
  dataset.routing_index = shardRoutingIndex(datasetId, routingIndex);
  if (Array.isArray(dataset.segments)) {
    dataset.segments = dataset.segments.map(({ routing_keys, ...segment }) => segment);
  }
}
for (const { rel, payload } of returnNodeWrite) {
  const file = path.join(PUBLIC, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, payload, 'utf8');
}
await writeFile(ROOT_INDEX, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
console.log(`[routing-index] sharded ${returnNodeWrite.length} routing files`);
