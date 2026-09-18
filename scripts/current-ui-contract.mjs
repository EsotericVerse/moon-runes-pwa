// Current UI verifier: Current definitions only. Historical compatibility must never be required here.
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const sources={
  home:read('app/loc/views/AboutView.jsx'),
  nav:read('app/nav-route-map.js')+read('app/ScopeNav.jsx'),
  runes:read('app/runes/page.jsx'),
  personal:read('app/lo3rwang/page.jsx'),
  admin:read('app/admin/page.jsx')+read('app/admin/RouteRegistryManager.jsx'),
  terminology:read('data/json/registries/LOC_TERMINOLOGY_CANON.json'),
  navCanon:read('docs/NAV_GOVERNANCE.md')
};

const required=[
  [sources.home,'把語言整理成可理解、可搜尋、可推演的模型結構。'],
  [sources.home,'模型化語言框架（Modelized Language Framework）'],
  [sources.home,'符號式語言（Symbolic Language）'],
  ...['lrunes.lo3rwang.cc','lo3rwang.lo3rwang.cc','admin.lo3rwang.cc','月之符文','語彙','Admin','脈絡','統計','文化','治理','search'].map(t=>[sources.nav,t]),
  ...['lo3rwang','文字工匠 · Wordsmith','校對者 · Calibrator','語言治理架構者 · Language Governance Architect'].map(t=>[sources.personal,t]),
  ...['/admin/routes','Page / Route Registry'].map(t=>[sources.admin,t]),
  [sources.terminology,'"zh": "模型化語言框架"'],
  [sources.terminology,'"en": "Modelized Language Framework"'],
  [sources.terminology,'"zh": "符號式語言"'],
  [sources.terminology,'"en": "Symbolic Language"'],
  [sources.navCanon,'每個介面只有一條正式導覽列'],
  [sources.navCanon,'網域優先，目錄其次，頁面最後']
];

const forbidden=[
  'Language Model Framework','Language Module Framework','語言系統模組框架','Symbolic Language Module','符號式語言模組',
  'author.lo3rwang.cc','whoami.lo3rwang.cc','manage.lo3rwang.cc','/author/governance'
];
const missing=required.filter(([src,t])=>!src.includes(t)).map(([,t])=>t);
const stale=forbidden.filter(t=>Object.values(sources).some(src=>src.includes(t)));
if(missing.length||stale.length){
  if(missing.length)console.error('Missing Current UI contract: '+missing.join(', '));
  if(stale.length)console.error('Forbidden stale Current semantics: '+stale.join(', '));
  process.exit(1);
}
console.log('Current UI contract verified: LOC modelized-language framework, LunaRunes symbolic language, canonical Scope domains.');
