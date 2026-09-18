// Compatibility facade. Current Scope authority lives in modular-v2/scope-registry.v2.js.
import {
  FEATURES_V2,
  SCOPES_V2,
  featureHrefV2,
  getScopeV2,
  resolveScopeV2,
  scopeDataViewV2,
  scopeHrefV2,
  scopeOriginV2
} from './modular-v2/scope-registry.v2';

export const SHARED_FEATURES=Object.freeze(FEATURES_V2.filter(item=>item.id!=='search'));

function legacyShape(scope){
  return Object.freeze({
    ...scope,
    reserved:Object.freeze([scope.primary.label,scope.primary.href]),
    role:Object.freeze([[scope.role.label,scope.role.href]]),
    homes:Object.freeze(scope.homes.map(item=>Object.freeze([item.label,item.href])))
  });
}

export const SITE_SCOPES=Object.freeze(
  Object.fromEntries(Object.entries(SCOPES_V2).map(([id,scope])=>[id,legacyShape(scope)]))
);

export function detectSiteScope(pathname='/',host=''){return resolveScopeV2(host,pathname);}
export function getSiteScope(id){return SITE_SCOPES[id]||SITE_SCOPES.loc;}
export function scopeOrigin(id){return scopeOriginV2(id);}
export function scopeHref(id,localPath=''){return scopeHrefV2(id,localPath);}
export function featureRoute(id,feature){return featureHrefV2(id,feature);}
export function scopeDataView(id,key){return scopeDataViewV2(id,key);}
export {FEATURES_V2,SCOPES_V2,getScopeV2};
