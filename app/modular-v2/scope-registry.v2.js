import {UI_COPY} from '../i18n/ui-copy.js';

// Current V2 Scope registry.
const DEFAULT_SCOPE_ID='loc';

export const FEATURES_V2=Object.freeze([
  Object.freeze({id:'statics',label:UI_COPY.features.statics.title,path:'statics'}),
  Object.freeze({id:'culture',label:UI_COPY.features.culture.title,path:'culture'}),
  Object.freeze({id:'governance',label:UI_COPY.features.governance.title,path:'governance'}),
  Object.freeze({id:'search',label:UI_COPY.features.search.title,path:'search'})
]);

export const SCOPES_V2=Object.freeze({
  loc:Object.freeze({
    id:'loc',
    scopeType:'domain',
    domain:'loc.lo3rwang.cc',
    label:UI_COPY.scope.loc.label,
  }),

  lunarunes:Object.freeze({
    id:'lunarunes',
    scopeType:'domain',
    domain:'lrunes.lo3rwang.cc',
    label:'月之符文',
    mount:Object.freeze({host:'loc.lo3rwang.cc',path:'/lrunes'}),
  }),

  lo3rwang:Object.freeze({
    id:'lo3rwang',
    scopeType:'directory',
    domain:null,
    label:UI_COPY.scope.author.label,
    mount:Object.freeze({host:'loc.lo3rwang.cc',path:'/lo3rwang'}),
  }),

  admin:Object.freeze({
    id:'admin',
    scopeType:'domain',
    domain:'admin.lo3rwang.cc',
    label:UI_COPY.scope.admin.label,
  })
});

function cleanHost(host=''){
  return String(host||'').toLowerCase().split(':')[0];
}

function cleanPath(pathname='/'){
  const value='/' + String(pathname||'/')
    .split('?')[0]
    .split('#')[0]
    .split('/')
    .filter(Boolean)
    .join('/');
  return value==='/'?'/':value;
}

const SCOPE_BY_DOMAIN_V2=Object.freeze(
  Object.fromEntries(
    Object.entries(SCOPES_V2)
      .filter(([,scope])=>Boolean(scope.domain))
      .map(([id,scope])=>[scope.domain,id])
  )
);

function matchesMount(scope,host,pathname){
  if(!scope.mount)return false;
  const h=cleanHost(host);
  const p=cleanPath(pathname);
  const base=cleanPath(scope.mount.path);
  return h===cleanHost(scope.mount.host)&&(p===base||p.startsWith(base+'/'));
}

export function resolveScopeV2(host='',pathname='/'){
  const h=cleanHost(host);
  for(const [id,scope] of Object.entries(SCOPES_V2)){
    if(matchesMount(scope,h,pathname))return id;
  }
  if(!h){
    const path=cleanPath(pathname);
    for(const [id,scope] of Object.entries(SCOPES_V2)){
      const base=scope.mount?cleanPath(scope.mount.path):null;
      if(base&&(path===base||path.startsWith(base+'/')))return id;
    }
  }
  return SCOPE_BY_DOMAIN_V2[h]||DEFAULT_SCOPE_ID;
}

export function getScopeV2(id){
  return SCOPES_V2[id]||SCOPES_V2[DEFAULT_SCOPE_ID];
}

export function scopeOriginV2(scopeId){
  const scope=getScopeV2(scopeId);
  const host=scope.domain||scope.mount?.host;
  return host?`https://${host}`:'';
}

export function scopeBaseHrefV2(scopeId){
  const scope=getScopeV2(scopeId);
  if(scope.scopeType==='directory'&&scope.mount){
    return `https://${scope.mount.host}${cleanPath(scope.mount.path)}`;
  }
  return scopeOriginV2(scopeId);
}

export function scopeHrefV2(scopeId,localPath=''){
  const base=scopeBaseHrefV2(scopeId).replace(/\/$/,'');
  const raw=String(localPath||'');
  const marker=raw.search(/[?#]/);
  const routePart=marker>=0?raw.slice(0,marker):raw;
  const suffix=marker>=0?raw.slice(marker):'';
  const path=routePart.split('/').filter(Boolean).join('/');
  const pathname=path?`/${path}/`:'/';
  return `${base}${pathname}${suffix}`;
}

export function featureHrefV2(scopeId,featureId){
  const feature=FEATURES_V2.find(item=>item.id===featureId);
  if(!feature)throw new Error('Unknown feature: '+featureId);
  return scopeHrefV2(scopeId,feature.path);
}

export function featureIdForPathV2(pathname='/'){
  const segment=String(pathname||'/')
    .split('/')
    .filter(Boolean)
    .at(-1)||'';
  return FEATURES_V2.find(item=>item.path===segment)?.id||null;
}

