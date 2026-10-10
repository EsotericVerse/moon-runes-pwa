import {isKnownScope,normalizeScopeId,scopeHref} from './scope-registry.js';

// Static-export iOS bundle contains local /lrunes and /lo3rwang mounts.
// External canonical Scope hosts must not eject the iOS app into Safari.
export function navigationHref(scopeId='loc',localPath='',native=false){
  if(!native)return scopeHref(scopeId,localPath);
  const id=normalizeScopeId(scopeId)||'loc';
  const part=String(localPath||'').split('/').filter(Boolean).join('/');
  const prefix=id==='loc'?'':isKnownScope(id)?'/'+id:'/scope';
  const path=(prefix+'/'+(part?part+'/':'')).replace(/\/+/g,'/');
  // Capacitor iOS serves bundled files by their explicit .html path; extension-
  // less feature routes can fall back to the root index.html instead of the
  // nested Next static export. Keep website canonical paths unchanged.
  const nativeFile=path+'index.html';
  return isKnownScope(id)?nativeFile:nativeFile+'?scope='+encodeURIComponent(id);
}
