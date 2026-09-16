import fs from 'node:fs';

const nav=fs.readFileSync('app/GlobalNav.jsx','utf8');
const legacy=fs.readFileSync('js/loc-nav.js','utf8');
const canon=fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8');
const globals=fs.readFileSync('app/globals.css','utf8');
const sources=[nav,legacy,canon,globals];
const obsolete=['NAV'+'1','NAV'+'2','NAV'+'3','nav'+'1.css'];
const stale=obsolete.filter(token=>sources.some(source=>source.includes(token)));
if(stale.length){console.error('Forbidden obsolete NAV terminology: '+stale.join(', '));process.exit(1);}
for(const token of ['/runes/context','/runes/statics','/runes/evolution','/runes/governance','/runes/search','https://whoami.lo3rwang.cc']){
  if(!nav.includes(token)){console.error('Missing scoped NAV contract: '+token);process.exit(1);}
}
for(const token of ['LOC Scope：月之符文','LunaRunes Scope：語彙','Author Scope：風格詞','Governance Scope：治理規則','manage.lo3rwang.cc']){
  if(!canon.includes(token)){console.error('Missing NAV canon: '+token);process.exit(1);}
}
console.log('Scoped single NAV contract verified.');
