import { createHash } from 'node:crypto';

const tokenHash = token => createHash('sha256').update(token).digest('hex').slice(0, 12);

function tokens(text) {
  const value = String(text || '').normalize('NFKC').toLocaleLowerCase('zh-Hant');
  const out = [];
  for (const run of value.match(/[\u3400-\u9fff]+/g) || []) {
    const chars = Array.from(run);
    for (let i = 0; i < chars.length; i += 1) {
      out.push(chars[i]);
      if (i + 1 < chars.length) out.push(chars[i] + chars[i + 1]);
    }
  }
  for (const word of value.match(/[a-z0-9][a-z0-9_-]{1,}/g) || []) out.push(word);
  return out;
}

function visit(value, counts = new Map(), depth = 0) {
  if (depth > 8 || value == null) return counts;
  if (typeof value === 'string' || typeof value === 'number') {
    for (const token of tokens(value)) counts.set(token, (counts.get(token) || 0) + 1);
  } else if (Array.isArray(value)) {
    for (const item of value) visit(item, counts, depth + 1);
  } else if (typeof value === 'object') {
    for (const item of Object.values(value)) visit(item, counts, depth + 1);
  }
  return counts;
}

export function buildRoutingFingerprint(data, limit = 8192) {
  const ranked = [...visit(data).entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hant'))
    .slice(0, limit)
    .map(([token]) => tokenHash(token));
  return { algorithm: 'sha256-cjk1-2-latin-v1', hashes: [...new Set(ranked)].sort() };
}
