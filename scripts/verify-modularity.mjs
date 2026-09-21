import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

function walk(dir, callback) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, callback);
    else callback(path);
  }
}

walk(resolve(root, 'app'), path => {
  if (!/\.(?:js|jsx|mjs|css)$/.test(path)) return;
  const rel = relative(root, path).replaceAll('\\', '/');
  const text = readFileSync(path, 'utf8');
  if (/\.(?:js|jsx|mjs)$/.test(path)) {
    const styleMatches = text.match(/\bstyle\s*=\s*\{\{[^}]+\}\}/g) || [];
    for (const match of styleMatches) {
      const governedRuneRotation = rel === 'app/runes/RunesClient.jsx' && /^style=\{\{transform:ROTATIONS\[draw\.directionIndexes\[index\]\]\}\}$/.test(match.replace(/\s+/g, ''));
      if (!governedRuneRotation) failures.push(`${rel}: inline React style`);
    }
    if (rel !== 'app/lo3rwang/old/page.jsx' && /<style\b/i.test(text)) failures.push(`${rel}: inline style tag`);
  }
  if (/\.css$/.test(path) && rel !== 'app/styles/tokens.css') {
    const colorMatches = text.match(/#[0-9a-fA-F]{3,8}\b|rgba?\s*\([^)]*\)|hsla?\s*\([^)]*\)/g) || [];
    for (const match of colorMatches) failures.push(`${rel}: raw color ${match}`);
  }
});

const canonicalPath = resolve(root, 'data/json/core/runes.json');
let canonicalRunes = [];
if (!existsSync(canonicalPath)) failures.push('data/json/core/runes.json: missing canonical rune source');
else {
  try {
    const rows = JSON.parse(readFileSync(canonicalPath, 'utf8'));
    canonicalRunes = Array.isArray(rows) ? rows : [];
    if (!Array.isArray(rows) || rows.length < 66) failures.push(`data/json/core/runes.json: expected at least 66 rows, got ${Array.isArray(rows) ? rows.length : 'non-array'}`);
    else {
      const ids = new Set(rows.map(row => Number(row.編號)));
      for (let id = 1; id <= 66; id += 1) if (!ids.has(id)) failures.push(`data/json/core/runes.json: missing rune id ${id}`);
    }
  } catch (error) { failures.push(`data/json/core/runes.json: invalid JSON (${error.message})`); }
}

const unifiedSearchPath = resolve(root, 'services/api/card/unified_search.py');
if (existsSync(unifiedSearchPath) && canonicalRunes.length) {
  const text = readFileSync(unifiedSearchPath, 'utf8');
  const block = text.match(/group_defs\s*=\s*\{([\s\S]*?)\n\s*\}/)?.[1] || '';
  if (block) {
    const actual = new Map();
    for (const match of block.matchAll(/"([^"]+組)"\s*:\s*\{([^}]*)\}/g)) actual.set(match[1], new Set([...match[2].matchAll(/"([^"]+)"/g)].map(item => item[1])));
    const expected = new Map();
    for (const rune of canonicalRunes) {
      const group = String(rune?.所屬分組 || '').trim();
      const name = String(rune?.符文名稱 || rune?.名稱 || '').trim();
      if (!group || !name) continue;
      const key = group.endsWith('組') ? group : `${group}組`;
      if (!expected.has(key)) expected.set(key, new Set());
      expected.get(key).add(name);
    }
    const groups = new Set([...actual.keys(), ...expected.keys()]);
    for (const group of groups) {
      const left = [...(actual.get(group) || new Set())].sort().join('|');
      const right = [...(expected.get(group) || new Set())].sort().join('|');
      if (left !== right) failures.push(`services/api/card/unified_search.py: ${group} rune membership diverges from canonical runes.json`);
    }
  }
}

const allowedCanonicalRefs = new Set(['app/loc/data-paths.mjs']);
const runtimeCanonicalRef = /data\/json\/core\/runes\.json\b/;
function verifyRuntimeRefs(scanRoot) {
  walk(resolve(root, scanRoot), path => {
    if (!/\.(?:js|jsx|mjs)$/.test(path)) return;
    const rel = relative(root, path).replaceAll('\\', '/');
    const text = readFileSync(path, 'utf8');
    if (/runes(?:64|66)\.(?:js|json)\b/i.test(text)) failures.push(`${rel}: legacy rune projection reference`);
    if (!allowedCanonicalRefs.has(rel) && runtimeCanonicalRef.test(text)) failures.push(`${rel}: canonical runes runtime path must go through shared data-path module`);
  });
}
verifyRuntimeRefs('app');

for(const retired of ['app/loc/local-db.js','app/loc/google-drive.js','app/loc/storage.js','app/loc/auth-client.js']){
  if(existsSync(resolve(root,retired)))failures.push(`${retired}: retired persistence/auth module must remain removed`);
}
const neonUserStorage=readFileSync(resolve(root,'app/loc/neon-user-storage.js'),'utf8');
if(!/user_records/.test(neonUserStorage)||!/user_settings/.test(neonUserStorage))failures.push('Neon user persistence contract missing');
const dataRuntime = readFileSync(resolve(root, 'app/loc/data.js'), 'utf8');
if (!/DEFAULT_GLOBAL_CONCURRENCY\s*=\s*2\b/.test(dataRuntime)) failures.push('app/loc/data.js: global JSON concurrency budget must remain 2');

