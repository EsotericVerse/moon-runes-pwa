// Shadow architecture. Not wired into Current runtime.
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
  Object.freeze({start:12,theme:'theme-4'}),
  Object.freeze({start:18,theme:'theme-8'})
]);

export const SCOPES_V2=Object.freeze({
  loc:Object.freeze({
    id:'loc',domain:'loc.lo3rwang.cc',label:'月典',
    primary:Object.freeze({label:'月之符文',href:'https://lrunes.lo3rwang.cc/'}),
    role:Object.freeze({label:'作者介紹',href:'https://lo3rwang.lo3rwang.cc/'}),
    homes:Object.freeze([{label:'回月典首頁',href:'https://loc.lo3rwang.cc/'}]),
    searchCollection:'all',
    dataViews:Object.freeze({context:'loc_context_entries',rankings:'loc_rankings'}),
    theme:Object.freeze({mode:'time',theme:'theme-7',custom:Object.freeze({}),schedule:TIME_SCHEDULE_V2})
  }),
  runes:Object.freeze({
    id:'runes',domain:'lrunes.lo3rwang.cc',label:'月之符文',
    primary:Object.freeze({label:'語彙',href:'https://lrunes.lo3rwang.cc/list'}),
    role:Object.freeze({label:'管理者介紹',href:'https://admin.lo3rwang.cc/'}),
    homes:Object.freeze([
      {label:'回月之符文首頁',href:'https://lrunes.lo3rwang.cc/'},
      {label:'回月典首頁',href:'https://loc.lo3rwang.cc/'}
    ]),
    searchCollection:'月之符文',
    dataViews:Object.freeze({context:'runes_context_entries',rankings:'runes_rankings'}),
    theme:Object.freeze({mode:'fixed',theme:'theme-5',custom:Object.freeze({}),schedule:TIME_SCHEDULE_V2})
  }),
  lo3rwang:Object.freeze({
    id:'lo3rwang',domain:'lo3rwang.lo3rwang.cc',label:'作者簡介',
    primary:Object.freeze({label:'簡介',href:'https://lo3rwang.lo3rwang.cc/'}),
    role:Object.freeze({label:'管理者介紹',href:'https://admin.lo3rwang.cc/'}),
    homes:Object.freeze([
      {label:'回作者簡介',href:'https://lo3rwang.lo3rwang.cc/'},
      {label:'回月典首頁',href:'https://loc.lo3rwang.cc/'}
    ]),
    searchCollection:'政德文化',
    dataViews:Object.freeze({context:'lo3rwang_context_entries',rankings:'lo3rwang_rankings'}),
    theme:Object.freeze({
      mode:'custom',theme:'theme-2',
      custom:Object.freeze({
        '--loc-bg':'#eaf5ff','--loc-panel':'#f8fcff','--loc-panel-2':'#dceefe',
        '--loc-accent':'#6FA8DC','--loc-body-glow':'#d4eafa','--loc-body-mid':'#edf7ff',
        '--loc-hero-start':'rgba(218,239,255,.97)','--loc-hero-end':'rgba(248,252,255,.99)'
      }),
      schedule:TIME_SCHEDULE_V2
    })
  }),
  admin:Object.freeze({
    id:'admin',domain:'admin.lo3rwang.cc',label:'治理管理',
    primary:Object.freeze({label:'管理',href:'https://admin.lo3rwang.cc/'}),
    role:Object.freeze({label:'管理者介紹',href:'https://admin.lo3rwang.cc/'}),
    homes:Object.freeze([
      {label:'回管理首頁',href:'https://admin.lo3rwang.cc/'},
      {label:'回月典首頁',href:'https://loc.lo3rwang.cc/'}
    ]),
    searchCollection:'治理',
    dataViews:Object.freeze({context:null,rankings:null}),
    theme:Object.freeze({mode:'fixed',theme:'theme-7',custom:Object.freeze({}),schedule:TIME_SCHEDULE_V2})
  })
});

function cleanHost(host=''){return String(host||'').toLowerCase().split(':')[0];}
export function resolveScopeV2(host='',pathname='/'){
  const h=cleanHost(host);
  if(h===SCOPES_V2.runes.domain||pathname==='/runes'||pathname.startsWith('/runes/'))return 'runes';
  if(h===SCOPES_V2.lo3rwang.domain||pathname==='/lo3rwang'||pathname.startsWith('/lo3rwang/'))return 'lo3rwang';
  if(h===SCOPES_V2.admin.domain||pathname==='/management'||pathname.startsWith('/management/'))return 'admin';
  return 'loc';
}
export function getScopeV2(id){return SCOPES_V2[id]||SCOPES_V2.loc;}
export function scopeOriginV2(scopeId){return `https://${getScopeV2(scopeId).domain}`;}
export function featureHrefV2(scopeId,featureId){
  const feature=FEATURES_V2.find(item=>item.id===featureId);
  if(!feature)throw new Error('Unknown feature: '+featureId);
  return `${scopeOriginV2(scopeId)}/${feature.path}`;
}
export function featureIdForPathV2(pathname='/'){
  const segment=String(pathname||'/').split('/').filter(Boolean).at(-1)||'';
  return FEATURES_V2.find(item=>item.path===segment)?.id||null;
}
export function scopeDataViewV2(scopeId,key){return getScopeV2(scopeId).dataViews?.[key]||null;}
