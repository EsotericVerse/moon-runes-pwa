import {UI_COPY} from '../i18n/ui-copy.js';

// Current V2 Scope registry.
export const SCOPE_POLICY_V2=Object.freeze({
  defaultScopeId:'loc',
  routeAuthority:'next-filesystem',
  dataAuthority:'neon'
});

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
    primary:Object.freeze({label:UI_COPY.scope.loc.primary,href:'https://lrunes.lo3rwang.cc/'}),
    role:Object.freeze({label:UI_COPY.scope.loc.role,href:'https://loc.lo3rwang.cc/lo3rwang/'}),
    homes:Object.freeze([{label:UI_COPY.scope.loc.home,href:'https://loc.lo3rwang.cc/'}]),
  }),

  lunarunes:Object.freeze({
    id:'lunarunes',
    scopeType:'domain',
    domain:'lrunes.lo3rwang.cc',
    label:'月之符文',
    localRoutes:Object.freeze([
      'game',
      'list',
      'duel/one',
      'duel/daily',
      'duel/two',
      'duel/three',
      'duel/five',
      'duel/ow3gs',
      'daily/log',
      'daily/trend'
    ]),
    routePatterns:Object.freeze(['list/:group','list/:group/:rune']),
    mount:Object.freeze({host:'loc.lo3rwang.cc',path:'/lrunes'}),
    primary:Object.freeze({label:'月之符文',href:'https://lrunes.lo3rwang.cc/'}),
    role:Object.freeze({label:'管理者頁面',href:'https://loc.lo3rwang.cc/lo3rwang/'}),
    homes:Object.freeze([
      {label:'回月典首頁',href:'https://loc.lo3rwang.cc/'}
    ]),
  }),

  lo3rwang:Object.freeze({
    id:'lo3rwang',
    scopeType:'directory',
    domain:null,
    label:UI_COPY.scope.author.label,
    mount:Object.freeze({host:'loc.lo3rwang.cc',path:'/lo3rwang'}),
    primary:Object.freeze({label:UI_COPY.scope.author.primary,href:'https://loc.lo3rwang.cc/lo3rwang/'}),
    role:Object.freeze({label:UI_COPY.scope.author.role,href:'https://loc.lo3rwang.cc/lo3rwang/'}),
    homes:Object.freeze([
      {label:UI_COPY.scope.author.home,href:'https://loc.lo3rwang.cc/'}
    ]),
  }),

  admin:Object.freeze({
    id:'admin',
    scopeType:'domain',
    domain:'admin.lo3rwang.cc',
    label:UI_COPY.scope.admin.label,
    localRoutes:Object.freeze([]),
    routePatterns:Object.freeze([]),
    primary:Object.freeze({label:UI_COPY.scope.admin.primary,href:'https://admin.lo3rwang.cc/'}),
    role:Object.freeze({label:UI_COPY.scope.admin.role,href:'https://admin.lo3rwang.cc/'}),
    homes:Object.freeze([
      {label:UI_COPY.scope.admin.home,href:'https://admin.lo3rwang.cc/'},
      {label:UI_COPY.scope.admin.locHome,href:'https://loc.lo3rwang.cc/'}
    ]),
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
  return SCOPE_BY_DOMAIN_V2[h]||SCOPE_POLICY_V2.defaultScopeId;
}

export function getScopeV2(id){
  return SCOPES_V2[id]||SCOPES_V2[SCOPE_POLICY_V2.defaultScopeId];
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

