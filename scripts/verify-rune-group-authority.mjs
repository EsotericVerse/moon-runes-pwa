import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = process.cwd();
const json = rel => JSON.parse(readFileSync(resolve(root, rel), 'utf8'));
const failures = [];
const authorityPath = 'data/json/core/runes66groups.json';
const authority = json(authorityPath);
const groups = Array.isArray(authority.groups) ? authority.groups : [];
const expectedIds = ['soul','link','life','nature','mineral','element','order','disorder','system_special'];

if (groups.length !== 9) failures.push(`Core Group Spec must contain 9 groups; found ${groups.length}`);
if (groups.map(group => group.id).join('|') !== expectedIds.join('|')) failures.push('Core Group Spec group order/id set changed');
const seventh = groups[6];
if (seventh?.id !== 'order' || seventh?.group_zh !== '秩序' || seventh?.group_en !== 'Order') {
  failures.push('seventh group must be id=order, group_zh=秩序, group_en=Order');
}
if (authority.historical_aliases && Object.hasOwn(authority.historical_aliases, '定序')) {
  failures.push('Core Group Spec must not record 定序 as a historical alias');
}

const members = new Map();
for (const group of groups) {
  if (!group.id || !group.group_zh || !group.group_en || !Array.isArray(group.runes)) failures.push(`invalid group shape: ${group.id || '<missing id>'}`);
  for (const rune of group.runes || []) {
    const id = Number(rune.id);
    if (members.has(id)) failures.push(`rune ${id} belongs to more than one group`);
    members.set(id, { ...rune, group });
  }
}
for (let id = 0; id <= 66; id += 1) if (!members.has(id)) failures.push(`Core Group Spec is missing rune ${id}`);

const runes = json('data/json/core/runes.json');
for (const row of runes) {
  const id = Number(row.編號);
  const member = members.get(id);
  if (!member) { failures.push(`runes.json rune ${id} is absent from Core Group Spec`); continue; }
  if (row.符文名稱 !== member.zh) failures.push(`rune ${id} Chinese name diverges from Core Group Spec`);
  if (row.英文 !== member.en) failures.push(`rune ${id} English name diverges from Core Group Spec`);
  if (row.所屬分組 !== member.group.group_zh) failures.push(`rune ${id} group diverges from Core Group Spec`);
}

const terminology = json('data/json/registries/LOC_TERMINOLOGY_CANON.json');
if (terminology?.historical_only?.rune_group_aliases?.定序) failures.push('terminology canon must not classify 定序 as an alias');
const manifest = json('data/json/registries/LOC_SHARED_MANIFEST.json');
const runeContext = manifest.registries?.find(item => item.id === 'rune_context');
if (runeContext?.path !== 'data/json/registries/RUNE_CONTEXT_REGISTRY.json') failures.push('rune context registry must not use a numbered LOC owner');
const contextRegistry = json('data/json/registries/RUNE_CONTEXT_REGISTRY.json');
if (contextRegistry?.authority !== authorityPath || contextRegistry?.projection_policy?.may_create_group_definitions !== false) failures.push('rune context extensions must remain consumers of Core Group authority');

const scanRoots = ['app', 'js', 'services', 'data/json/core', 'data/json/registries'];
const textExt = new Set(['.js', '.jsx', '.mjs', '.json', '.py']);
const allowedSequencing = new Set(['data/json/registries/LOC1_READING_EXAMPLE_REGISTRY.json']);
const walk = dir => readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap(entry => {
  const rel = join(dir, entry.name).replaceAll('\\', '/');
  return entry.isDirectory() ? walk(rel) : [rel];
});
for (const rel of scanRoots.flatMap(walk)) {
  if (!textExt.has(extname(rel)) || allowedSequencing.has(rel)) continue;
  const text = readFileSync(resolve(root, rel), 'utf8');
  if (/sequencing|定序/i.test(text)) failures.push(`${rel} contains unauthorized Rune Group terminology`);
  if (/\bGROUP_DEFS\b/.test(text)) failures.push(`${rel} declares a second group-definition table`);
  if (/\bGROUP_ORDER\b/.test(text)) failures.push(`${rel} declares a second group-order table`);
  if (/rune/i.test(rel) && /\bconst\s+GROUPS\s*=\s*\[/.test(text)) failures.push(`${rel} hard-codes a Rune Group list`);
}

const routeSource = readFileSync(resolve(root, 'app/runes/list/[groupId]/page.jsx'), 'utf8');
if (!/groupAuthority\.groups\.find\(item => item\.id === groupId\)/.test(routeSource)) failures.push('group route must resolve directly from Core groups[].id');

if (failures.length) {
  console.error('Rune Group authority verification failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Rune Group authority verified: one Core definition, complete parity, /runes/list/order route.');
