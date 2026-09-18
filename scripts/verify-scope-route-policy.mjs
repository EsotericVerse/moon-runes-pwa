import {readFileSync} from 'node:fs';
import {SCOPES_V2,scopeRoutePathsV2} from '../app/modular-v2/scope-registry.v2.js';
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

function mountedPath(base,route){
  const mount=String(base||'').replace(/\/+$/,'');
  if(route==='/')return mount||'/';
  return mount+'/'+String(route).replace(/^\/+/, '');
}

for(const scope of Object.values(SCOPES_V2)){
  const domainPolicy=policy.hosts?.[scope.domain];
  if(!domainPolicy){
    failures.push('missing edge host policy for '+scope.domain);
    continue;
  }

  for(const route of scopeRoutePathsV2(scope.id)){
    expectAllowed(scope.domain,route,true);
  }

  if(scope.scopeType==='directory'){
    if(!scope.mount){
      failures.push(scope.id+' directory Scope missing mount for edge redirect');
    }else{
      const redirect=domainPolicy.redirect;
      if(redirect?.toHost!==scope.mount.host||redirect?.toBase!==scope.mount.path){
        failures.push(scope.id+' directory alias redirect drifted');
      }
    }
  }else if(domainPolicy.redirect){
    failures.push(scope.id+' domain Scope must not have alias redirect metadata');
  }

  if(scope.mount){
    for(const route of scopeRoutePathsV2(scope.id)){
      expectAllowed(scope.mount.host,mountedPath(scope.mount.path,route),true);
    }
  }
}


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
  'isAssetPath',
  "'/_next/'",
  "'/assets/'",
  "'/pics/'",
  "'/data/'",
  "'/docs/'",
  'hostPolicy.allow',
  "status:404",
  'hostPolicy.redirect',
  'ORIGIN_BASE',
  '.html is intentionally NOT treated as an asset'
]){
  if(!workerSource.includes(token))failures.push('Cloudflare Scope worker missing '+token);
}
if(workerSource.includes('sec-fetch-dest')||workerSource.includes('sec-fetch-mode')){
  failures.push('Cloudflare Scope worker still uses old browser-header gate');
}
for(const domain of Object.keys(policy.hosts)){
  if(workerSource.includes(domain))failures.push('Cloudflare Scope worker must not hard-code domain '+domain);
}

if(failures.length){
  console.error('[scope-route-policy] violations:\n'+failures.join('\n'));
  process.exit(1);
}

console.log('[scope-route-policy] registry-driven host/path allowlist and alias redirect contract verified');
