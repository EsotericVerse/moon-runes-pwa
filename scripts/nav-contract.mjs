import fs from 'node:fs';

const nav=fs.readFileSync('app/GlobalNav.jsx','utf8')+fs.readFileSync('app/ScopeNav.jsx','utf8')+fs.readFileSync('app/nav-route-map.js','utf8');
const registry=fs.readFileSync('app/scope-registry.js','utf8');
const featureModel=fs.readFileSync('app/scope-feature-model.js','utf8');
const legacy=fs.readFileSync('js/loc-nav.js','utf8');
const canon=fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8')+fs.readFileSync('docs/LOC_Canon_1.3.md','utf8');
const globals=fs.readFileSync('app/globals.css','utf8');
const sources=[nav,registry,featureModel,legacy,canon,globals];
const obsolete=['NAV'+'1','NAV'+'2','NAV'+'3','nav'+'1.css'];
const stale=obsolete.filter(token=>sources.some(source=>source.includes(token)));
if(stale.length){console.error('Forbidden obsolete NAV terminology: '+stale.join(', '));process.exit(1);}
for(const token of ['detectNavScope','getNavScopeConfig','navRoute','SHARED_NAV_FUNCTIONS']){
  if(!nav.includes(token)){console.error('Missing model-driven NAV contract: '+token);process.exit(1);}
}
for(const token of ['lrunes.lo3rwang.cc','whoami.lo3rwang.cc','manage.lo3rwang.cc','displayName','managerHome','pathBase','parentId']){
  if(!registry.includes(token)){console.error('Missing Scope Registry contract: '+token);process.exit(1);}
}
for(const token of ['context','statics','evolution','governance','search']){
  if(!featureModel.includes(token)&&!registry.includes(token)){console.error('Missing shared feature contract: '+token);process.exit(1);}
}
for(const token of ['Scope','Feature','LunaRunes','Duel','ownership','Governance']){
  if(!canon.includes(token)){console.error('Missing Current Canon model contract: '+token);process.exit(1);}
}
console.log('Model-driven scoped single NAV contract verified.');
