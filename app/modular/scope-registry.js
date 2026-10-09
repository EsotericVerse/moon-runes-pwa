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
    default:true,
    aggregateChildren:true,
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
    featureSubtitles:Object.freeze({
      statics:'查看月之符文相關資料的數量、來源與時間變化。',
      culture:'把月之符文相關紀錄放回時間順序，觀察不同時期的變化。',
      governance:'說明月之符文的使用原則、權利邊界與管理方式。',
      search:'從符文名稱、關鍵字或相關文字找到對應內容。'
    }),
    nav:Object.freeze({position:'before',order:1,label:UI_COPY.nav.lunarunes}),
    searchKind:'runes'
  }),

  lo3rwang:Object.freeze({
    id:'lo3rwang',
    featureSubtitles:Object.freeze({search:UI_COPY.scope.author.search}),
    nav:Object.freeze({position:'after',order:1,label:UI_COPY.nav.author})
  }),

  admin:Object.freeze({
    id:'admin',
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

// The database Scope Registry is the authority for Domain/Directory values.
// Next.js still needs a deterministic, static-export fallback before it loads.
// Such fallback paths are derived from existing app/<scope_id> routes, not a
// second Domain or display_name configuration.
let registryRouteRows=new Map();
const LOC_FALLBACK_HOST='loc.lo3rwang.cc';
export function setScopeRegistryRouteRows(rows=[]){
  for(const row of Array.isArray(rows)?rows:[]){
    const id=normalizeScopeId(row?.scope_id);
    if(!id)continue;
    if(row.active===false){registryRouteRows.delete(id);continue;}
    registryRouteRows.set(id,{
      domain:String(row.domain||'').trim().toLowerCase(),
      directory:String(row.directory||'').trim()
    });
  }
}
export function resolveScope(host='',pathname='/'){
  const h=cleanHost(host);
  const segments=cleanPath(pathname).split('/').filter(Boolean);
  // Next filesystem owns these static mounts; Registry owns their public URLs.
  if(segments[0]&&segments[0]!=='loc'&&SCOPES[segments[0]])return segments[0];
  for(const [id,row] of registryRouteRows){
    if(row.domain&&row.domain===h)return id;
    if(row.directory&&h===LOC_FALLBACK_HOST){
      const base=cleanPath(row.directory);
      const path=cleanPath(pathname);
      if(path===base||path.startsWith(base+'/'))return id;
    }
  }
  // Before DB hydration, a subdomain matching an existing static Scope ID
  // can still be resolved without re-declaring its Domain string in JS.
  const prefix=h.endsWith('.lo3rwang.cc')?h.slice(0,-'.lo3rwang.cc'.length):'';
  if(prefix&&SCOPES[prefix]){
    const authoritative=registryRouteRows.get(prefix);
    if(!authoritative||authoritative.domain===h)return prefix;
  }
  return DEFAULT_SCOPE_ID;
}

export function getScope(id){
  const scopeId=normalizeScopeId(id)||DEFAULT_SCOPE_ID;
  // Static Registry stores route identity only; display_name lives in PostgreSQL.
  if(SCOPES[scopeId])return {...SCOPES[scopeId],label:scopeId,searchTitle:scopeId};
  return genericScope(scopeId);
}

export function scopeOrigin(scopeId){
  const id=normalizeScopeId(scopeId);
  const row=registryRouteRows.get(id);
  // Scope Registry Domain/Directory takes precedence after hydration.
  return row?.domain?'https://'+row.domain:'https://'+LOC_FALLBACK_HOST;
}

function scopeBaseHref(scopeId){
  const id=normalizeScopeId(scopeId);
  if(id&&!SCOPES[id])return 'https://'+LOC_FALLBACK_HOST+GENERIC_SCOPE_PATH;
  const row=registryRouteRows.get(id);
  if(row?.domain)return 'https://'+row.domain;
  if(row?.directory)return 'https://'+LOC_FALLBACK_HOST+cleanPath(row.directory);
  if(id===DEFAULT_SCOPE_ID)return 'https://'+LOC_FALLBACK_HOST;
  return 'https://'+LOC_FALLBACK_HOST+'/'+id;
}

export function scopeHref(scopeId,localPath=''){
  const id=normalizeScopeId(scopeId)||DEFAULT_SCOPE_ID;
  const untrimmed=scopeBaseHref(id);
  const base=untrimmed.endsWith('/')?untrimmed.slice(0,-1):untrimmed;
  const raw=String(localPath||'');
  const hashIndex=raw.indexOf('#');
  const hash=hashIndex>=0?raw.slice(hashIndex):'';
  const withoutHash=hashIndex>=0?raw.slice(0,hashIndex):raw;
  const queryIndex=withoutHash.indexOf('?');
  const routePart=queryIndex>=0?withoutHash.slice(0,queryIndex):withoutHash;
  const query=queryIndex>=0?withoutHash.slice(queryIndex+1):'';
  const path=routePart.split('/').filter(Boolean).join('/');
  const pathname=path?'/'+path+'/':'/';
  if(SCOPES[id])return base+pathname+(query?'?'+query:'')+hash;
  const params=new URLSearchParams(query);
  params.set('scope',id);
  return base+pathname+'?'+params.toString()+hash;
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

