import fs from 'node:fs';
import path from 'node:path';
import {FEATURES_V2} from '../app/modular-v2/scope-registry.v2.js';

const failures=[];
const expectedFeatures=['statics','culture','governance','search'];
if(JSON.stringify(FEATURES_V2.map(item=>item.id))!==JSON.stringify(expectedFeatures))failures.push('feature registry mismatch');

const root=path.resolve('app/modular-v2');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full];});}
const forbidden=[
  ['obsolete whoami identity',/whoami\.lo3rwang\.cc|\bwhoami\b/i],
  ['obsolete manage domain',/manage\.lo3rwang\.cc/i],
  ['obsolete feature identity',/EvolutionV2|featureId=["']evolution["']/],
  ['obsolete numbered distribution',/\bLOC[0-8]\b/],
  ['legacy registry dependency',/SITE_SCOPES|detectSiteScope|getSiteScope/]
];
for(const file of walk(root)){
  const source=fs.readFileSync(file,'utf8');
  for(const [label,re] of forbidden)if(re.test(source))failures.push(`${path.relative('.',file)}: ${label}`);
  if(!file.endsWith('scope-registry.v2.js')&&/loc\.lo3rwang\.cc|lrunes\.lo3rwang\.cc|lo3rwang\.lo3rwang\.cc|admin\.lo3rwang\.cc/.test(source))failures.push(`${path.relative('.',file)}: domain literal outside scope registry`);
}
for(const name of ['StatisticsV2','CultureV2','GovernanceV2','SearchV2']){
  const file=path.join(root,'features',name+'.jsx');
  if(!fs.existsSync(file))failures.push('missing feature component '+name);
  else if(!fs.readFileSync(file,'utf8').includes('FeaturePageV2'))failures.push(name+' bypasses shared FeaturePageV2');
}
const css=fs.readFileSync('app/styles/v2/scope-system.v2.css','utf8');
if(!css.includes('.scope-v2-'))failures.push('V2 CSS namespace missing');
if(css.includes('.loc-view')||css.includes('.loc-card')||css.includes('.loc-hero'))failures.push('V2 CSS must not patch legacy component selectors');
const locApp=fs.readFileSync('app/loc/LocApp.jsx','utf8');
for(const name of ['StatisticsV2','CultureV2','GovernanceV2','SearchV2'])if(!locApp.includes(name))failures.push('LocApp not cut over to '+name);
if(locApp.includes('EvolutionView')||locApp.includes('evolution:CultureView'))failures.push('obsolete evolution runtime still active');
if(!fs.readFileSync('app/globals.css','utf8').includes('./styles/v2/scope-system.v2.css'))failures.push('V2 CSS not imported');



for(const retired of ['ContextView.jsx','StaticsView.jsx','EvolutionView.jsx','GovernanceView.jsx','SearchView.jsx']){
  if(fs.existsSync(path.resolve('app/loc/views',retired)))failures.push('retired shared feature returned: '+retired);
}
if(fs.existsSync(path.resolve('app/loc/page.jsx')))failures.push('public /loc route must not exist; app/loc is a source module directory only');
if(fs.existsSync(path.resolve('app/runes/page.jsx')))failures.push('public /runes route must not exist; app/runes is a source module directory only');
for(const leaked of ['context/page.jsx','statics/page.jsx','culture/page.jsx','governance/page.jsx','search/page.jsx','list/page.jsx','history/page.jsx']){
  if(fs.existsSync(path.resolve('app/runes',leaked)))failures.push('leaked public /runes route returned: app/runes/'+leaked);
}

for(const retiredRoute of ['app/author','app/zhengde']){
  if(fs.existsSync(path.resolve(retiredRoute)))failures.push('retired author route returned: '+retiredRoute);
}
if(!fs.existsSync(path.resolve('app/lrunes/list/page.jsx')))failures.push('LunaRunes alternate ingress missing: app/lrunes/list/page.jsx');


if(failures.length){console.error('[modular-v2] violations:\n'+failures.join('\n'));process.exit(1);}
console.log('[modular-v2] Current cutover verified: shared features, modular boundaries and isolated legacy data ids');
