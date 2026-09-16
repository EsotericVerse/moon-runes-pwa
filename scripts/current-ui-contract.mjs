// Invoked by npm run verify:ui within the verified Next build.
// Verify Current user-facing surfaces against their authoritative Current sources.
import fs from 'node:fs';

const sources={
  home:fs.readFileSync('app/loc/views/AboutView.jsx','utf8'),
  nav:fs.readFileSync('app/GlobalNav.jsx','utf8')+fs.readFileSync('app/ScopeNav.jsx','utf8')+fs.readFileSync('app/nav-route-map.js','utf8'),
  registry:fs.readFileSync('app/scope-registry.js','utf8'),
  features:fs.readFileSync('app/scope-feature-model.js','utf8'),
  runes:fs.readFileSync('app/runes/page.jsx','utf8'),
  duel:fs.readFileSync('app/runes/duel/page.jsx','utf8'),
  governance:fs.readFileSync('app/loc/views/GovernanceView.jsx','utf8'),
  personal:fs.readFileSync('lo3rwang.html','utf8'),
  runeCanon:fs.readFileSync('docs/LOC_Canon_1.1.md','utf8'),
  architectureCanon:fs.readFileSync('docs/LOC_Canon_1.2.md','utf8'),
  currentCanon:fs.readFileSync('docs/LOC_Canon_1.3.md','utf8'),
  navCanon:fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8')
};

const required=[
  ...['LOC月典','/pics/LunaRunes.jpg','月典模型架構','ModelArchitectureExplorer','Base66'].map(token=>[sources.home,token]),
  ...['detectNavScope','getNavScopeConfig','navRoute','SHARED_NAV_FUNCTIONS'].map(token=>[sources.nav,token]),
  ...['lrunes.lo3rwang.cc','whoami.lo3rwang.cc','manage.lo3rwang.cc','displayName','managerHome','parentId','aggregate','refs'].map(token=>[sources.registry,token]),
  ...['context','statics','evolution','governance','search','統計排行榜','文化','搜尋'].map(token=>[sources.features,token]),
  ...['符文圖鑑','/runes/list','抽牌','/runes/duel'].map(token=>[sources.runes,token]),
  ...['one','daily','two','three','five','ow3gs','fight','卡牌拓展桌遊'].map(token=>[sources.duel,token]),
  ...['Current 治理原則','管理入口'].map(token=>[sources.governance,token]),
  ...['這是政德的個人首頁','data-personal-nav-setting'].map(token=>[sources.personal,token]),
  [sources.runeCanon,'「卡片月相」與「真實月相」是兩個不同欄位'],
  [sources.architectureCanon,'每個 LOC instance 的管理權獨立'],
  ...['Highest Principle','不替使用者裁定','Scope','Feature','LunaRunes','Duel','fight','ownership','Governance','Portable','Copyleft','Semantic Migration Integrity'].map(token=>[sources.currentCanon,token]),
  [sources.navCanon,'每個介面只有一條正式導覽列']
];

const forbiddenHome=["name:'Methodology'","name:'Evolution'",'Governance｜治理架構層','Governance Architecture'];
const forbiddenNav=['/runes/history','抽籤紀錄'];
const forbiddenRunes=['href="#draw"','href="#library"'];
const missing=required.filter(([source,token])=>!source.includes(token)).map(([,token])=>token);
const forbidden=[...forbiddenHome.filter(token=>sources.home.includes(token)),...forbiddenNav.filter(token=>sources.nav.includes(token)),...forbiddenRunes.filter(token=>sources.runes.includes(token))];
if(missing.length||forbidden.length){
  if(missing.length) console.error('Missing Current UI contract: '+missing.join(', '));
  if(forbidden.length) console.error('Forbidden stale UI contract: '+forbidden.join(', '));
  process.exit(1);
}
console.log('Current UI contract verified against authoritative Current sources.');
