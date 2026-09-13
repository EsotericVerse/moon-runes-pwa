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
    if (/<style\b/i.test(text)) failures.push(`${rel}: inline style tag`);
  }
  if (/\.css$/.test(path) && rel !== 'app/styles/tokens.css') {
    const colorMatches = text.match(/#[0-9a-fA-F]{3,8}\b|rgba?\s*\([^)]*\)|hsla?\s*\([^)]*\)/g) || [];
    for (const match of colorMatches) failures.push(`${rel}: raw color ${match}`);
  }
});

const canonicalPath = resolve(root, 'data/json/core/runes.json');
if (!existsSync(canonicalPath)) {
  failures.push('data/json/core/runes.json: missing canonical rune source');
} else {
  try {
    const rows = JSON.parse(readFileSync(canonicalPath, 'utf8'));
    if (!Array.isArray(rows) || rows.length < 66) failures.push(`data/json/core/runes.json: expected at least 66 rows, got ${Array.isArray(rows) ? rows.length : 'non-array'}`);
    else {
      const ids = new Set(rows.map(row => Number(row.編號)));
      for (let id = 1; id <= 66; id += 1) if (!ids.has(id)) failures.push(`data/json/core/runes.json: missing rune id ${id}`);
    }
  } catch (error) {
    failures.push(`data/json/core/runes.json: invalid JSON (${error.message})`);
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

walk(resolve(root, 'app/loc/views'), path => {
  if (!/\.(?:js|jsx|mjs)$/.test(path)) return;
  const rel = relative(root, path).replaceAll('\\', '/');
  const text = readFileSync(path, 'utf8');
  if (/['"`]\/data\/json\//.test(text)) failures.push(`${rel}: hardcoded /data/json path; register it in LOC_DATA`);
});

const dataRuntime = readFileSync(resolve(root, 'app/loc/data.js'), 'utf8');
if (!/DEFAULT_GLOBAL_CONCURRENCY\s*=\s*2\b/.test(dataRuntime)) failures.push('app/loc/data.js: global JSON concurrency budget must remain 2');

const searchView = readFileSync(resolve(root, 'app/loc/views/SearchView.jsx'), 'utf8');
if (/useEffect\s*\([^)]*fetchLocJson\s*\(\s*LOC_DATA\.(?:TEXT_CORPUS_MANIFEST|MUSIC_SEARCH_MANIFEST)/s.test(searchView)) failures.push('SearchView: manifests must not load eagerly on mount');
if (!/fetchLocJsonBatch\(smallRequests,\{concurrency:2\}\)/.test(searchView)) failures.push('SearchView: small-source concurrency must remain 2');
if (!/SEGMENT_BATCH_SIZE\s*=\s*2\b/.test(searchView)) failures.push('SearchView: corpus segment batch size must remain 2');
if (!/fetchLocDataSegments\(datasetId,\{segmentIds:chunk\.map\(segment=>segment\.id\),maxSegments:SEGMENT_BATCH_SIZE\}\)/.test(searchView)) failures.push('SearchView: corpus data must use bounded incremental segment loading');

const contextView = readFileSync(resolve(root, 'app/loc/views/ContextView.jsx'), 'utf8');
if (/if\s*\(tab===['"]overview['"][^\n]*\)\s*load\(/.test(contextView)) failures.push('ContextView: overview must remain zero-data');

const evolutionView = readFileSync(resolve(root, 'app/loc/views/EvolutionView.jsx'), 'utf8');
if (/if\s*\(tab===['"]overview['"][^\n]*LUNARUNE_EVOLUTION_HISTORY/.test(evolutionView)) failures.push('EvolutionView: overview must not preload rune evolution history');
if (!/if\s*\(tab===['"]overview['"]&&!eras\)load\(LOC_DATA\.LOC_ERA_REGISTRY,setEras\)/.test(evolutionView)) failures.push('EvolutionView: overview should load only the ERA registry');

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
console.log('[modularity] Next presentation/data/performance budgets verified');
