// Single Current site/scope registry.
// All Current consumers must derive domains, shared features, data views and default theme from here.
export const SHARED_FEATURES=Object.freeze([
  Object.freeze({id:'context',label:'脈絡',path:'context'}),
  Object.freeze({id:'statics',label:'統計',path:'statics'}),
  Object.freeze({id:'culture',label:'文化',path:'culture'}),
  Object.freeze({id:'governance',label:'治理',path:'governance'})
]);

const TIME_SCHEDULE=Object.freeze([
  Object.freeze({start:0,theme:'theme-1'}),
  Object.freeze({start:6,theme:'theme-7'}),
  Object.freeze({start:12,theme:'theme-4'}),
  Object.freeze({start:18,theme:'theme-8'})
]);

export const SITE_SCOPES=Object.freeze({
  loc:Object.freeze({
    id:'loc',
    domain:'loc.lo3rwang.cc',
    label:'月典',
    searchCollection:'all',
    dataViews:Object.freeze({context:'loc_context_entries',rankings:'loc_rankings'}),
    reserved:Object.freeze(['月之符文','https://lrunes.lo3rwang.cc/']),
    role:Object.freeze([['作者介紹','https://lo3rwang.lo3rwang.cc/']]),
    homes:Object.freeze([['回月典首頁','https://loc.lo3rwang.cc/']]),
    theme:Object.freeze({mode:'time',theme:'theme-7',custom:Object.freeze({}),schedule:TIME_SCHEDULE})
  }),
  runes:Object.freeze({
    id:'runes',
    domain:'lrunes.lo3rwang.cc',
    label:'月之符文',
    searchCollection:'月之符文',
    dataViews:Object.freeze({context:'runes_context_entries',rankings:'runes_rankings'}),
    reserved:Object.freeze(['語彙','https://lrunes.lo3rwang.cc/list']),
    role:Object.freeze([['管理者介紹','https://admin.lo3rwang.cc/']]),
    homes:Object.freeze([['回月之符文首頁','https://lrunes.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc/']]),
    theme:Object.freeze({mode:'fixed',theme:'theme-5',custom:Object.freeze({}),schedule:TIME_SCHEDULE})
  }),
  lo3rwang:Object.freeze({
    id:'lo3rwang',
    domain:'lo3rwang.lo3rwang.cc',
    label:'作者簡介',
    searchCollection:'政德文化',
    dataViews:Object.freeze({context:'lo3rwang_context_entries',rankings:'lo3rwang_rankings'}),
    reserved:Object.freeze(['簡介','https://lo3rwang.lo3rwang.cc/']),
    role:Object.freeze([['管理者介紹','https://admin.lo3rwang.cc/']]),
    homes:Object.freeze([['回作者簡介','https://lo3rwang.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc/']]),
    theme:Object.freeze({
      mode:'custom',
      theme:'theme-2',
      custom:Object.freeze({
        '--loc-bg':'#eaf5ff',
        '--loc-panel':'#f8fcff',
        '--loc-panel-2':'#dceefe',
        '--loc-accent':'#6FA8DC',
        '--loc-body-glow':'#d4eafa',
        '--loc-body-mid':'#edf7ff',
        '--loc-hero-start':'rgba(218,239,255,.97)',
        '--loc-hero-end':'rgba(248,252,255,.99)'
      }),
      schedule:TIME_SCHEDULE
    })
  }),
  admin:Object.freeze({
    id:'admin',
    domain:'admin.lo3rwang.cc',
    label:'治理管理',
    searchCollection:'治理',
    dataViews:Object.freeze({context:null,rankings:null}),
    reserved:Object.freeze(['管理','https://admin.lo3rwang.cc/']),
    role:Object.freeze([['管理者介紹','https://admin.lo3rwang.cc/']]),
    homes:Object.freeze([['回管理首頁','https://admin.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc/']]),
    theme:Object.freeze({mode:'fixed',theme:'theme-7',custom:Object.freeze({}),schedule:TIME_SCHEDULE})
  })
});

export function detectSiteScope(pathname='/',host=''){
  const h=String(host||'').toLowerCase();
  if(h===SITE_SCOPES.runes.domain||pathname==='/runes'||pathname.startsWith('/runes/'))return 'runes';
  if(h===SITE_SCOPES.lo3rwang.domain||pathname==='/lo3rwang'||pathname.startsWith('/lo3rwang/'))return 'lo3rwang';
  if(h===SITE_SCOPES.admin.domain||pathname==='/management'||pathname.startsWith('/management/'))return 'admin';
  return 'loc';
}

export function getSiteScope(scope){return SITE_SCOPES[scope]||SITE_SCOPES.loc;}
export function scopeOrigin(scope){return `https://${getSiteScope(scope).domain}`;}
export function featureRoute(scope,feature){return `${scopeOrigin(scope)}/${feature}`;}
export function scopeDataView(scope,feature){return getSiteScope(scope).dataViews?.[feature]||null;}
