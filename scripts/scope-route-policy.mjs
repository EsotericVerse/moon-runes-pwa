import {
  SCOPES_V2,
  scopeRoutePathsV2,
  scopeRoutePatternsV2,
  scopeCompatibilityRoutesV2
} from '../app/modular-v2/scope-registry.v2.js';

function joinMount(base,path){
  const left=String(base||'').replace(/\/+$/,'');
  const right=String(path||'/').replace(/^\/+/, '');
  return right ? `${left}/${right}` : left || '/';
}

function ensureHost(hosts,host){
  if(!hosts[host])hosts[host]={allow:new Set(),patterns:new Set(),compatibility:new Set(),redirect:null};
  return hosts[host];
}

function addAllowed(hosts,host,path){
  ensureHost(hosts,host).allow.add(path);
}

function addPattern(hosts,host,pattern){
  ensureHost(hosts,host).patterns.add(pattern);
}

function addCompatibility(hosts,host,path){
  ensureHost(hosts,host).compatibility.add(path);
}

export function buildScopeRoutePolicyV2(){
  const hosts={};

  for(const scope of Object.values(SCOPES_V2)){
    const canonicalPaths=scopeRoutePathsV2(scope.id);
    const patterns=scopeRoutePatternsV2(scope.id);
    const compatibility=scopeCompatibilityRoutesV2(scope.id);

    // Every declared domain resolves this Scope. For domain Scopes it is canonical.
    // For directory Scopes it is an alias ingress that should redirect to the mount.
    for(const route of canonicalPaths)addAllowed(hosts,scope.domain,route);
    for(const pattern of patterns)addPattern(hosts,scope.domain,pattern);
    for(const route of compatibility)addCompatibility(hosts,scope.domain,route);

    if(scope.scopeType==='directory'&&scope.mount){
      hosts[scope.domain].redirect={
        toHost:scope.mount.host,
        toBase:scope.mount.path
      };
    }

    if(scope.mount){
      for(const route of canonicalPaths){
        const mounted=route==='/' ? scope.mount.path : joinMount(scope.mount.path,route);
        addAllowed(hosts,scope.mount.host,mounted);
      }
      for(const pattern of patterns){
        addPattern(hosts,scope.mount.host,joinMount(scope.mount.path,pattern));
      }
      for(const route of compatibility){
        addCompatibility(hosts,scope.mount.host,joinMount(scope.mount.path,route));
      }
    }
  }

  const normalizedHosts=Object.fromEntries(
    Object.entries(hosts)
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([host,entry])=>[
        host,
        {
          allow:[...entry.allow].sort(),
          patterns:[...entry.patterns].sort(),
          compatibility:[...entry.compatibility].sort(),
          ...(entry.redirect?{redirect:entry.redirect}:{})
        }
      ])
  );

  return {
    schema:1,
    source:'app/modular-v2/scope-registry.v2.js',
    defaultPolicy:'deny',
    hosts:normalizedHosts
  };
}
