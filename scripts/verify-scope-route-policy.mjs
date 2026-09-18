import {readFileSync} from 'node:fs';
import {buildScopeRoutePolicyV2} from './scope-route-policy.mjs';

const failures=[];
const policy=buildScopeRoutePolicyV2();

function expectAllowed(host,path,expected=true){
  const allowed=policy.hosts?.[host]?.allow?.includes(path)===true;
  if(allowed!==expected){
    failures.push(`${host}${path}: expected allowed=${expected}, got ${allowed}`);
  }
}

if(policy.schema!==1)failures.push('scope route policy schema drifted');
if(policy.defaultPolicy!=='deny')failures.push('scope route policy must default deny');

for(const path of ['/','/context','/statics','/culture','/governance','/search','/list','/history','/duel/one','/duel/ow3gs']){
  expectAllowed('lrunes.lo3rwang.cc',path,true);
}
for(const path of ['/loc','/runes','/lrunes','/lrunes/context','/duel/one/foo']){
  expectAllowed('lrunes.lo3rwang.cc',path,false);
}

for(const path of ['/','/context','/statics','/culture','/governance','/search','/lrunes','/lrunes/context','/lrunes/list','/lrunes/duel/one','/lo3rwang','/lo3rwang/context']){
  expectAllowed('loc.lo3rwang.cc',path,true);
}
for(const path of ['/loc','/runes','/list','/history','/duel/one']){
  expectAllowed('loc.lo3rwang.cc',path,false);
}

for(const path of ['/','/context','/statics','/culture','/governance','/search']){
  expectAllowed('dlwang.lo3rwang.cc',path,true);
}
for(const path of ['/loc','/lo3rwang','/runes','/lrunes']){
  expectAllowed('dlwang.lo3rwang.cc',path,false);
}

const authorRedirect=policy.hosts?.['dlwang.lo3rwang.cc']?.redirect;
if(authorRedirect?.toHost!=='loc.lo3rwang.cc'||authorRedirect?.toBase!=='/lo3rwang'){
  failures.push('author alias redirect policy drifted');
}

if(policy.hosts?.['lrunes.lo3rwang.cc']?.redirect){
  failures.push('LunaRunes canonical domain must not be treated as alias redirect');
}

const workerSource=readFileSync('scripts/edge/cloudflare-scope-router.js','utf8');
for(const token of [
  'scope-route-policy.json',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'hostPolicy.allow',
  "status:404",
  'hostPolicy.redirect',
  'ORIGIN_BASE'
]){
  if(!workerSource.includes(token))failures.push('Cloudflare Scope worker missing '+token);
}
for(const domain of Object.keys(policy.hosts)){
  if(workerSource.includes(domain))failures.push('Cloudflare Scope worker must not hard-code domain '+domain);
}

if(failures.length){
  console.error('[scope-route-policy] violations:\n'+failures.join('\n'));
  process.exit(1);
}

console.log('[scope-route-policy] registry-driven host/path allowlist and alias redirect contract verified');
