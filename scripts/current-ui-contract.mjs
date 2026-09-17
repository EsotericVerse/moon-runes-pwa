// Invoked by npm run verify:ui within the verified Next build.
// Current UI checks must read Current governance sources, never retired Canon drafts.
import fs from 'node:fs';

const sources={
  home:fs.readFileSync('app/loc/views/AboutView.jsx','utf8'),
  nav:fs.readFileSync('app/nav-route-map.js','utf8')+fs.readFileSync('app/ScopeNav.jsx','utf8'),
  runes:fs.readFileSync('app/runes/page.jsx','utf8'),
  governance:fs.readFileSync('app/loc/views/GovernanceView.jsx','utf8'),
  runeGovernance:fs.readFileSync('app/runes/governance/page.jsx','utf8'),
  personal:fs.readFileSync('app/lo3rwang/page.jsx','utf8'),
  terminology:fs.readFileSync('data/json/registries/LOC_TERMINOLOGY_CANON.json','utf8'),
  dataGovernance:fs.readFileSync('data/json/registries/LOC_DATA_GOVERNANCE.json','utf8'),
  navCanon:fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8')
};

const required=[
  ...['LOC月典','/pics/LunaRunes.jpg','月典模型架構','ModelArchitectureExplorer','Base66'].map(token=>[sources.home,token]),
  ...['月之符文','語彙','風格詞','治理規則','脈絡','統計','文化','治理','搜尋','lo3rwang','管理者頁面','回月之符文首頁','回 lo3rwang','回治理頁面','回月典首頁','https://lo3rwang.cc','https://manage.lo3rwang.cc','lrunes.lo3rwang.cc','context','statics','evolution','governance','search'].map(token=>[sources.nav,token]),
  ...['href="#draw"','href="#library"'].map(token=>[sources.runes,token]),
  ...['客觀與中立','可移植（Portable）','Copyleft','/management','/governance/history'].map(token=>[sources.governance,token]),
  ...['LunaRunes Scope','Master Data／Base66'].map(token=>[sources.runeGovernance,token]),
  ...['lo3rwang','文字工匠 · Wordsmith','校對者 · Calibrator','語言治理架構者 · Language Governance Architect','鑑古知今，求同存異'].map(token=>[sources.personal,token]),
  [sources.terminology,'data/json/core/runes66groups.json'],
  [sources.terminology,'第七組固定為秩序（Order）'],
  [sources.terminology,'定序僅可作 Historical alias'],
  [sources.terminology,'"scope_id": "lo3rwang"'],
  [sources.terminology,'"canonical_host": "lo3rwang.cc"'],
  [sources.dataGovernance,'Scope Model × Feature Model → Page Composition'],
  [sources.dataGovernance,'LOC1–8 are Historical/provenance identifiers only'],
  [sources.navCanon,'每個介面只有一條正式導覽列'],
  [sources.navCanon,'manage.lo3rwang.cc']
];

const forbiddenHome=["name:'Methodology'","name:'Evolution'",'Governance｜治理架構層','Governance Architecture'];
const forbiddenNav=['author.lo3rwang.cc','whoami.lo3rwang.cc','lo3rwang.lo3rwang.cc'];
const forbiddenCurrentSources=['docs/LOC_Canon_1.1.md','docs/LOC_Canon_1.2.md'];
const self=fs.readFileSync('scripts/current-ui-contract.mjs','utf8');
const missing=required.filter(([source,token])=>!source.includes(token)).map(([,token])=>token);
const forbidden=[...forbiddenHome.filter(token=>sources.home.includes(token)),...forbiddenNav.filter(token=>sources.nav.includes(token)),...forbiddenCurrentSources.filter(token=>self.includes(token))];
if(missing.length||forbidden.length){
  if(missing.length) console.error('Missing Current UI contract: '+missing.join(', '));
  if(forbidden.length) console.error('Forbidden stale UI contract: '+forbidden.join(', '));
  process.exit(1);
}
console.log('Current UI contract verified against Current governance sources.');
