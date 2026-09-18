// Current-only UI contract. Historical compatibility is never a Current requirement.
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const sources={
 home:read('app/loc/views/AboutView.jsx'),
 nav:read('app/GlobalNav.jsx')+read('app/ScopeNav.jsx')+read('app/nav-route-map.js'),
 runes:read('app/runes/page.jsx'),
 governance:read('app/loc/views/GovernanceView.jsx'),
 personal:read('app/author/page.jsx'),
 admin:read('app/management/page.jsx')+read('app/loc/GovernanceManagement.jsx'),
 terminology:read('data/json/registries/LOC_TERMINOLOGY_CANON.json'),
 navCanon:read('docs/NAV_GOVERNANCE.md')
};
const required=[
 [sources.home,'把語言整理成可理解、可搜尋、可推演的模型結構。'],
 [sources.home,'模型化語言框架（Modelized Language Framework）'],
 [sources.home,'符號式語言（Symbolic Language）'],
 ...['月之符文','語彙','脈絡','統計','文化','治理','搜尋','lo3rwang','lrunes.lo3rwang.cc','lo3rwang.lo3rwang.cc','admin.lo3rwang.cc'].map(t=>[sources.nav,t]),
 [sources.terminology,'"zh": "模型化語言框架"'],
 [sources.terminology,'"en": "Modelized Language Framework"'],
 [sources.terminology,'"zh": "符號式語言"'],
 [sources.terminology,'"en": "Symbolic Language"'],
 [sources.navCanon,'每個介面只有一條正式導覽列'],
 [sources.navCanon,'網域優先，目錄其次，頁面最後']
];
const forbidden=['Language Model Framework','Language Module Framework','語言系統模組框架','Symbolic Language Module','符號式語言模組','author.lo3rwang.cc','lo3rwang.lo3rwang.cc','admin.lo3rwang.cc','https://lo3rwang.lo3rwang.cc/governance'];
const missing=required.filter(([src,t])=>!src.includes(t)).map(([,t])=>t);
const stale=forbidden.filter(t=>Object.values(sources).some(src=>src.includes(t)));
if(missing.length||stale.length){if(missing.length)console.error('Missing Current UI contract: '+missing.join(', '));if(stale.length)console.error('Forbidden stale Current semantics: '+stale.join(', '));process.exit(1);}
console.log('Current UI contract verified against Current terminology and canonical Scope identity.');
