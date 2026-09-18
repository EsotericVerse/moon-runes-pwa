import {SHARED_FEATURES,detectSiteScope,featureRoute,getSiteScope} from './site-registry';

export const SHARED_NAV_FUNCTIONS=Object.freeze(SHARED_FEATURES.map(({label,id})=>Object.freeze([label,id])));

export function detectNavScope(pathname='/',host=''){
  return detectSiteScope(pathname,host);
}

export function getNavScopeConfig(scope){
  const current=getSiteScope(scope);
  return {
    base:'',
    functions:Object.fromEntries([...SHARED_FEATURES.map(({id})=>[id,featureRoute(current.id,id)]),['search',featureRoute(current.id,'search')]]),
    reserved:current.reserved,
    role:current.role,
    homes:current.homes
  };
}

export function navRoute(config,name){
  return config.functions[name];
}
