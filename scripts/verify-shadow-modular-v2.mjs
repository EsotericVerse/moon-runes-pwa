import fs from 'node:fs';
import path from 'node:path';
import {FEATURES_V2,SCOPES_V2,featureHrefV2,resolveScopeV2} from '../app/modular-v2/scope-registry.v2.js';

const failures=[];
const expectedDomains={
  loc:'loc.lo3rwang.cc',
  runes:'lrunes.lo3rwang.cc',
  lo3rwang:'lo3rwang.lo3rwang.cc',
  admin:'admin.lo3rwang.cc'
};
const expectedFeatures=['context','statics','culture','governance','search'];

for(const [id,domain] of Object.entries(expectedDomains)){
  if(SCOPES_V2[id]?.domain!==domain)failures.push(id+' domain mismatch');
}
if(JSON.stringify(Object.keys(SCOPES_V2))!==JSON.stringify(Object.keys(expectedDomains)))failures.push('scope ids mismatch');
if(JSON.stringify(FEATURES_V2.map(x=>x.id))!==JSON.stringify(expectedFeatures))failures.push('feature registry mismatch');

for(const [host,expected] of Object.entries(expectedDomains)){
  if(resolveScopeV2(expected,'/')!==host)failures.push(expected+' scope mismatch');
  if(resolveScopeV2(expected+':443','/')!==host)failures.push(expected+' port normalization mismatch');
}
for(const id of Object.keys(expectedDomains)){
  for(const feature of FEATURES_V2){
    if(featureHrefV2(id,feature.id)!==`https://${expectedDomains[id]}/${feature.path}`)failures.push(id+'/'+feature.id+' route mismatch');
  }
}

const root=path.resolve('app/modular-v2');
const styleRoot=path.resolve('app/styles/v2');
function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}
const sourceFiles=[...walk(root),...walk(styleRoot)];
const forbidden=[
  ['obsolete whoami identity',/whoami\.lo3rwang\.cc|\bwhoami\b/i],
  ['obsolete manage domain',/manage\.lo3rwang\.cc/i],
  ['obsolete evolution component',/EvolutionV2|featureId=["']evolution["']/],
  ['obsolete numbered LOC distribution',/\bLOC[0-8]\b/],
  ['legacy scope registry dependency',/SITE_SCOPES|detectSiteScope|getSiteScope/]
];
for(const file of sourceFiles){
  const text=fs.readFileSync(file,'utf8');
  for(const [label,re] of forbidden)if(re.test(text))failures.push(`${path.relative('.',file)}: ${label}`);
  if(!file.endsWith('scope-registry.v2.js')&&/loc\.lo3rwang\.cc|lrunes\.lo3rwang\.cc|lo3rwang\.lo3rwang\.cc|admin\.lo3rwang\.cc/.test(text)){
    failures.push(`${path.relative('.',file)}: domain literal outside scope registry`);
  }
}
for(const name of ['ContextV2','StatisticsV2','CultureV2','GovernanceV2','SearchV2']){
  const file=path.join(root,'features',name+'.jsx');
  if(!fs.existsSync(file))failures.push('missing feature component '+name);
  else if(!fs.readFileSync(file,'utf8').includes('FeaturePageV2'))failures.push(name+' bypasses shared FeaturePageV2');
}
const css=fs.readFileSync(path.join(styleRoot,'scope-system.v2.css'),'utf8');
for(const match of css.matchAll(/(^|\})\s*([^@][^{]+)\{/gm)){
  const selector=match[2].trim();
  if(selector!==':root'&&!selector.split(',').every(part=>part.trim().startsWith('.scope-v2')))failures.push('non-v2 css selector: '+selector);
}

if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('shadow modular v2 verified: 4 scopes, 5 features, shared runtime, isolated domains and CSS');
