import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';

const root = process.cwd();
const entrypoints = ['runes.html', 'lo3rwang.html'];
const reachable = new Set();
const missing = [];
const queue = [];
const retiredLinkViolations = [];

function normalizeRel(path) {
  return normalize(path).replaceAll('\\', '/');
}

function localPath(fromFile, specifier) {
  const clean = String(specifier || '').split(/[?#]/, 1)[0];
  if (!clean || /^(?:https?:|data:|mailto:|tel:|\/\/)/i.test(clean)) return null;
  if (clean.startsWith('/')) return normalizeRel(clean.slice(1));

  const rootCandidate = normalizeRel(clean);
  if (!clean.startsWith('.') && existsSync(resolve(root, rootCandidate))) return rootCandidate;
  return normalizeRel(join(dirname(fromFile), clean));
}

function enqueue(path, parent) {
  const rel = normalizeRel(path);
  if (reachable.has(rel)) return;
  const abs = resolve(root, rel);
  if (!existsSync(abs)) {
    missing.push(`${parent} -> ${rel}`);
    return;
  }
  reachable.add(rel);
  if (/\.js$/i.test(rel)) queue.push(rel);
}

for (const html of entrypoints) {
  const abs = resolve(root, html);
  if (!existsSync(abs)) {
    missing.push(`entrypoint missing: ${html}`);
    continue;
  }
  const text = readFileSync(abs, 'utf8');
  reachable.add(html);
  for (const match of text.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const dep = localPath(html, match[1]);
    if (dep) enqueue(dep, html);
  }
}

while (queue.length) {
  const file = queue.shift();
  const text = readFileSync(resolve(root, file), 'utf8');
  const specs = [];
  for (const match of text.matchAll(/\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g)) specs.push(match[1]);
  for (const match of text.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) specs.push(match[1]);
  for (const match of text.matchAll(/\bappendScript\s*\(\s*["']([^"']+)["']/g)) specs.push(match[1]);
  for (const spec of specs) {
    const dep = localPath(file, spec);
    if (dep) enqueue(dep, file);
  }
}

function scanRetiredFile(path) {
  if (!existsSync(path) || !statSync(path).isFile()) return;
  if (!/\.(?:html|js|jsx|mjs)$/i.test(path)) return;
  const text = readFileSync(path, 'utf8');
  if (/\blots\.html(?:[?#]|\b)/i.test(text)) retiredLinkViolations.push(relative(root, path));
}

function scanRetiredLinks(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.next' || name === 'out' || name === 'public') continue;
      scanRetiredLinks(path);
    } else {
      scanRetiredFile(path);
    }
  }
}

for (const scope of ['app', 'lib', 'js']) scanRetiredLinks(resolve(root, scope));
for (const name of readdirSync(root)) if (/\.html$/i.test(name)) scanRetiredFile(resolve(root, name));

const jsDir = resolve(root, 'js');
const allJs = existsSync(jsDir)
  ? readdirSync(jsDir).filter(name => name.endsWith('.js')).map(name => `js/${name}`).sort()
  : [];
const unreachable = allJs.filter(path => !reachable.has(path));

if (missing.length) {
  console.error('[static-entrypoints] missing runtime dependencies:\n' + missing.join('\n'));
  process.exit(1);
}
if (retiredLinkViolations.length) {
  console.error('[static-entrypoints] retired lots.html links found; use runes.html:\n' + retiredLinkViolations.join('\n'));
  process.exit(1);
}

console.log(`[static-entrypoints] verified ${entrypoints.length} active static entrypoints; ${[...reachable].filter(path => path.endsWith('.js')).length} JS files reachable`);
console.log('[static-entrypoints] retired lots.html link guard passed');
if (unreachable.length) console.log('[static-entrypoints] unreachable legacy JS candidates:\n' + unreachable.join('\n'));
