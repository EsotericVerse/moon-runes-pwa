import fs from 'node:fs';

const nav=fs.readFileSync('app/GlobalNav.jsx','utf8')+fs.readFileSync('app/ScopeNav.jsx','utf8')+fs.readFileSync('app/nav-route-map.js','utf8');
const legacy=fs.readFileSync('js/loc-nav.js','utf8');
const canon=fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8');
const globals=fs.readFileSync('app/globals.css','utf8');
const sources=[nav,legacy,canon,globals];
const obsolete=['NAV'+'1','NAV'+'2','NAV'+'3','nav'+'1.css'];
const stale=obsolete.filter(token=>sources.some(source=>source.includes(token)));
if(stale.length){console.error('Forbidden obsolete NAV terminology: '+stale.join(', '));process.exit(1);}
for(const token of ['lrunes.lo3rwang.cc','whoami.lo3rwang.cc','manage.lo3rwang.cc','月之符文','語彙','簡介','治理規則','脈絡','統計','文化','治理','context','statics','evolution','governance','search']){
  if(!nav.includes(token)){console.error('Missing scoped NAV contract: '+token);process.exit(1);}
}
for(const token of ['LOC Scope：月之符文','LunaRunes Scope：語彙','Author Scope：簡介','作者介紹','管理者介紹','回作者簡介','manage.lo3rwang.cc']){
  if(!canon.includes(token)){console.error('Missing NAV canon: '+token);process.exit(1);}
}
console.log('Scoped single NAV contract verified.');
