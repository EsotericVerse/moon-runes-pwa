import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const names = [
  '靈','魂','彩','憶','界','域','鏡','核','向','斷','封','鍊','啟','分','悟','誤',
  '生','老','病','死','心','愛','語','韻','樹','花','葉','草','根','種','實','枝',
  '金','玉','晶','地','石','鑽','礦','塵','光','暗','水','火','風','土','雷','氣',
  '日','月','星','辰','明','時','空','因','福','禍','無','夢','幻','緣','虛','果','玄','命'
];
const failures = [];

function json(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function verifyRows(label, path, nameKey, requiredKeys = []) {
  const rows = json(path);
  if (!Array.isArray(rows)) {
    failures.push(`${label}: expected array`);
    return [];
  }
  if (rows.length !== 66) failures.push(`${label}: expected 66 rows, got ${rows.length}`);
  const byId = new Map(rows.map(row => [Number(row?.編號), row]));
  names.forEach((name, index) => {
    const id = index + 1;
    const row = byId.get(id);
    if (!row) return failures.push(`${label}: missing rune #${id} ${name}`);
    if (String(row?.[nameKey] ?? '') !== name) failures.push(`${label}: #${id} name mismatch (${row?.[nameKey]} != ${name})`);
    for (const key of requiredKeys) {
      if (String(row?.[key] ?? '').trim() === '') failures.push(`${label}: #${id} ${name} missing ${key}`);
    }
  });
  return rows;
}

verifyRows('runes', 'data/json/core/runes.json', '符文名稱', ['符文說明','正向表示','半正向表示','半逆向表示','逆向表示']);
verifyRows('lots', 'data/json/core/lots.json', '名稱', ['正向表示','半正向表示','半逆向表示','逆向表示']);
verifyRows('history', 'data/json/core/history.json', '名稱', ['符文變化歷史','神話故事']);
verifyRows('harmony', 'data/json/core/harmony.json', '名稱', ['靈魂課題','實踐挑戰','配套儀式建議','能量調和建議']);

names.forEach((name, index) => {
  const id = String(index + 1).padStart(2, '0');
  const path = `assets/lunarunes/cards/${id}_${name}.png`;
  if (!existsSync(resolve(root, path))) failures.push(`cards: missing ${path}`);
});

const evolution = json('data/json/registries/LUNARUNE_EVOLUTION_HISTORY.json');
const cases = evolution?.semantic_history_cases ?? [];
const governance = evolution?.governance_evolution ?? [];
const stages = evolution?.system_stages ?? [];
const coverage = evolution?.coverage ?? {};
if (!Array.isArray(cases) || cases.length === 0) failures.push('evolution: semantic_history_cases is empty');
if (!Array.isArray(governance) || governance.length === 0) failures.push('evolution: governance_evolution is empty');
if (!Array.isArray(stages) || !stages.some(stage => Number(stage?.rune_count) === 66)) failures.push('evolution: missing Base66 system stage');
if (Number(coverage.semantic_history_case_count) !== cases.length) failures.push(`evolution: coverage case count ${coverage.semantic_history_case_count} != actual ${cases.length}`);
if (Number(coverage.governance_evolution_count) !== governance.length) failures.push(`evolution: governance count ${coverage.governance_evolution_count} != actual ${governance.length}`);

const writing = json('data/json/registries/LOC4_WRITING_REGISTRY.json');
const works = writing?.works ?? [];
if (!Array.isArray(works) || works.length === 0) failures.push('writing: LOC4 registry has no works');
for (const work of works) {
  for (const key of ['work_id','title','content_type']) if (!String(work?.[key] ?? '').trim()) failures.push(`writing: work missing ${key}`);
}

if (failures.length) {
  console.error('RC4 integrity verification failed:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`RC4 integrity OK: 66 runes + lots + history + harmony + cards; ${cases.length} evolution cases; ${works.length} LOC4 works.`);
