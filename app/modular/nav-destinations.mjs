import {isKnownScope,normalizeScopeId,scopeHref} from './scope-registry.js';

// Static-export iOS bundle contains local /lrunes and /lo3rwang mounts.
// External canonical Scope hosts must not eject the iOS app into Safari.
export function navigationHref(scopeId='loc',localPath='',native=false){
  if(!native)return scopeHref(scopeId,localPath);
  const id=normalizeScopeId(scopeId)||'loc';
  const part=String(localPath||'').split('/').filter(Boolean).join('/');
  const prefix=id==='loc'?'':isKnownScope(id)?'/'+id:'/scope';
  const path=(prefix+'/'+(part?part+'/':'')).replace(/\/+/g,'/');
  return isKnownScope(id)?path:path+(path.includes('?')?'&':'?')+'scope='+encodeURIComponent(id);
}
