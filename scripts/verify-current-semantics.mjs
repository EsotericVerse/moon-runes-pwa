import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  'data/json/registries/LOC_LANGUAGE_SYSTEM_REGISTRY.json',
  'data/json/registries/LOC_SHARED_SCHEMA.json',
  'data/json/registries/LOC_SHARED_MANIFEST.json',
  'data/json/registries/LOC_REFERENCE_MODEL.json',
  'data/json/registries/LOC_SOURCE_TYPE_REGISTRY.json',
  'data/json/registries/LOC_CONTENT_TYPE_REGISTRY.json',
  'data/json/registries/LOC_CONTENT_RIGHTS_POLICY.json',
  'data/json/registries/LOC_SOURCE_SYNC_POLICY.json',
  'data/json/registries/LOC_ANALYSIS_TYPE_REGISTRY.json',
  'data/json/registries/LOC_SEMANTIC_FAMILY_REGISTRY.json',
  'data/json/registries/LOC_KEYWORD_GOVERNANCE.json',
  'data/json/registries/LUNARUNES_READING_EXAMPLE_REGISTRY.json',
  'data/json/registries/LUNARUNES_RUNE_METHODOLOGY_REGISTRY.json',
  'data/json/registries/ANALYSIS_LINGUISTIC_REGISTRY.json',
  'data/json/registries/LO3RWANG_MANIFEST.json',
  'data/json/registries/LUNARUNES_MANIFEST.json',
  'data/json/registries/FEATURE_MANIFEST.json',
];

const numbered = /^LOC[1-8](?:\b|[/_-])/i;
const failures = [];
function walk(value, keyPath, inHistorical = false) {
  if (Array.isArray(value)) { value.forEach((item, i) => walk(item, `${keyPath}[${i}]`, inHistorical)); return; }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const next = keyPath ? `${keyPath}.${key}` : key;
    const historical = inHistorical || /historical|provenance|legacy|compatibility/i.test(key);
    if (!historical && typeof child === 'string') {
      if (/^(authority|owner|owner_rule|primary_loc)$/i.test(key) && numbered.test(child)) failures.push(`${next}=${JSON.stringify(child)}`);
      if (/\bLOC[1-8]\b\s+(?:owns?|remains?\s+the\s+canonical\s+owner|authority)/i.test(child)) failures.push(`${next} contains numbered Current ownership: ${JSON.stringify(child)}`);
      if (/(?:owned\s+by|belongs\s+primarily\s+to)\s+LOC[1-8]\b/i.test(child)) failures.push(`${next} contains numbered Current ownership: ${JSON.stringify(child)}`);
      if (/data\/json\/registries\/LOC[1-8](?:[/_-])/i.test(child)) failures.push(`${next} contains retired Current registry path: ${JSON.stringify(child)}`);
    }
    walk(child, next, historical);
  }
}

const registryDir = path.join(root, 'data/json/registries');
for (const name of fs.readdirSync(registryDir)) {
  if (/^LOC[1-8](?:[_-])/i.test(name)) failures.push(`data/json/registries/${name}: retired numbered filename in Current registry root`);
}

for (const rel of files) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) { failures.push(`${rel}: missing guarded Current file`); continue; }
  let payload;
  try { payload = JSON.parse(fs.readFileSync(full, 'utf8')); } catch (error) { failures.push(`${rel}: invalid JSON (${error.message})`); continue; }
  const before = failures.length; walk(payload, rel, false);
  if (failures.length === before) console.log(`semantic guard ok: ${rel}`);
}
if (failures.length) { console.error('Current semantic contamination detected:'); failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); }
console.log('Current semantic authority guard passed.');
