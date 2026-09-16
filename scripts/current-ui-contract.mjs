import fs from 'node:fs';

const sources={
  home:fs.readFileSync('app/loc/views/AboutView.jsx','utf8'),
  nav:fs.readFileSync('app/GlobalNav.jsx','utf8'),
  governance:fs.readFileSync('app/loc/views/GovernanceView.jsx','utf8'),
  runeGovernance:fs.readFileSync('app/runes/governance/page.jsx','utf8'),
  personal:fs.readFileSync('lo3rwang.html','utf8'),
  canon:fs.readFileSync('docs/LOC_Canon_1.2.md','utf8'),
  navCanon:fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8')
};

const required=[
  [sources.home,'LOC月典'],
  [sources.nav,'/governance'],
  [sources.nav,'/runes/governance'],
  [sources.governance,'客觀與中立'],
  [sources.governance,'可移植（Portable）'],
  [sources.governance,'Copyleft'],
  [sources.governance,'/management'],
  [sources.governance,'/governance/history'],
  [sources.runeGovernance,'LunaRunes Scope'],
  [sources.runeGovernance,'Master Data／Base66'],
  [sources.personal,'這是政德的個人首頁'],
  [sources.personal,'data-personal-nav-setting'],
  [sources.canon,'每個 LOC instance 的管理權獨立'],
  [sources.navCanon,'每個介面只有一條正式導覽列']
];

const missing=required.filter(([source,token])=>!source.includes(token)).map(([,token])=>token);
if(missing.length){
  console.error('Missing Current UI contract: '+missing.join(', '));
  process.exit(1);
}
console.log('Current UI contract verified.');
