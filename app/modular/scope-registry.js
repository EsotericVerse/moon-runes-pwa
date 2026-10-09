import {UI_COPY} from '../i18n/ui-copy.js';

// Current Scope registry.
export const FEATURES=Object.freeze([
  Object.freeze({id:'statics',label:UI_COPY.features.statics.title,path:'statics'}),
  Object.freeze({id:'culture',label:UI_COPY.features.culture.title,path:'culture'}),
  Object.freeze({id:'governance',label:UI_COPY.features.governance.title,path:'governance'}),
  Object.freeze({id:'search',label:UI_COPY.features.search.title,path:'search'})
]);

export const SCOPES=Object.freeze({
  loc:Object.freeze({
    id:'loc',
    domain:'loc.lo3rwang.cc',
    default:true,
    aggregateChildren:true,
    searchAliases:Object.freeze(['loc','LOC','LunaCodex','月典']),
    featureSubtitles:Object.freeze({
      statics:UI_COPY.scope.loc.statics,
      culture:UI_COPY.scope.loc.culture,
      governance:UI_COPY.scope.loc.governance,
      search:UI_COPY.scope.loc.search
    }),
    nav:Object.freeze({position:'after',order:2,label:UI_COPY.nav.home}),
    theme:Object.freeze({mode:'auto'})
  }),

  lrunes:Object.freeze({
    id:'lrunes',
    domain:'lrunes.lo3rwang.cc',
    searchAliases:Object.freeze(['lrunes','LunaRunes','月之符文']),
    mount:Object.freeze({host:'loc.lo3rwang.cc',path:'/lrunes'}),
    featureSubtitles:Object.freeze({
      statics:'查看月之符文相關資料的數量、來源與時間變化。',
      culture:'把月之符文相關紀錄放回時間順序，觀察不同時期的變化。',
      governance:'說明月之符文的使用原則、權利邊界與管理方式。',
      search:'從符文名稱、關鍵字或相關文字找到對應內容。'
    }),
    nav:Object.freeze({position:'before',order:1,label:UI_COPY.nav.lunarunes}),
    theme:Object.freeze({mode:'fixed',themeId:'theme-5'}),
    searchKind:'runes'
  }),

  lo3rwang:Object.freeze({
    id:'lo3rwang',
    searchAliases:Object.freeze(['lo3rwang','Lucas Oscar Wang','政德']),
    featureSubtitles:Object.freeze({search:UI_COPY.scope.author.search}),
    mount:Object.freeze({host:'loc.lo3rwang.cc',path:'/lo3rwang'}),
    nav:Object.freeze({position:'after',order:1,label:UI_COPY.nav.author}),
    theme:Object.freeze({mode:'fixed',themeId:'theme-2'})
  }),

  admin:Object.freeze({
    id:'admin',
    domain:'admin.lo3rwang.cc',
    mount:Object.freeze({host:'loc.lo3rwang.cc',path:'/admin'}),
    featureScope:'loc',
    theme:Object.freeze({mode:'auto'})
  })
});

const DEFAULT_SCOPE_ID=Object.values(SCOPES).find(scope=>scope.default)?.id||Object.keys(SCOPES)[0];
const GENERIC_SCOPE_HOST='loc.lo3rwang.cc';
const GENERIC_SCOPE_PATH='/scope';
const SCOPE_ID_PATTERN=/^[a-z][a-z0-9]{0,14}$/;

export const DUPLICATE_DOMAIN_MESSAGE='網域名稱重複，拒絕建立。';
export function duplicateDomainLabelError(scopeId,mode='domain'){
  if(mode!=='domain')return '';
  const domain=String(scopeId||'').trim().toLowerCase()+'.lo3rwang.cc';
  const labels=domain.split('.').filter(Boolean);
  return new Set(labels).size===labels.length?'':DUPLICATE_DOMAIN_MESSAGE;
}

export function normalizeScopeId(value=''){
  const id=String(value||'').trim().toLowerCase();
  return SCOPE_ID_PATTERN.test(id)?id:'';
}

export function isKnownScope(id){
  return Boolean(SCOPES[normalizeScopeId(id)]);
}

function genericScope(id){
  return Object.freeze({
    id,
    label:id,
    searchTitle:id,
    dynamic:true,
    featureSubtitles:Object.freeze({}),
    theme:Object.freeze({mode:'auto'})
  });
}

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

