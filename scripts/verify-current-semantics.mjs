import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  'data/json/registries/LOC_TERMINOLOGY_CANON.json',
  'data/json/registries/LOC_DATA_GOVERNANCE.json',
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
  'data/json/registries/LOC1_READING_EXAMPLE_REGISTRY.json',
  'data/json/registries/LOC7_LINGUISTIC_ANALYSIS_REGISTRY.json',
];

const numbered = /^LOC[1-8](?:\b|[/_-])/i;
const failures = [];
const FINAL_LOC_ZH='模型化語言框架';
const FINAL_LOC_EN='Modelized Language Framework';
const FINAL_RUNES_ZH='符號式語言';
const FINAL_RUNES_EN='Symbolic Language';
const RETIRED_CURRENT_TERMS=['語言系統模組框架','Language Module Framework','模組化語言框架','Modular Language Framework','符號式語言模組','Symbolic Language Module','語言模型框架','Language Model Framework'];
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
      for(const retired of RETIRED_CURRENT_TERMS) if(child.includes(retired)) failures.push(`${next} contains retired Current identity term ${JSON.stringify(retired)}`);
    }
    walk(child, next, historical);
  }
}
for (const rel of files) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) { failures.push(`${rel}: missing guarded Current file`); continue; }
  let payload;
  try { payload = JSON.parse(fs.readFileSync(full, 'utf8')); } catch (error) { failures.push(`${rel}: invalid JSON (${error.message})`); continue; }
  const before = failures.length; walk(payload, rel, false);
  if(rel.endsWith('LOC_TERMINOLOGY_CANON.json')){
    if(payload?.current?.LOC?.zh!==FINAL_LOC_ZH||payload?.current?.LOC?.en!==FINAL_LOC_EN) failures.push(`${rel}: LOC final identity mismatch`);
    if(payload?.current?.LunaRunes?.zh!==FINAL_RUNES_ZH||payload?.current?.LunaRunes?.en!==FINAL_RUNES_EN) failures.push(`${rel}: LunaRunes final identity mismatch`);
    if(payload?.identity_version!=='latest-and-last'||payload?.identity_frozen!==true) failures.push(`${rel}: identity version must remain latest-and-last and frozen`);
    if(payload?.current?.LOC?.identity_frozen!==true||payload?.current?.LunaRunes?.identity_frozen!==true) failures.push(`${rel}: Current identities must remain frozen`);
    if(!/latest and last|final frozen/i.test(String(payload?.final_identity_rule||''))) failures.push(`${rel}: final frozen identity rule missing`);
  }
  if (failures.length === before) console.log(`semantic guard ok: ${rel}`);
}
if (failures.length) { console.error('Current semantic contamination detected:'); failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); }
console.log('Current semantic authority guard passed.');
