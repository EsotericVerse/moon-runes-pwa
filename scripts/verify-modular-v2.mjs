import fs from 'node:fs';
import path from 'node:path';
import {FEATURES_V2,SCOPES_V2,SCOPE_POLICY_V2,featureHrefV2,scopeHrefV2,resolveScopeV2,isScopeRequestAllowedV2} from '../app/modular-v2/scope-registry.v2.js';

const failures=[];
const requiredCoreScopes=['loc','runes','lo3rwang','admin'];
const expectedFeatures=['context','statics','culture','governance','search'];

for(const id of requiredCoreScopes){
  if(!SCOPES_V2[id])failures.push('missing required core Scope: '+id);
}
if(JSON.stringify(FEATURES_V2.map(item=>item.id))!==JSON.stringify(expectedFeatures))failures.push('feature registry mismatch');

const scopeIds=Object.keys(SCOPES_V2);
const domains=Object.values(SCOPES_V2).map(scope=>scope.domain);
const featureIds=FEATURES_V2.map(item=>item.id);
const featurePaths=FEATURES_V2.map(item=>item.path);
if(new Set(scopeIds).size!==scopeIds.length)failures.push('duplicate Scope id');
const scopeIdRe=new RegExp(SCOPE_POLICY_V2.scopeIdPattern);
for(const id of scopeIds)if(!scopeIdRe.test(id)&&!SCOPE_POLICY_V2.scopeIdExceptions.includes(id))failures.push('scope id violates Current pattern without registered exception: '+id);
if(SCOPE_POLICY_V2.defaultScopeId!=='loc')failures.push('Current default Scope drifted');
if(JSON.stringify(SCOPE_POLICY_V2.scopeIdExceptions)!==JSON.stringify(['lo3rwang']))failures.push('Current Scope ID exception drifted');
const reservedWords=SCOPE_POLICY_V2.reservedWords.map(item=>item.word);
if(!reservedWords.includes('loc'))failures.push('Current deployment must reserve loc');
for(const item of SCOPE_POLICY_V2.reservedWords)if(item.scope!=='deployment')failures.push('reserved word must remain deployment-scoped: '+item.word);
if(new Set(domains).size!==domains.length)failures.push('duplicate Scope domain');
if(new Set(featureIds).size!==featureIds.length)failures.push('duplicate Feature id');
if(new Set(featurePaths).size!==featurePaths.length)failures.push('duplicate Feature path');
for(const domain of domains){
  if(domain!==domain.toLowerCase())failures.push('Scope domain must be lowercase: '+domain);
  if(domain.includes('/')||domain.includes(':'))failures.push('Scope domain must be hostname only: '+domain);
}
for(const [id,scope] of Object.entries(SCOPES_V2)){
  const domain=scope.domain;
  if(!domain)failures.push(id+' missing domain');
  else{
    if(resolveScopeV2(domain)!==id)failures.push(domain+' scope mismatch');
    if(resolveScopeV2(domain+':443')!==id)failures.push(domain+' port normalization mismatch');
  }

  if(scope.id!==id)failures.push(id+' registry key/id mismatch');
  if(!['domain','directory'].includes(scope.scopeType))failures.push('invalid Scope type: '+id);
  if(!scope.label)failures.push(id+' missing label');
  if(!Array.isArray(scope.localRoutes))failures.push(id+' localRoutes must be an array');
  if(!Array.isArray(scope.routePatterns))failures.push(id+' routePatterns must be an array');
  if(!Array.isArray(scope.compatibilityRoutes))failures.push(id+' compatibilityRoutes must be an array');
  if(!scope.primary?.href||!scope.primary?.label)failures.push(id+' missing primary navigation target');
  if(!scope.role?.href||!scope.role?.label)failures.push(id+' missing role navigation target');
  if(!Array.isArray(scope.homes))failures.push(id+' homes must be an array');
  if(!scope.dataViews||typeof scope.dataViews!=='object')failures.push(id+' missing dataViews');
  if(!scope.theme)failures.push(id+' missing theme');
  if(scope.scopeType==='directory'&&!scope.mount)failures.push('directory Scope missing mount: '+id);

  for(const feature of FEATURES_V2){
    const expectedBase=scope.scopeType==='directory'&&scope.mount
      ?`https://${scope.mount.host}${scope.mount.path}`
      :`https://${domain}`;
    if(featureHrefV2(id,feature.id)!==`${expectedBase}/${feature.path}`)failures.push(id+'/'+feature.id+' route mismatch');
  }
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



function routeShellPath(rootDir,route,{pattern=false}={}){
  const parts=String(route||'').split('/').filter(Boolean).map(part=>{
    if(pattern&&part.startsWith(':'))return '['+part.slice(1)+']';
    return part;
  });
  return path.join(rootDir,...parts,'page.jsx');
}

for(const scope of Object.values(SCOPES_V2)){
  const localRoutes=Array.isArray(scope.localRoutes)?scope.localRoutes:[];
  for(const localRoute of localRoutes){
    const canonicalHref=scopeHrefV2(scope.id,localRoute);
    const expectedBase=scope.scopeType==='directory'&&scope.mount?`https://${scope.mount.host}${scope.mount.path}`:`https://${scope.domain}`;
    if(canonicalHref!==`${expectedBase}/${localRoute}`)failures.push('Scope-local canonical URL drifted: '+scope.id+'/'+localRoute);

    const canonicalRoot=scope.scopeType==='directory'&&scope.mount
      ? path.resolve('app',scope.mount.path.split('/').filter(Boolean)[0])
      : path.resolve('app');
    const canonicalFile=path.join(canonicalRoot,...localRoute.split('/'),'page.jsx');
    if(!fs.existsSync(canonicalFile))failures.push('Scope-local canonical route missing: '+path.relative('.',canonicalFile));

    if(scope.mount){
      const mountRoot=path.resolve('app',scope.mount.path.split('/').filter(Boolean)[0]);
      const mountFile=path.join(mountRoot,...localRoute.split('/'),'page.jsx');
      if(!fs.existsSync(mountFile))failures.push('Scope-local mount route missing: '+path.relative('.',mountFile));
    }
  }

  const canonicalRoot=scope.scopeType==='directory'&&scope.mount
    ? path.resolve('app',scope.mount.path.split('/').filter(Boolean)[0])
    : path.resolve('app');

  for(const pattern of scope.routePatterns||[]){
    const file=routeShellPath(canonicalRoot,pattern,{pattern:true});
    if(!fs.existsSync(file))failures.push('Scope route pattern shell missing: '+path.relative('.',file));

    if(scope.mount){
      const mountRoot=path.resolve('app',scope.mount.path.split('/').filter(Boolean)[0]);
      const mountFile=routeShellPath(mountRoot,pattern,{pattern:true});
      if(!fs.existsSync(mountFile))failures.push('Scope mount pattern shell missing: '+path.relative('.',mountFile));
    }
  }

  for(const route of scope.compatibilityRoutes||[]){
    const file=routeShellPath(canonicalRoot,route);
    if(!fs.existsSync(file))failures.push('Scope compatibility route missing: '+path.relative('.',file));

    if(scope.mount){
      const mountRoot=path.resolve('app',scope.mount.path.split('/').filter(Boolean)[0]);
      const mountFile=routeShellPath(mountRoot,route);
      if(!fs.existsSync(mountFile))failures.push('Scope mount compatibility route missing: '+path.relative('.',mountFile));
    }
  }

}

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
for(const scope of Object.values(SCOPES_V2)){
  if(!scope.mount)continue;
  const dirName=scope.mount.path?.split('/').filter(Boolean)[0];
  if(!dirName){failures.push('Scope mount missing path segment: '+scope.id);continue;}
  const routeRoot=path.resolve('app',dirName);
  if(!fs.existsSync(routeRoot))failures.push('Scope mount route shell missing: app/'+dirName);
  for(const route of ['page.jsx','context/page.jsx','statics/page.jsx','culture/page.jsx','governance/page.jsx','search/page.jsx']){
    const file=path.join(routeRoot,route);
    if(!fs.existsSync(file))failures.push('Scope mount route shell missing: app/'+dirName+'/'+route);
  }
}
for(const [id,scope] of Object.entries(SCOPES_V2)){
  for(const pathname of ['/','/context','/statics','/culture','/governance','/search']){
    if(resolveScopeV2(scope.domain,pathname)!==id)failures.push(scope.domain+' failed direct-domain Scope resolution at '+pathname);
  }
}
for(const scope of Object.values(SCOPES_V2).filter(item=>item.mount)){
  const base=scope.mount.path;
  for(const suffix of ['','/',...FEATURES_V2.map(item=>'/'+item.path)]){
    const pathname=base+suffix;
    if(resolveScopeV2(scope.mount.host,pathname)!==scope.id)failures.push(scope.id+' mount failed at '+pathname);
  }
  const hostDefault=resolveScopeV2(scope.mount.host,'/');
  for(const pathname of [base+'ish','/foo'+base,'/culture'+base]){
    if(resolveScopeV2(scope.mount.host,pathname)!==hostDefault)failures.push('bounded mount overmatched '+pathname);
  }
}
for(const pathname of ['/runes','/runes/context']){
  if(resolveScopeV2('loc.lo3rwang.cc',pathname)!=='loc')failures.push('retired /runes path resolved as active Scope: '+pathname);
}
if(SCOPES_V2.runes?.scopeType!=='domain')failures.push('LunaRunes Scope must remain domain type');
if(SCOPES_V2.runes?.aliasName!==null)failures.push('LunaRunes domain Scope must not declare aliasName');
if(SCOPES_V2.runes?.mount?.host!=='loc.lo3rwang.cc'||SCOPES_V2.runes?.mount?.path!=='/lrunes')failures.push('LunaRunes alternate /lrunes mount drifted');
if(SCOPES_V2.lo3rwang?.scopeType!=='directory')failures.push('author Scope must remain directory type');
if(SCOPES_V2.lo3rwang?.aliasName!=='dlwang')failures.push('author aliasName must remain dlwang');
if(SCOPES_V2.lo3rwang?.mount?.host!=='loc.lo3rwang.cc'||SCOPES_V2.lo3rwang?.mount?.path!=='/lo3rwang')failures.push('author LOC mount drifted');
const aliases=Object.values(SCOPES_V2).map(scope=>scope.aliasName).filter(Boolean);
if(new Set(aliases).size!==aliases.length)failures.push('duplicate Scope aliasName');
const mounts=Object.values(SCOPES_V2).filter(scope=>scope.mount).map(scope=>scope.mount.host+'|'+scope.mount.path);
if(new Set(mounts).size!==mounts.length)failures.push('duplicate Scope mount');

const currentFiles=['app/loc/search-collections.js','app/loc/GovernanceManagement.jsx'];
for(const file of currentFiles){
  const source=fs.readFileSync(file,'utf8');
  if(/\bLOC[0-8](?:_|\b)/.test(source))failures.push(file+': legacy numbered data identity leaked into Current feature module');
}
const bridge=fs.readFileSync('app/migration-bridges/current-data-compat.v2.js','utf8');
if(!/LOC[0-8]/.test(bridge))failures.push('legacy physical identifiers should be isolated in the migration bridge');

for(const pathname of ['/',...FEATURES_V2.map(item=>'/'+item.path),...SCOPES_V2.runes.localRoutes.map(route=>'/'+route)]){
  if(resolveScopeV2('lrunes.lo3rwang.cc',pathname)!=='runes')failures.push('LunaRunes canonical domain failed at '+pathname);
}
const admissibilityCases=[
  ['runes','lrunes.lo3rwang.cc','/',true],
  ['runes','lrunes.lo3rwang.cc','/context',true],
  ['runes','lrunes.lo3rwang.cc','/duel/one',true],
  ['runes','loc.lo3rwang.cc','/lrunes',true],
  ['runes','loc.lo3rwang.cc','/lrunes/context',true],
  ['runes','loc.lo3rwang.cc','/lrunes/duel/one',true],
  ['runes','lrunes.lo3rwang.cc','/loc',false],
  ['runes','lrunes.lo3rwang.cc','/runes',false],
  ['runes','lrunes.lo3rwang.cc','/lrunes',false],
  ['runes','lrunes.lo3rwang.cc','/duel/one/foo',false],
  ['loc','loc.lo3rwang.cc','/',true],
  ['loc','loc.lo3rwang.cc','/context',true],
  ['loc','loc.lo3rwang.cc','/loc',false],
  ['loc','loc.lo3rwang.cc','/runes',false],
  ['loc','loc.lo3rwang.cc','/writing/example-work',true],
  ['loc','loc.lo3rwang.cc','/writing/example-work/extra',false],
  ['loc','loc.lo3rwang.cc','/management',true],
  ['lo3rwang','loc.lo3rwang.cc','/lo3rwang',true],
  ['lo3rwang','loc.lo3rwang.cc','/lo3rwang/context',true]
];
for(const [scopeId,host,pathname,expected] of admissibilityCases){
  const actual=isScopeRequestAllowedV2(scopeId,host,pathname);
  if(actual!==expected)failures.push('Scope route admissibility failed: '+scopeId+' '+host+pathname+' expected '+expected+' got '+actual);
}

const runesCanonicalContext=featureHrefV2('runes','context');
if(runesCanonicalContext!=='https://lrunes.lo3rwang.cc/context')failures.push('LunaRunes canonical feature URL drifted');
if(/lrunes\.lo3rwang\.cc\/(?:lrunes|runes)\//.test(runesCanonicalContext))failures.push('duplicated LunaRunes scope segment in canonical URL');

if(failures.length){console.error('[modular-v2] violations:\n'+failures.join('\n'));process.exit(1);}
console.log('[modular-v2] Current cutover verified: required core Scopes + extensible registry, bounded domain/mount routing, shared features, one Scope registry and isolated legacy data ids');
