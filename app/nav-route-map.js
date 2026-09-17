export const SHARED_NAV_FUNCTIONS=[['脈絡','context'],['統計','statics'],['文化','evolution'],['治理','governance']];

export function detectNavScope(pathname='/',host=''){
  const normalizedHost=String(host||'').toLowerCase();
  if(normalizedHost==='lrunes.lo3rwang.cc')return 'runes';
  if(normalizedHost==='lo3rwang.cc')return 'lo3rwang';
  if(normalizedHost==='admin.lo3rwang.cc')return 'admin';
  if(pathname==='/admin'||pathname.startsWith('/admin/'))return 'admin';
  if(pathname==='/management'||pathname.startsWith('/management/'))return 'admin';
  if(pathname==='/runes'||pathname.startsWith('/runes/'))return 'runes';
  return 'loc';
}

export function getNavScopeConfig(scope,host=''){
  if(scope==='runes'){
    const base=host==='lrunes.lo3rwang.cc'?'':'/runes';
    return {scope:'runes',base,reserved:['語彙',base||'/'],role:[['lo3rwang','https://lo3rwang.cc']],homes:[['回月之符文首頁',base||'/'],['回月典首頁','https://loc.lo3rwang.cc']]};
  }
  if(scope==='lo3rwang')return {scope:'lo3rwang',base:'',reserved:['風格詞','/'],role:[['管理者頁面','https://admin.lo3rwang.cc']],homes:[['回 lo3rwang','/'],['回月典首頁','https://loc.lo3rwang.cc']]};
  if(scope==='admin')return {scope:'admin',base:'',reserved:['Admin','/'],role:[],homes:[['回 Admin','/'],['回月典首頁','https://loc.lo3rwang.cc']]};
  return {scope:'loc',base:'',reserved:['月之符文','/runes'],role:[['lo3rwang','https://lo3rwang.cc']],homes:[['回月典首頁','/']]};
}

export function navRoute(config,name){
  const feature=String(name||'').replace(/^\/+|\/+$/g,'');
  const base=String(config?.base||'').replace(/\/$/,'');
  return `${base}/${feature}`.replace(/\/{2,}/g,'/')||'/';
}
