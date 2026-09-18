import {
  SCOPES_V2,
  scopeRoutePathsV2
} from '../app/modular-v2/scope-registry.v2.js';

function joinMount(base,path){
  const left=String(base||'').replace(/\/+$/,'');
  const right=String(path||'/').replace(/^\/+/, '');
  return right ? `${left}/${right}` : left || '/';
}

function addAllowed(hosts,host,path){
  if(!hosts[host])hosts[host]={allow:new Set(),redirect:null};
  hosts[host].allow.add(path);
}

export function buildScopeRoutePolicyV2(){
  const hosts={};

  for(const scope of Object.values(SCOPES_V2)){
    const canonicalPaths=scopeRoutePathsV2(scope.id);

    // Every declared domain resolves this Scope. For domain Scopes it is canonical.
    // For directory Scopes it is an alias ingress that should redirect to the mount.
    for(const route of canonicalPaths)addAllowed(hosts,scope.domain,route);

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
    }
  }

  const normalizedHosts=Object.fromEntries(
    Object.entries(hosts)
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([host,entry])=>[
        host,
        {
          allow:[...entry.allow].sort(),
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
