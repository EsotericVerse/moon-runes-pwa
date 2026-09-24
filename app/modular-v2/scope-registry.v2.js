// Current V2 Scope registry.
export const SCOPE_POLICY_V2=Object.freeze({
  scopeIdPattern:'^[A-Za-z]+$',
  scopeIdExceptions:Object.freeze(['lo3rwang']),
  defaultScopeId:'loc',
  reservedWords:Object.freeze([
    Object.freeze({
      word:'loc',
      scope:'deployment',
      reason:'LOC is reserved in this Current deployment; this does not reserve the word globally for other users, teams, departments or deployments.'
    })
  ])
});

export const FEATURES_V2=Object.freeze([
  Object.freeze({id:'context',label:'脈絡',path:'context'}),
  Object.freeze({id:'statics',label:'統計',path:'statics'}),
  Object.freeze({id:'culture',label:'文化',path:'culture'}),
  Object.freeze({id:'governance',label:'治理',path:'governance'}),
  Object.freeze({id:'search',label:'搜尋',path:'search'})
]);

const TIME_SCHEDULE_V2=Object.freeze([
  Object.freeze({start:0,theme:'theme-1'}),
  Object.freeze({start:6,theme:'theme-7'}),
  Object.freeze({start:18,theme:'theme-1'})
]);