const SCOPE_BY_DOMAIN=Object.freeze(
  Object.fromEntries(
    Object.entries(SCOPES)
      .filter(([,scope])=>Boolean(scope.domain))
      .map(([id,scope])=>[scope.domain,id])
  )
);

function isPreviewHost(host=''){
  const h=cleanHost(host);
  return !h||h==='localhost'||h==='127.0.0.1'||h==='::1';
}

function matchesMount(scope,host,pathname){
  if(!scope.mount)return false;
  const h=cleanHost(host);
  const p=cleanPath(pathname);
  const base=cleanPath(scope.mount.path);
  return h===cleanHost(scope.mount.host)&&(p===base||p.startsWith(base+'/'));
}

export function resolveScope(host='',pathname='/'){
  const h=cleanHost(host);
  for(const [id,scope] of Object.entries(SCOPES)){
    if(matchesMount(scope,h,pathname))return id;
  }
  if(isPreviewHost(h)){
    const path=cleanPath(pathname);
    for(const [id,scope] of Object.entries(SCOPES)){
      const base=scope.mount?cleanPath(scope.mount.path):null;
      if(base&&(path===base||path.startsWith(base+'/')))return id;
    }
  }
  return SCOPE_BY_DOMAIN[h]||DEFAULT_SCOPE_ID;
}

function normalizeScopeSearchAlias(value=''){
  return String(value||'').normalize('NFKC').trim().toLocaleLowerCase('en-US');
}

export function resolveScopeSearchAlias(query=''){
  const token=normalizeScopeSearchAlias(query);
  if(!token)return null;
  for(const scope of Object.values(SCOPES)){
    const aliases=Array.isArray(scope.searchAliases)?scope.searchAliases:[];
    if(aliases.some(alias=>normalizeScopeSearchAlias(alias)===token))return scope;
  }
  return null;
}

export function getScope(id){
  const scopeId=normalizeScopeId(id)||DEFAULT_SCOPE_ID;
  // Static Registry stores route identity only; display_name lives in PostgreSQL.
  if(SCOPES[scopeId])return {...SCOPES[scopeId],label:scopeId,searchTitle:scopeId};
  return genericScope(scopeId);
}

export function scopeOrigin(scopeId){
  const id=normalizeScopeId(scopeId);
  const scope=getScope(id);
  const host=scope.domain||scope.mount?.host||(id&&!SCOPES[id]?GENERIC_SCOPE_HOST:'');
  return host?`https://${host}`:'';
}

function scopeBaseHref(scopeId){
  const id=normalizeScopeId(scopeId);
  const scope=getScope(id);
  if(id&&!SCOPES[id])return `https://${GENERIC_SCOPE_HOST}${GENERIC_SCOPE_PATH}`;
  if(scope.domain)return scopeOrigin(id);
  if(scope.mount)return `https://${scope.mount.host}${cleanPath(scope.mount.path)}`;
  return '';
}

export function scopeHref(scopeId,localPath=''){
  const id=normalizeScopeId(scopeId)||DEFAULT_SCOPE_ID;
  const base=scopeBaseHref(id).replace(/\/$/,'');
  const raw=String(localPath||'');
  const hashIndex=raw.indexOf('#');
  const hash=hashIndex>=0?raw.slice(hashIndex):'';
  const withoutHash=hashIndex>=0?raw.slice(0,hashIndex):raw;
  const queryIndex=withoutHash.indexOf('?');
  const routePart=queryIndex>=0?withoutHash.slice(0,queryIndex):withoutHash;
  const query=queryIndex>=0?withoutHash.slice(queryIndex+1):'';
  const path=routePart.split('/').filter(Boolean).join('/');
  const pathname=path?`/${path}/`:'/';
  if(SCOPES[id])return `${base}${pathname}${query?'?'+query:''}${hash}`;
  const params=new URLSearchParams(query);
  params.set('scope',id);
  return `${base}${pathname}?${params.toString()}${hash}`;
}

export function featureHref(scopeId,featureId){
  const feature=FEATURES.find(item=>item.id===featureId);
  if(!feature)throw new Error('Unknown feature: '+featureId);
  return scopeHref(scopeId,feature.path);
}

export function featureIdForPath(pathname='/'){
  const segment=String(pathname||'/')
    .split('/')
    .filter(Boolean)
    .at(-1)||'';
  return FEATURES.find(item=>item.path===segment)?.id||null;
}

