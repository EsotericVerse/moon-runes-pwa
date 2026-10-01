import fs from 'node:fs';
import path from 'node:path';
import {FEATURES_V2} from '../app/modular-v2/scope-registry.v2.js';

const failures=[];
if(JSON.stringify(FEATURES_V2.map(item=>item.id))!==JSON.stringify(['statics','culture','governance','search']))failures.push('feature registry mismatch');
const root=path.resolve('app/modular-v2');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full];});}
for(const file of walk(root)){
  const source=fs.readFileSync(file,'utf8');
  if(!file.endsWith('scope-registry.v2.js')&&/loc\.lo3rwang\.cc|lrunes\.lo3rwang\.cc|admin\.lo3rwang\.cc/.test(source)){
    failures.push(path.relative('.',file)+': canonical domain literal belongs in Scope registry');
  }
}
for(const name of ['StatisticsV2','CultureV2','GovernanceV2','SearchV2']){
  const file=path.join(root,'features',name+'.jsx');
  if(!fs.existsSync(file))failures.push('missing feature component '+name);
  else if(!fs.readFileSync(file,'utf8').includes('FeaturePageV2'))failures.push(name+' must use FeaturePageV2');
}
const css=fs.readFileSync('app/styles/v2/scope-system.v2.css','utf8');
if(!css.includes('.scope-v2-'))failures.push('Scope CSS namespace missing');
const locApp=fs.readFileSync('app/loc/LocApp.jsx','utf8');
for(const name of ['StatisticsV2','CultureV2','GovernanceV2','SearchV2'])if(!locApp.includes(name))failures.push('LocApp missing '+name);
if(!fs.readFileSync('app/globals.css','utf8').includes('./styles/v2/scope-system.v2.css'))failures.push('Scope CSS not imported');
if(!fs.existsSync(path.resolve('app/lrunes/list/page.jsx')))failures.push('LunaRunes mounted list ingress missing');
if(failures.length){
  console.error('[modular-v2] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[modular-v2] Current shared features, composition and Scope ownership verified');
