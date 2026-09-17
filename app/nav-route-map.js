export const SHARED_NAV_FUNCTIONS=[['脈絡','context'],['統計','statics'],['文化','evolution'],['治理','governance']];

export function detectNavScope(pathname='/',host=''){
  const normalizedHost=String(host||'').toLowerCase();
  // Domain is the highest routing authority. Directory/path is interpreted only
  // after the host has established Scope, or as a compatibility fallback when
  // no governed host is available.
  if(normalizedHost==='lrunes.lo3rwang.cc')return 'runes';
  if(normalizedHost==='lo3rwang.lo3rwang.cc'||normalizedHost==='lo3rwang.cc')return 'lo3rwang';
  if(normalizedHost==='admin.lo3rwang.cc')return 'admin';
  if(normalizedHost==='loc.lo3rwang.cc')return 'loc';
  if(pathname==='/admin'||pathname.startsWith('/admin/'))return 'admin';
  if(pathname==='/management'||pathname.startsWith('/management/'))return 'admin';
  if(pathname==='/runes'||pathname.startsWith('/runes/'))return 'runes';
  return 'loc';
}

export function getNavScopeConfig(scope,host=''){
  if(scope==='runes'){
    const base=host==='lrunes.lo3rwang.cc'?'':'/runes';
    return {scope:'runes',base,reserved:['語彙','https://lrunes.lo3rwang.cc/list'],role:[['管理者首頁','https://lo3rwang.lo3rwang.cc']],homes:[['回月之符文首頁','https://lrunes.lo3rwang.cc'],['回月典首頁','https://loc.lo3rwang.cc']]};
  }
  if(scope==='lo3rwang')return {scope:'lo3rwang',base:'',reserved:['風格詞','/'],role:[['管理者頁面','https://admin.lo3rwang.cc']],homes:[['回 lo3rwang','/'],['回月典首頁','https://loc.lo3rwang.cc']]};
  if(scope==='admin')return {scope:'admin',base:'',reserved:['Admin','/'],role:[],homes:[['回 Admin','/'],['回月典首頁','https://loc.lo3rwang.cc']]};
  return {scope:'loc',base:'',reserved:['月之符文','https://lrunes.lo3rwang.cc'],role:[['管理者首頁','https://lo3rwang.lo3rwang.cc']],homes:[['回月典首頁','https://loc.lo3rwang.cc']]};
}

export function navRoute(config,name){
  const feature=String(name||'').replace(/^\/+|\/+$/g,'');
  const base=String(config?.base||'').replace(/\/$/,'');
  return `${base}/${feature}`.replace(/\/{2,}/g,'/')||'/';
}
