import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const registryDir = path.join(root, 'data/json/registries');
const numbered = /^LOC[1-8](?:\b|[/_-])/i;
const numberedRegistryPath = /data\/json\/registries\/LOC[1-8](?:[/_-])/i;
const failures = [];

function walk(value, keyPath, inHistorical = false) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${keyPath}[${i}]`, inHistorical));
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    const next = keyPath ? `${keyPath}.${key}` : key;
    const historical = inHistorical || /historical|provenance|legacy|compatibility|former|superseded/i.test(key);

    if (!historical && typeof child === 'string') {
      if (/^(registry|authority|owner|owner_rule|primary_loc|scope)$/i.test(key) && numbered.test(child)) {
        failures.push(`${next}=${JSON.stringify(child)}`);
      }
      if (numberedRegistryPath.test(child)) {
        failures.push(`${next} contains retired Current registry path: ${JSON.stringify(child)}`);
      }
      if (/\bLOC[1-8]\b\s+(?:owns?|remains?\s+the\s+canonical\s+owner|authority)/i.test(child)) {
        failures.push(`${next} contains numbered Current ownership: ${JSON.stringify(child)}`);
      }
      if (/(?:owned\s+by|belongs\s+primarily\s+to)\s+LOC[1-8]\b/i.test(child)) {
        failures.push(`${next} contains numbered Current ownership: ${JSON.stringify(child)}`);
      }
    }
    walk(child, next, historical);
  }
}

const names = fs.readdirSync(registryDir).filter((name) => name.endsWith('.json')).sort();
for (const name of names) {
  if (/^LOC[1-8](?:[_-])/i.test(name)) {
    failures.push(`data/json/registries/${name}: retired numbered filename in Current registry root`);
    continue;
  }

  const rel = `data/json/registries/${name}`;
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch (error) {
    failures.push(`${rel}: invalid JSON (${error.message})`);
    continue;
  }
  const before = failures.length;
  walk(payload, rel, false);
  if (failures.length === before) console.log(`semantic guard ok: ${rel}`);
}

if (failures.length) {
  console.error('Current semantic contamination detected:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('All Current registries passed the semantic authority guard.');
