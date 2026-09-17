// Invoked by npm run verify:ui within the verified Next build.
// Current UI checks must read Current governance sources, never retired Canon drafts.
import fs from 'node:fs';

const sources={
  home:fs.readFileSync('app/loc/views/AboutView.jsx','utf8'),
  nav:fs.readFileSync('app/nav-route-map.js','utf8')+fs.readFileSync('app/ScopeNav.jsx','utf8'),
  runes:fs.readFileSync('app/runes/page.jsx','utf8'),
  governance:fs.readFileSync('app/loc/views/GovernanceView.jsx','utf8'),
  runeGovernance:fs.readFileSync('app/runes/LunaRunesGovernanceView.jsx','utf8'),
  personal:fs.readFileSync('app/lo3rwang/page.jsx','utf8'),
  admin:fs.readFileSync('app/admin/page.jsx','utf8')+fs.readFileSync('app/admin/RouteRegistryManager.jsx','utf8'),
  terminology:fs.readFileSync('data/json/registries/LOC_TERMINOLOGY_CANON.json','utf8'),
  groups:fs.readFileSync('data/json/core/runes66groups.json','utf8'),
  dataGovernance:fs.readFileSync('data/json/registries/LOC_DATA_GOVERNANCE.json','utf8'),
  sharedSchema:fs.readFileSync('data/json/registries/LOC_SHARED_SCHEMA.json','utf8'),
  languageSystem:fs.readFileSync('data/json/registries/LOC_LANGUAGE_SYSTEM_REGISTRY.json','utf8'),
  pgsql:fs.readFileSync('data/json/registries/LOC_PGSQL_MIGRATION_CONTRACT.json','utf8'),
  navCanon:fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8')
};

const required=[
  ...['LOC月典','/pics/LunaRunes.jpg','月典模型架構','ModelArchitectureExplorer','Base66'].map(token=>[sources.home,token]),
  ...['月之符文','語彙','風格詞','Admin','脈絡','統計','文化','治理','搜尋','管理者首頁','管理者頁面','回月之符文首頁','回 lo3rwang','回月典首頁','https://lo3rwang.lo3rwang.cc','https://admin.lo3rwang.cc','lrunes.lo3rwang.cc','context','statics','evolution','governance','search'].map(token=>[sources.nav,token]),
  ...['?mode=daily','<RuneDrawClient />','<RuneAtlasHome />','Context','Culture','INTRO_REEL','DIVINATION_REEL_LINKS'].map(token=>[sources.runes,token]),
  ...['客觀與中立','可移植（Portable）','Copyleft','/management','/governance/history'].map(token=>[sources.governance,token]),
  ...['LunaRunes Scope','Master Data／Base66'].map(token=>[sources.runeGovernance,token]),
  ...['lo3rwang','文字工匠 · Wordsmith','校對者 · Calibrator','語言治理架構者 · Language Governance Architect','鑑古知今，求同存異'].map(token=>[sources.personal,token]),
  ...['全站管理','/admin/routes','Page / Route Registry','新增下層','插入上層'].map(token=>[sources.admin,token]),
  [sources.terminology,'data/json/core/runes66groups.json'],
  [sources.terminology,'第七組固定為秩序（Order）'],
  [sources.terminology,'"scope_id": "lo3rwang"'],
  [sources.terminology,'"canonical_host": "lo3rwang.cc"'],
  [sources.groups,'"group_zh":"秩序"'],
  [sources.dataGovernance,'Scope Model × Feature Model → Page Composition'],
  [sources.dataGovernance,'"navigation_governance"'],
  [sources.dataGovernance,'"mutable": true'],
  [sources.dataGovernance,'UUIDv7'],
  [sources.sharedSchema,'NAV is a governed mutable Page Composition interface'],
  [sources.languageSystem,'"lo3rwang_governance": "/lo3rwang/governance"'],
  [sources.pgsql,'"format": "UUIDv7"'],
  [sources.pgsql,'"persistent_mapping_required": true'],
  [sources.navCanon,'每個介面只有一條正式導覽列'],
  [sources.navCanon,'NAV 是 **Page Composition 的可變介面**'],
  [sources.navCanon,'Domain 是最高路由與 Scope 治理邊界'],
  [sources.navCanon,'https://lrunes.lo3rwang.cc/list'],
  [sources.navCanon,'https://lo3rwang.lo3rwang.cc'],
  [sources.navCanon,'admin.lo3rwang.cc'],
  [sources.navCanon,'功能級導覽一律使用正式階層 route']
];

const forbiddenHome=["name:'Methodology'","name:'Evolution'",'Governance｜治理架構層','Governance Architecture'];
const forbiddenNav=['author.lo3rwang.cc','whoami.lo3rwang.cc','manage.lo3rwang.cc'];
const forbiddenCurrent=[
  [sources.terminology,'定序'],
  [sources.groups,'定序'],
  [sources.groups,'historical_aliases'],
  [sources.dataGovernance,'Frozen Interface'],
  [sources.sharedSchema,'Frozen Interface'],
  [sources.languageSystem,'Frozen Interface'],
  [sources.languageSystem,'"author_governance"'],
  [sources.languageSystem,'"author": ['],
  [sources.languageSystem,'/author/governance']
];
const missing=required.filter(([source,token])=>!source.includes(token)).map(([,token])=>token);
const forbidden=[...forbiddenHome.filter(token=>sources.home.includes(token)),...forbiddenNav.filter(token=>sources.nav.includes(token)),...forbiddenCurrent.filter(([source,token])=>source.includes(token)).map(([,token])=>token)];
if(missing.length||forbidden.length){
  if(missing.length) console.error('Missing Current UI contract: '+missing.join(', '));
  if(forbidden.length) console.error('Forbidden stale UI contract: '+forbidden.join(', '));
  process.exit(1);
}
console.log('Current UI contract verified against Current governance sources.');
