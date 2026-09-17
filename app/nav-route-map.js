export const SHARED_NAV_FUNCTIONS=[['脈絡','context'],['統計','statics'],['文化','evolution'],['治理','governance']];

export function detectNavScope(pathname='/',host=''){
  const normalizedHost=String(host||'').toLowerCase();
  if(normalizedHost==='lrunes.lo3rwang.cc')return 'runes';
  if(normalizedHost==='lo3rwang.cc')return 'lo3rwang';
  if(normalizedHost==='manage.lo3rwang.cc')return 'governance';
  if(pathname==='/management'||pathname.startsWith('/management/'))return 'governance';
  if(pathname==='/runes'||pathname.startsWith('/runes/'))return 'runes';
  return 'loc';
}

export function getNavScopeConfig(scope,host=''){
  if(scope==='runes'){
    const base=host==='lrunes.lo3rwang.cc'?'':'/runes';
    return {scope:'runes',base,reserved:['語彙',base||'/'],role:[['lo3rwang','https://lo3rwang.cc']],homes:[['回月之符文首頁',base||'/'],['回月典首頁','https://loc.lo3rwang.cc']]};
  }
  if(scope==='lo3rwang')return {scope:'lo3rwang',base:'',reserved:['風格詞','/'],role:[['管理者頁面','https://manage.lo3rwang.cc']],homes:[['回 lo3rwang','/'],['回月典首頁','https://loc.lo3rwang.cc']]};
  if(scope==='governance')return {scope:'governance',base:'',reserved:['治理規則','/'],role:[['管理者頁面','https://manage.lo3rwang.cc']],homes:[['回治理頁面','/'],['回月典首頁','https://loc.lo3rwang.cc']]};
  return {scope:'loc',base:'',reserved:['月之符文','/runes'],role:[['lo3rwang','https://lo3rwang.cc']],homes:[['回月典首頁','/']]};
}

export function navRoute(config,name){
  const feature=String(name||'').replace(/^\/+|\/+$/g,'');
  const base=String(config?.base||'').replace(/\/$/,'');
  return `${base}/${feature}`.replace(/\/{2,}/g,'/')||'/';
}