const searchView = readFileSync(resolve(root, 'app/modular-v2/features/SearchV2.jsx'), 'utf8');
if (!/selectNeonSearchRows\(collection\.id\)/.test(searchView)) failures.push('SearchV2: search must use direct Neon SELECT');
if (/fetchLocJson|fetchLocDataSegments|getLocDataDataset|runtime_json_documents|manifest|shard|search-routing|search-telemetry/.test(searchView)) failures.push('SearchV2: JSON, manifest, shard, routing, telemetry and runtime projection paths must not be used');
const neonSearch = readFileSync(resolve(root, 'app/loc/neon-search.js'), 'utf8');
if (!/\.select\('\*',\{count:'exact'\}\)\.range\(/.test(neonSearch)) failures.push('Neon Search: direct paged SELECT contract missing');
if (!/neonClient\.schema\(schema\)\.from\(table\)/.test(neonSearch)) failures.push('Neon Search: schema-qualified tables must use the schema API');

const scopeGovernance = readFileSync(resolve(root, 'app/loc/neon-scope-governance.js'), 'utf8');
if (!/rpc\('decide_scope_relation_request'/.test(scopeGovernance)) failures.push('Scope governance: approval must use the atomic Neon RPC');
if (!/requested_by:requestedBy/.test(scopeGovernance)) failures.push('Scope governance: relation requests must record the requester');
const scopeManagement = readFileSync(resolve(root, 'app/modular-v2/ScopeManagementV2.jsx'), 'utf8');
if (!/useNeonAccount/.test(scopeManagement)||!/account\.canManage/.test(scopeManagement)) failures.push('Scope management: session and manager role gate missing');
const routeParamFiles = [
  'app/context/[section]/page.jsx',
  'app/culture/[section]/page.jsx',
  'app/culture/galaxy/[section]/page.jsx',
  'app/governance/[section]/page.jsx',
  'app/lo3rwang/[section]/page.jsx',
  'app/statics/[section]/page.jsx',
  'app/statics/[section]/[kind]/page.jsx'
];
for (const routeFile of routeParamFiles) {
  const routeSource = readFileSync(resolve(root, routeFile), 'utf8');
  if (!/export default async function/.test(routeSource)||!/await params/.test(routeSource)) failures.push(`${routeFile}: dynamic params must be awaited`);
}

const contextView = readFileSync(resolve(root, 'app/modular-v2/features/ContextV2.jsx'), 'utf8');
if (!/scopeDataViewV2\(scopeId,'context'\)/.test(contextView)) failures.push('ContextV2: context projection must derive from shared Scope registry');
const scopeProjection = readFileSync(resolve(root, 'app/loc/neon-scope-projections.js'), 'utf8');
if (!/scopeDataViewV2\(scopeId,projection\)/.test(scopeProjection)) failures.push('Scope projections must use the shared Scope registry');
if (!/selectScopeProjectionRows\(scopeId,'context'\)/.test(contextView)) failures.push('ContextV2: context reads must use shared Scope projection loader');
const statisticsView = readFileSync(resolve(root, 'app/modular-v2/features/StatisticsV2.jsx'), 'utf8');
if (!/selectScopeRankingPage\(scopeId/.test(statisticsView)) failures.push('StatisticsV2: ranking reads must use Neon SQL pagination loader');
const staticsView = readFileSync(resolve(root, 'app/modular-v2/features/StatisticsV2.jsx'), 'utf8');
if (!/scopeDataViewV2\(scopeId,'rankings'\)/.test(staticsView)) failures.push('StatisticsV2: ranking projection must derive from shared Scope registry');
const cultureView = readFileSync(resolve(root, 'app/modular-v2/features/CultureV2.jsx'), 'utf8');
if (!/CULTURE_PATHS_V2/.test(cultureView)) failures.push('CultureV2: physical historical dataset identifiers must remain behind migration bridge');

for (const name of readdirSync(root).filter(name => name.endsWith('.html'))) {
  const path = resolve(root, name);
  const text = readFileSync(path, 'utf8');
  const inlineCount = (text.match(/\sstyle\s*=/g) || []).length;
  const styleTagCount = (text.match(/<style\b/gi) || []).length;
  if (inlineCount || styleTagCount) warnings.push(`${name}: ${inlineCount} inline style attrs, ${styleTagCount} style tags`);
}

if (warnings.length) console.warn('[modularity] legacy presentation debt (non-blocking until redirect retirement):\n' + warnings.join('\n'));
if (failures.length) {
  console.error('[modularity] violations:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('[modularity] V2 presentation/data/performance/storage/canonical parity boundaries verified');
