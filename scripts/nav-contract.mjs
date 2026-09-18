import fs from 'node:fs';

const nav=fs.readFileSync('app/GlobalNav.jsx','utf8')+fs.readFileSync('app/ScopeNav.jsx','utf8')+fs.readFileSync('app/nav-route-map.js','utf8');
const legacy=fs.readFileSync('js/loc-nav.js','utf8');
const canon=fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8');
const globals=fs.readFileSync('app/globals.css','utf8');
const sources=[nav,legacy,canon,globals];
const obsolete=['NAV'+'1','NAV'+'2','NAV'+'3','nav'+'1.css'];
const stale=obsolete.filter(token=>sources.some(source=>source.includes(token)));
if(stale.length){console.error('Forbidden obsolete NAV terminology: '+stale.join(', '));process.exit(1);}
for(const token of ['lrunes.lo3rwang.cc','lo3rwang.cc','admin.lo3rwang.cc','月之符文','語彙','風格詞','Admin','脈絡','統計','文化','治理','context','statics','evolution','governance','search']){
  if(!nav.includes(token)){console.error('Missing scoped NAV contract: '+token);process.exit(1);}
}
for(const token of ['LOC Scope：月之符文','LunaRunes Scope：語彙','lo3rwang Scope：風格詞','admin.lo3rwang.cc','功能級導覽一律使用正式階層 route']){
  if(!canon.includes(token)){console.error('Missing NAV canon: '+token);process.exit(1);}
}
if(nav.includes('manage.lo3rwang.cc')||legacy.includes('manage.lo3rwang.cc')){console.error('Retired manage host returned');process.exit(1);}
console.log('Scoped single NAV contract verified.');
