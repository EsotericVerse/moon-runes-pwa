import fs from 'node:fs';
import path from 'node:path';
import {FEATURES_V2,SCOPES_V2,featureHrefV2,resolveScopeV2} from '../app/modular-v2/scope-registry.v2.js';

const failures=[];
const expectedDomains={loc:'loc.lo3rwang.cc',runes:'lrunes.lo3rwang.cc',lo3rwang:'lo3rwang.lo3rwang.cc',admin:'admin.lo3rwang.cc'};
const expectedFeatures=['context','statics','culture','governance','search'];

if(JSON.stringify(Object.keys(SCOPES_V2))!==JSON.stringify(Object.keys(expectedDomains)))failures.push('scope ids mismatch');
if(JSON.stringify(FEATURES_V2.map(item=>item.id))!==JSON.stringify(expectedFeatures))failures.push('feature registry mismatch');
for(const [id,domain] of Object.entries(expectedDomains)){
  if(SCOPES_V2[id]?.domain!==domain)failures.push(id+' domain mismatch');
  if(resolveScopeV2(domain,'/')!==id)failures.push(domain+' scope mismatch');
  if(resolveScopeV2(domain+':443','/')!==id)failures.push(domain+' port normalization mismatch');
  for(const feature of FEATURES_V2)if(featureHrefV2(id,feature.id)!==`https://${domain}/${feature.path}`)failures.push(id+'/'+feature.id+' route mismatch');
}

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
for(const name of ['ContextV2','StatisticsV2','CultureV2','GovernanceV2','SearchV2']){
  const file=path.join(root,'features',name+'.jsx');
  if(!fs.existsSync(file))failures.push('missing feature component '+name);
  else if(!fs.readFileSync(file,'utf8').includes('FeaturePageV2'))failures.push(name+' bypasses shared FeaturePageV2');
}
const css=fs.readFileSync('app/styles/v2/scope-system.v2.css','utf8');
if(!css.includes('.scope-v2-'))failures.push('V2 CSS namespace missing');
if(css.includes('.loc-view')||css.includes('.loc-card')||css.includes('.loc-hero'))failures.push('V2 CSS must not patch legacy component selectors');
const locApp=fs.readFileSync('app/loc/LocApp.jsx','utf8');
for(const name of ['ContextV2','StatisticsV2','CultureV2','GovernanceV2','SearchV2'])if(!locApp.includes(name))failures.push('LocApp not cut over to '+name);
if(locApp.includes('EvolutionView')||locApp.includes('evolution:CultureView'))failures.push('obsolete evolution runtime still active');
if(!fs.readFileSync('app/globals.css','utf8').includes('./styles/v2/scope-system.v2.css'))failures.push('V2 CSS not imported');
if(!fs.readFileSync('app/site-registry.js','utf8').includes("from './modular-v2/scope-registry.v2'"))failures.push('compat registry does not derive from V2');
if(!fs.readFileSync('app/theme-registry.js','utf8').includes("from './modular-v2/theme-registry.v2'"))failures.push('compat theme registry does not derive from V2');

for(const retired of ['ContextView.jsx','StaticsView.jsx','EvolutionView.jsx','GovernanceView.jsx','SearchView.jsx']){
  if(fs.existsSync(path.resolve('app/loc/views',retired)))failures.push('retired shared feature returned: '+retired);
}
for(const retiredRoute of ['app/author','app/zhengde']){
  if(fs.existsSync(path.resolve(retiredRoute)))failures.push('retired author route returned: '+retiredRoute);
}
const lo3rwangRoute=path.resolve('app/lo3rwang/page.jsx');
if(!fs.existsSync(lo3rwangRoute))failures.push('missing /lo3rwang compatibility route');
else {
  const source=fs.readFileSync(lo3rwangRoute,'utf8');
  if(!source.includes("../loc/LocApp")||!source.includes('<LocApp/>'))failures.push('/lo3rwang must render the author Scope through the shared runtime');
  if(source.includes('redirect('))failures.push('/lo3rwang must not redirect; domain/path compatibility must resolve without loops');
}

const currentFiles=['app/loc/search-collections.js','app/loc/GovernanceManagement.jsx'];
for(const file of currentFiles){
  const source=fs.readFileSync(file,'utf8');
  if(/\bLOC[0-8](?:_|\b)/.test(source))failures.push(file+': legacy numbered data identity leaked into Current feature module');
}
const bridge=fs.readFileSync('app/migration-bridges/current-data-compat.v2.js','utf8');
if(!/LOC[0-8]/.test(bridge))failures.push('legacy physical identifiers should be isolated in the migration bridge');

if(failures.length){console.error('[modular-v2] violations:\n'+failures.join('\n'));process.exit(1);}
console.log('[modular-v2] Current cutover verified: 4 scopes, 5 shared features, canonical author route, one scope registry, one theme registry, isolated legacy data ids');
