export const SHARED_SCOPE_FUNCTIONS = Object.freeze([
  ['脈絡', 'context'], ['統計', 'statics'], ['文化', 'evolution'], ['治理', 'governance']
]);

export const SCOPE_REGISTRY = Object.freeze({
  loc: Object.freeze({
    id:'loc', zhName:'月典', enName:'Luna Codex', dataset:'loc', host:'loc.lo3rwang.cc',
    canonicalOrigin:'https://loc.lo3rwang.cc', pathBase:'',
    reserved:['月之符文','https://lrunes.lo3rwang.cc/'],
    role:[['作者頁面','https://whoami.lo3rwang.cc/']],
    homes:[['回月典首頁','https://loc.lo3rwang.cc/']]
  }),
  runes: Object.freeze({
    id:'runes', zhName:'月之符文', enName:'LunaRunes', dataset:'runes', host:'lrunes.lo3rwang.cc',
    canonicalOrigin:'https://lrunes.lo3rwang.cc', pathBase:'/runes',
    reserved:['語彙','https://lrunes.lo3rwang.cc/'],
    role:[['作者頁面','https://whoami.lo3rwang.cc/']],
    homes:[['回月之符文首頁','https://lrunes.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc/']]
  }),
  author: Object.freeze({
    id:'author', zhName:'作者', enName:'Author', dataset:'author', host:'whoami.lo3rwang.cc',
    canonicalOrigin:'https://whoami.lo3rwang.cc', pathBase:'',
    reserved:['風格詞','https://whoami.lo3rwang.cc/'],
    role:[['管理者頁面','https://manage.lo3rwang.cc/']],
    homes:[['回作者頁面','https://whoami.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc/']]
  }),
  management: Object.freeze({
    id:'management', zhName:'管理', enName:'Management', dataset:'management', host:'manage.lo3rwang.cc',
    canonicalOrigin:'https://manage.lo3rwang.cc', pathBase:'',
    reserved:['治理規則','https://manage.lo3rwang.cc/'],
    role:[['系統最高管理者設定','https://admin.lo3rwang.cc/']],
    homes:[['回治理頁面','https://manage.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc/']]
  })
});

export function detectScope(pathname='/',host=''){
  if(host==='lrunes.lo3rwang.cc'||pathname==='/runes'||pathname.startsWith('/runes/')) return 'runes';
  if(host==='whoami.lo3rwang.cc') return 'author';
  if(host==='manage.lo3rwang.cc') return 'management';
  return 'loc';
}

export function getScope(scope){ return SCOPE_REGISTRY[scope]||SCOPE_REGISTRY.loc; }

export function scopeRoute(scopeOrConfig,name){
  const config=typeof scopeOrConfig==='string'?getScope(scopeOrConfig):scopeOrConfig;
  return `${config.canonicalOrigin}/${name}`.replace(/([^:]\/)\/+/g,'$1');
}

export function equivalentPathRoute(scopeOrConfig,name=''){
  const config=typeof scopeOrConfig==='string'?getScope(scopeOrConfig):scopeOrConfig;
  return `${config.pathBase}/${name}`.replace(/\/+/g,'/')||'/';
}

export function scopeOwns(scope,dataset){
  if(scope==='author') return dataset==='author'||dataset==='loc'||dataset==='runes';
  return getScope(scope).dataset===dataset;
}
