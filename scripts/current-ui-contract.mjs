// Invoked by npm run verify:ui within the verified Next build.
// These source-text checks do not replace browser or deployment health checks.
import fs from 'node:fs';

const sources={
  home:fs.readFileSync('app/loc/views/AboutView.jsx','utf8'),
  nav:fs.readFileSync('app/GlobalNav.jsx','utf8')+fs.readFileSync('app/ScopeNav.jsx','utf8')+fs.readFileSync('app/nav-route-map.js','utf8'),
  runes:fs.readFileSync('app/runes/page.jsx','utf8'),
  governance:fs.readFileSync('app/loc/views/GovernanceView.jsx','utf8'),
  runeGovernance:fs.readFileSync('app/runes/governance/page.jsx','utf8'),
  personal:fs.readFileSync('lo3rwang.html','utf8'),
  runeCanon:fs.readFileSync('docs/LOC_Canon_1.1.md','utf8'),
  architectureCanon:fs.readFileSync('docs/LOC_Canon_1.2.md','utf8'),
  navCanon:fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8')
};

const required=[
  ...['LOC月典','模型化語言框架（Modelized Language Framework）','/pics/LunaRunes.jpg','月典模型架構','ModelArchitectureExplorer',"name:'LunaRunes'","name:'Context'","name:'Music'","name:'Literary'","name:'MultiMedia'","name:'Algorithm'","name:'Module'","name:'Culture'",'Base66','卡片月相：無 / 真實月相：空亡'].map(token=>[sources.home,token]),
  ...['月之符文','語彙','簡介','脈絡','統計','文化','治理','作者介紹','管理者介紹','回月之符文首頁','回作者簡介','回月典首頁','https://whoami.lo3rwang.cc','https://manage.lo3rwang.cc','lrunes.lo3rwang.cc','context','statics','evolution','governance','search'].map(token=>[sources.nav,token]),
  ...['<RuneDrawClient />','<RuneAtlasHome />'].map(token=>[sources.runes,token]),
  ...['客觀與中立','可移植（Portable）','Copyleft','/management','/governance/history'].map(token=>[sources.governance,token]),
  ...['LunaRunes Scope','Master Data／Base66'].map(token=>[sources.runeGovernance,token]),
  [sources.runeCanon,'「卡片月相」與「真實月相」是兩個不同欄位'],
  [sources.architectureCanon,'每個 LOC instance 的管理權獨立'],
  [sources.navCanon,'每個介面只有一條正式導覽列'],
  [sources.navCanon,'manage.lo3rwang.cc']
];

const forbiddenHome=["name:'Methodology'","name:'Evolution'",'Governance｜治理架構層','Governance Architecture'];
const forbiddenNav=['/runes/history','抽籤紀錄'];
const missing=required.filter(([source,token])=>!source.includes(token)).map(([,token])=>token);
const forbidden=[...forbiddenHome.filter(token=>sources.home.includes(token)),...forbiddenNav.filter(token=>sources.nav.includes(token))];
if(missing.length||forbidden.length){
  if(missing.length) console.error('Missing Current UI contract: '+missing.join(', '));
  if(forbidden.length) console.error('Forbidden stale UI contract: '+forbidden.join(', '));
  process.exit(1);
}
console.log('Current UI contract verified.');
