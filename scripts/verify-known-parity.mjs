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

requireText('app/loc/views/AboutView.jsx', [
  'LOC月典', '語言模型框架（Language Model Framework）',
  '<section className="loc-card home-copy-block home-beginner" id="beginner">',
  '<section className="loc-card home-copy-block home-rune-section">',
  '<div className="home-rune-preview" aria-label="命之符文示例">',
  '<p>卡片月相：無 / 真實月相：空亡</p>',
  '<a className="loc-bubble" href="/runes?mode=single">抽單張</a>',
  '<a className="loc-bubble" href="/runes?mode=daily">抽每日指示</a>',
  '<a className="loc-bubble" href="/runes?mode=2card">抽兩張</a>',
  '<a className="loc-bubble" href="/runes?mode=3card">抽三張</a>',
  '<a className="loc-bubble" href="/runes?mode=5card">抽五張</a>',
  '<a className="loc-bubble" href="/runes?mode=ow3gs">抽11張</a>',
  '<img src="/pics/LunaRunes.jpg" alt="LunaRunes 月之符文" loading="lazy" />',
  '<h2>月典模型架構</h2>', '<ModelArchitectureExplorer modules={MODEL_MODULES} />',
  "name:'Algorithm'", "name:'Module'", "name:'Culture'", 'Base66'
]);
forbidText('app/loc/views/AboutView.jsx', ["name:'Methodology'", "name:'Evolution'", 'Governance｜治理架構層', 'Governance Architecture']);
requireText('app/loc/views/ModelArchitectureExplorer.jsx', [
  "'use client'", 'aria-expanded={expanded}', '點圖展開八個模組',
  'model-module-overlay', 'LOC 八個功能模組選單', '關閉八個模組選單'
]);

requireText('app/GlobalNav.jsx', [
  "const isRunes=pathname==='/runes'||pathname.startsWith('/runes/');",
  '<a href="/runes#draw">抽牌</a>', '<a href="/runes/list">符文圖鑑</a>',
  '<a href="/game">遊戲</a>', '<a href="/context">符文脈絡</a>',
  '<a href="/statics">符文統計</a>', '<a href="/evolution">符文文化</a>',
  '<a href="/runes/history">抽籤紀錄</a>', '<a href="/runes">月之符文</a>',
  '<a href="/context">脈絡</a>', '<a href="/statics">統計</a>',
  '<a href="/evolution">文化</a>', '<a href="/my-style">設定</a>',
  '<SearchBox />', '<a className="loc-next-home" href="/">回月典首頁</a>'
]);

requireText('app/GlobalFooter.jsx', [
  '<footer className="loc-site-footer">',
  '<a href={isRunes?\'/runes\':\'/\'}>{isRunes?\'月之符文\':\'月典\'}</a>｜<ThemeSelect />',
  '<a href="https://lo3rwang.lo3rwang.cc/">Lucas Oscar Wang 政德</a>',
  '<a href="mailto:sopa2306@gmail.com">聯絡方式</a>'
]);

requireText('app/runes/page.jsx', ['RUNES_HOME_CONTENT', '<main className="loc-next-main">', 'id="runes-relation"', 'id="runes-modes"', 'id="runes-reference"', 'href="#draw"', 'href="/runes/list"', 'href="/runes/history"', '<RuneDrawClient/>']);
requireText('app/runes/RuneDrawClient.jsx', ["key: 'daily'", "key: 'ow3gs'", '<div className="runes-draw-surface">', 'realMoonPhase', '每日占卜提醒', '因 → 果', '源 → 轉 → 合', '時間主線 × 內外作用', '第 7–11 張為核心判定']);
requireText('app/runes/home-content.js', ['?mode=single#draw', '?mode=daily#draw', '?mode=ow3gs#draw']);
requireText('app/runes/history/HistoryClient.jsx', ['const PAGE_SIZE=20', 'filtered.slice', '抽籤紀錄分頁']);
requireText('app/loc/model/moon-phase.js', ['day >= 1 && day <= 7', "return '新月'", "return '上弦'", "return '滿月'", "return '下弦'", "return '空亡'"]);
requireText('docs/LOC_Canon_1.1.md', ['「卡片月相」與「真實月相」是兩個不同欄位', '29–30 日空亡']);
requireText('scripts/prepare-next-public.mjs', ['PUBLIC_PICS', "'LunarRunesCardCut.pdf'", "'LunaRunes.jpg'"]);
requireText('scripts/verify-public-payload.mjs', ['pics/LOC-FrameworkPic.png', 'pics/LunaRunes.jpg', 'pics/LOC-structure.png', 'LunarRunesCardCut.pdf']);

if (failures.length) {
  console.error('[known-parity] current UI regressions found:\n' + failures.map(item => `- ${item}`).join('\n'));
  process.exit(1);
}
console.log('[known-parity] LunaRunes, NAV, eight-module homepage architecture and moon-phase Canon are guarded');