export const SCOPES_V2=Object.freeze({
  loc:Object.freeze({
    id:'loc',
    scopeType:'domain',
    domain:'loc.lo3rwang.cc',
    aliasName:null,
    label:'月典',
    localRoutes:Object.freeze([
      'game',
      'algorithm',
      'galaxy',
      'multimedia',
      'my-style',
      'style-groups',
      'style',
      'classify',
      'governance/history',
      'governance/manage',
      'governance/global-manage'
    ]),
    routePatterns:Object.freeze(['governance/:section','lo3rwang/:section']),
    compatibilityRoutes:Object.freeze(['management']),
    primary:Object.freeze({label:'月之符文',href:'https://lrunes.lo3rwang.cc/'}),
    role:Object.freeze({label:'作者介紹',href:'https://loc.lo3rwang.cc/lo3rwang/'}),
    homes:Object.freeze([{label:'回月典首頁',href:'https://loc.lo3rwang.cc/'}]),
    searchCollection:'all',
    dataViews:Object.freeze({context:'api.loc_context_entries',rankings:'api.loc_rankings'}),
    rankingTitle:'總排行榜',
    theme:Object.freeze({mode:'time',theme:'theme-7',custom:Object.freeze({}),schedule:TIME_SCHEDULE_V2})
  }),

  runes:Object.freeze({
    id:'runes',
    scopeType:'domain',
    domain:'lrunes.lo3rwang.cc',
    aliasName:null,
    label:'月之符文',
    localRoutes:Object.freeze([
      'algorithm',
      'game',
      'list',
      'history',
      'duel/one',
      'duel/daily',
      'duel/two',
      'duel/three',
      'duel/five',
      'duel/ow3gs'
    ]),
    routePatterns:Object.freeze(['list/:group','list/:group/:rune']),
    compatibilityRoutes:Object.freeze([]),
    mount:Object.freeze({host:'loc.lo3rwang.cc',path:'/lrunes'}),
    primary:Object.freeze({label:'月之符文',href:'https://lrunes.lo3rwang.cc/'}),
    role:Object.freeze({label:'管理者頁面',href:'https://loc.lo3rwang.cc/lo3rwang/'}),
    homes:Object.freeze([
      {label:'回月典首頁',href:'https://loc.lo3rwang.cc/'}
    ]),
    searchCollection:'月之符文',
    dataViews:Object.freeze({context:'api.runes_context_entries',rankings:'api.runes_rankings'}),
    rankingTitle:'月之符文排行榜',
    theme:Object.freeze({mode:'fixed',theme:'theme-5',custom:Object.freeze({}),schedule:TIME_SCHEDULE_V2})
  }),

  lo3rwang:Object.freeze({
    id:'lo3rwang',
    scopeType:'directory',
    domain:'dlwang.lo3rwang.cc',
    aliasName:'dlwang',
    label:'作者簡介',
    localRoutes:Object.freeze(['old']),
    routePatterns:Object.freeze([]),
    compatibilityRoutes:Object.freeze([]),
    mount:Object.freeze({host:'loc.lo3rwang.cc',path:'/lo3rwang'}),
    primary:Object.freeze({label:'簡介',href:'https://loc.lo3rwang.cc/lo3rwang/'}),
    role:Object.freeze({label:'管理者介紹',href:'https://loc.lo3rwang.cc/lo3rwang/'}),
    homes:Object.freeze([
      {label:'回月典首頁',href:'https://loc.lo3rwang.cc/'}
    ]),
    searchCollection:'lo3rwang',
    dataViews:Object.freeze({context:'api.lo3rwang_context_entries',rankings:'api.lo3rwang_rankings'}),
    rankingTitle:'作者排行榜',
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
      schedule:TIME_SCHEDULE_V2
    })
  }),

  admin:Object.freeze({
    id:'admin',
    scopeType:'domain',
    domain:'admin.lo3rwang.cc',
    aliasName:null,
    label:'治理管理',
    localRoutes:Object.freeze([]),
    routePatterns:Object.freeze([]),
    compatibilityRoutes:Object.freeze([]),
    primary:Object.freeze({label:'治理管理',href:'https://loc.lo3rwang.cc/governance/global-manage/'}),
    role:Object.freeze({label:'治理管理',href:'https://loc.lo3rwang.cc/governance/global-manage/'}),
    homes:Object.freeze([
      {label:'回治理管理',href:'https://loc.lo3rwang.cc/governance/global-manage/'},
      {label:'回月典首頁',href:'https://loc.lo3rwang.cc/'}
    ]),
    searchCollection:'治理',
    dataViews:Object.freeze({context:null,rankings:null}),
    rankingTitle:'排行榜',
    theme:Object.freeze({mode:'fixed',theme:'theme-7',custom:Object.freeze({}),schedule:TIME_SCHEDULE_V2})
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
    Object.entries(SCOPES_V2).map(([id,scope])=>[scope.domain,id])
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
  return `https://${getScopeV2(scopeId).domain}`;
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
  return path?`${base}/${path}${suffix}`:`${base}/${suffix}`;
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

export function scopeDataViewV2(scopeId,key){
  return getScopeV2(scopeId).dataViews?.[key]||null;
}

export function scopeRoutePathsV2(scopeId){
  const scope=getScopeV2(scopeId);
  return Object.freeze([
    '/',
    ...FEATURES_V2.map(item=>'/'+item.path),
    ...(scope.localRoutes||[]).map(route=>'/'+String(route).replace(/^\/+/,'')) 
  ]);
}

function routePatternMatches(pattern,pathname){
  const expected=cleanPath(pattern).split('/').filter(Boolean);
  const actual=cleanPath(pathname).split('/').filter(Boolean);
  if(expected.length!==actual.length)return false;
  return expected.every((segment,index)=>{
    if(segment.startsWith(':'))return Boolean(actual[index]);
    return segment===actual[index];
  });
}

export function scopeRoutePatternsV2(scopeId){
  const scope=getScopeV2(scopeId);
  return Object.freeze([...(scope.routePatterns||[])].map(pattern=>cleanPath(pattern)));
}

export function scopeCompatibilityRoutesV2(scopeId){
  const scope=getScopeV2(scopeId);
  return Object.freeze([...(scope.compatibilityRoutes||[])].map(route=>cleanPath(route)));
}

export function isScopePathAllowedV2(scopeId,pathname='/'){
  const clean=cleanPath(pathname);
  if(scopeRoutePathsV2(scopeId).includes(clean))return true;
  if(scopeCompatibilityRoutesV2(scopeId).includes(clean))return true;
  return scopeRoutePatternsV2(scopeId).some(pattern=>routePatternMatches(pattern,clean));
}

export function stripScopeMountV2(scopeId,host='',pathname='/'){
  const scope=getScopeV2(scopeId);
  if(!scope.mount||cleanHost(host)!==cleanHost(scope.mount.host)){
    return cleanPath(pathname);
  }

  const full=cleanPath(pathname);
  const base=cleanPath(scope.mount.path);

  if(full===base)return '/';
  if(full.startsWith(base+'/')){
    return cleanPath(full.slice(base.length));
  }
  return full;
}

export function isScopeRequestAllowedV2(scopeId,host='',pathname='/'){
  return isScopePathAllowedV2(
    scopeId,
    stripScopeMountV2(scopeId,host,pathname)
  );
}
