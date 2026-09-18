// Shadow architecture. Not wired into Current runtime.
export const FEATURES_V2=Object.freeze([
  Object.freeze({id:'context',label:'脈絡',path:'context'}),
  Object.freeze({id:'statics',label:'統計',path:'statics'}),
  Object.freeze({id:'culture',label:'文化',path:'culture'}),
  Object.freeze({id:'governance',label:'治理',path:'governance'}),
  Object.freeze({id:'search',label:'搜尋',path:'search'})
]);

export const SCOPES_V2=Object.freeze({
  loc:Object.freeze({
    id:'loc',domain:'loc.lo3rwang.cc',label:'月典',
    primary:Object.freeze({label:'月之符文',href:'https://lrunes.lo3rwang.cc/'}),
    role:Object.freeze({label:'作者介紹',href:'https://lo3rwang.lo3rwang.cc/'}),
    homes:Object.freeze([{label:'回月典首頁',href:'https://loc.lo3rwang.cc/'}])
  }),
  runes:Object.freeze({
    id:'runes',domain:'lrunes.lo3rwang.cc',label:'月之符文',
    primary:Object.freeze({label:'語彙',href:'https://lrunes.lo3rwang.cc/list'}),
    role:Object.freeze({label:'管理者介紹',href:'https://admin.lo3rwang.cc/'}),
    homes:Object.freeze([
      {label:'回月之符文首頁',href:'https://lrunes.lo3rwang.cc/'},
      {label:'回月典首頁',href:'https://loc.lo3rwang.cc/'}
    ])
  }),
  lo3rwang:Object.freeze({
    id:'lo3rwang',domain:'lo3rwang.lo3rwang.cc',label:'作者簡介',
    primary:Object.freeze({label:'簡介',href:'https://lo3rwang.lo3rwang.cc/'}),
    role:Object.freeze({label:'管理者介紹',href:'https://admin.lo3rwang.cc/'}),
    homes:Object.freeze([
      {label:'回作者簡介',href:'https://lo3rwang.lo3rwang.cc/'},
      {label:'回月典首頁',href:'https://loc.lo3rwang.cc/'}
    ])
  }),
  admin:Object.freeze({
    id:'admin',domain:'admin.lo3rwang.cc',label:'治理管理',
    primary:Object.freeze({label:'管理',href:'https://admin.lo3rwang.cc/'}),
    role:Object.freeze({label:'管理者介紹',href:'https://admin.lo3rwang.cc/'}),
    homes:Object.freeze([
      {label:'回管理首頁',href:'https://admin.lo3rwang.cc/'},
      {label:'回月典首頁',href:'https://loc.lo3rwang.cc/'}
    ])
  })
});

export function resolveScopeV2(host='',pathname='/'){
  const h=String(host||'').toLowerCase();
  if(h===SCOPES_V2.runes.domain||pathname==='/runes'||pathname.startsWith('/runes/'))return 'runes';
  if(h===SCOPES_V2.lo3rwang.domain||pathname==='/lo3rwang'||pathname.startsWith('/lo3rwang/'))return 'lo3rwang';
  if(h===SCOPES_V2.admin.domain||pathname==='/management'||pathname.startsWith('/management/'))return 'admin';
  return 'loc';
}
export function getScopeV2(id){return SCOPES_V2[id]||SCOPES_V2.loc;}
export function featureHrefV2(scopeId,featureId){
  const scope=getScopeV2(scopeId);
  const feature=FEATURES_V2.find(item=>item.id===featureId);
  if(!feature)throw new Error('Unknown feature: '+featureId);
  return `https://${scope.domain}/${feature.path}`;
}
