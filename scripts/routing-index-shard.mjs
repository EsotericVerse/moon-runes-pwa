export const ROUTING_INDEX_PREFIX_LENGTH = 2;
export const MAX_ROUTING_INDEX_SEGMENTS_PER_KEY = 24;

export function partitionRoutingEntries(segments) {
  const buckets = new Map();
  const truncated = new Set();
  for (const segment of segments) {
    for (const key of Array.isArray(segment.routing_keys) ? segment.routing_keys : []) {
      const bucket = buckets.get(key) || [];
      if (!bucket.includes(segment.id) && bucket.length < MAX_ROUTING_INDEX_SEGMENTS_PER_KEY) bucket.push(segment.id);
      else if (!bucket.includes(segment.id)) truncated.add(key);
      buckets.set(key, bucket);
    }
  }
  const prefixes = new Map();
  for (const [key, ids] of buckets) {
    const prefix = key.slice(0, ROUTING_INDEX_PREFIX_LENGTH) || '__';
    const row = prefixes.get(prefix) || { keys: {}, truncated_keys: [] };
    row.keys[key] = ids;
    if (truncated.has(key)) row.truncated_keys.push(key);
    prefixes.set(prefix, row);
  }
  return prefixes;
}
