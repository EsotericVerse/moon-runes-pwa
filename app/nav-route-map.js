export const SHARED_NAV_FUNCTIONS=[['脈絡','context'],['統計','statics'],['文化','evolution'],['治理','governance']];

export const DOMAIN_SCOPES={
  loc:{canonicalHost:'loc.lo3rwang.cc'},
  runes:{canonicalHost:'lrunes.lo3rwang.cc'},
  lo3rwang:{canonicalHost:'lo3rwang.lo3rwang.cc'},
  admin:{canonicalHost:'admin.lo3rwang.cc'}
};

export function detectNavScope(pathname='/',host=''){
  const normalizedHost=String(host||'').toLowerCase();
  if(normalizedHost==='lrunes.lo3rwang.cc')return 'runes';
  if(normalizedHost==='lo3rwang.lo3rwang.cc')return 'lo3rwang';
  if(normalizedHost==='admin.lo3rwang.cc')return 'admin';
  if(pathname==='/admin'||pathname.startsWith('/admin/'))return 'admin';
  if(pathname==='/management'||pathname.startsWith('/management/'))return 'admin';
  if(pathname==='/runes'||pathname.startsWith('/runes/'))return 'runes';
  return 'loc';
}

export function getNavScopeConfig(scope){
  if(scope==='runes')return {scope:'runes',canonicalHost:DOMAIN_SCOPES.runes.canonicalHost,base:'',reserved:['語彙','https://lrunes.lo3rwang.cc/'],role:[['lo3rwang','https://lo3rwang.lo3rwang.cc']],homes:[['回月之符文首頁','https://lrunes.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc']]};
  if(scope==='lo3rwang')return {scope:'lo3rwang',canonicalHost:DOMAIN_SCOPES.lo3rwang.canonicalHost,base:'',reserved:['風格詞','https://lo3rwang.lo3rwang.cc/'],role:[['管理者頁面','https://admin.lo3rwang.cc']],homes:[['回 lo3rwang','https://lo3rwang.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc']]};
  if(scope==='admin')return {scope:'admin',canonicalHost:DOMAIN_SCOPES.admin.canonicalHost,base:'',reserved:['Admin','https://admin.lo3rwang.cc/'],role:[],homes:[['回 Admin','https://admin.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc']]};
  return {scope:'loc',canonicalHost:DOMAIN_SCOPES.loc.canonicalHost,base:'',reserved:['月之符文','https://lrunes.lo3rwang.cc/'],role:[['lo3rwang','https://lo3rwang.lo3rwang.cc']],homes:[['回月典首頁','https://loc.lo3rwang.cc/']]};
}

export function navRoute(config,name){
  const feature=String(name||'').replace(/^\/+|\/+$/g,'');
  const host=String(config?.canonicalHost||'').replace(/^https?:\/\//,'').replace(/\/$/,'');
  if(!host)return `/${feature}`||'/';
  return `https://${host}/${feature}`.replace(/\/$/,'');
}
