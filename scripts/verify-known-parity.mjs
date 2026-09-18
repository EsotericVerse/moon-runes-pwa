import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const failures = [];
const text = path => readFileSync(resolve(root, path), 'utf8');
const requireFile = path => { if (!existsSync(resolve(root, path))) failures.push(`missing required file: ${path}`); };
function requireText(path, needles) {
  const source = text(path);
  for (const needle of needles) if (!source.includes(needle)) failures.push(`${path}: missing ${needle}`);
}
function forbidText(path, needles) {
  const source = text(path);
  for (const needle of needles) if (source.includes(needle)) failures.push(`${path}: stale/forbidden ${needle}`);
}

for (const path of [
  'LunaRune66.xlsx', 'LunarRunesCardCut.pdf', 'pics/LOC-FrameworkPic.png',
  'pics/LOC-structure.png', 'pics/LunaRunes.jpg', 'pics/aboutme.png', 'js/runes-core.js',
  'js/galaxy.js', 'js/writing.js', 'js/rune-graph-core.js'
]) requireFile(path);
if (existsSync(resolve(root, 'lib'))) failures.push('lib/ must not be recreated; shared JavaScript belongs in js/');

requireText('app/loc/views/AboutView.jsx', ['LOC月典','ModelArchitectureExplorer','Base66','/pics/LunaRunes.jpg']);
requireText('app/nav-route-map.js', ['lo3rwang.lo3rwang.cc','lrunes.lo3rwang.cc','admin.lo3rwang.cc',"return 'lo3rwang'",'月之符文','語彙','風格詞','Admin']);
requireText('app/ScopeNav.jsx', ['SHARED_NAV_FUNCTIONS','role="search"','navRoute(cfg,\'search\')','搜尋']);
requireText('app/GlobalFooter.jsx', ['<footer className="loc-site-footer">','https://lo3rwang.lo3rwang.cc/','Lucas Oscar Wang 政德','mailto:sopa2306@gmail.com']);
forbidText('app/nav-route-map.js', ['author.lo3rwang.cc','whoami.lo3rwang.cc','manage.lo3rwang.cc']);
forbidText('app/GlobalFooter.jsx', ['author.lo3rwang.cc','whoami.lo3rwang.cc']);

requireText('app/runes/page.jsx', ['<RuneDrawClient />','<RuneAtlasHome />','?mode=daily','LunaRunes','Context','Culture']);
requireText('app/runes/RuneDrawClient.jsx', ['RUNE_DRAW_MODES', 'runeSpread', '<div className="runes-draw-surface">', 'realMoonPhase', '每日占卜提醒', '兩張過去成因', '核心五卡治理／建議']);
requireText('app/loc/model/moon-phase.js', ['day >= 1 && day <= 7', "return '新月'", "return '上弦'", "return '滿月'", "return '下弦'", "return '空亡'"]);

requireText('data/json/registries/LOC_TERMINOLOGY_CANON.json', ['Modular Language Framework','data/json/core/runes66groups.json','第七組固定為秩序（Order）','"scope_id": "lo3rwang"','"canonical_host": "lo3rwang.lo3rwang.cc"','"base_domain": "lo3rwang.cc"']);
requireText('data/json/registries/LOC_DATA_GOVERNANCE.json', ['Scope Model × Feature Model → Page Composition','feature_identities','Culture／文化']);
requireText('docs/NAV_GOVERNANCE.md', ['每個介面只有一條正式導覽列','網域優先，目錄其次，頁面最後','lo3rwang.lo3rwang.cc','admin.lo3rwang.cc','功能級導覽一律使用正式階層 route']);
requireText('services/cloudflare/loc-state-worker.js', ["const ROUTE_TREE_KEY = 'loc:route:registry'",'parent_id','manager_route','route_has_children']);
requireText('app/admin/RouteRegistryManager.jsx', ['新增下層','插入上層','manager_route','platform:routes:write']);

requireText('scripts/prepare-next-public.mjs', ['PUBLIC_PICS', "'LunarRunesCardCut.pdf'", "'LunaRunes.jpg'"]);
requireText('scripts/verify-public-payload.mjs', ['pics/LOC-FrameworkPic.png', 'pics/LunaRunes.jpg', 'pics/LOC-structure.png', 'LunarRunesCardCut.pdf']);

if (failures.length) {
  console.error('[known-parity] Current regressions found:\n' + failures.map(item => `- ${item}`).join('\n'));
  process.exit(1);
}
console.log('[known-parity] Current LOC/LunaRunes/lo3rwang authority and UI boundaries are guarded');
