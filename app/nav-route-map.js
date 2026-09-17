export const SHARED_NAV_FUNCTIONS=[['脈絡','context'],['統計','statics'],['文化','evolution'],['治理','governance']];
const FUNCTION_NAMES=['context','statics','evolution','governance','search'];
const functionRoutes=origin=>Object.fromEntries(FUNCTION_NAMES.map(name=>[name,`${origin}/${name}`]));

export function detectNavScope(pathname='/',host=''){
  if(host==='lrunes.lo3rwang.cc'||pathname==='/runes'||pathname.startsWith('/runes/'))return 'runes';
  if(host==='whoami.lo3rwang.cc')return 'author';
  if(host==='manage.lo3rwang.cc'||pathname==='/management'||pathname.startsWith('/management/'))return 'governance';
  return 'loc';
}

export function getNavScopeConfig(scope,host=''){
  if(scope==='runes'){
    const base=host==='lrunes.lo3rwang.cc'?'':'/runes';
    return {base,functions:functionRoutes('https://lrunes.lo3rwang.cc'),reserved:['語彙',base||'/'],role:[['作者頁面','https://whoami.lo3rwang.cc']],homes:[['回月之符文首頁',base||'/'],['回月典首頁','https://loc.lo3rwang.cc']]};
  }
  if(scope==='author')return {base:'',functions:functionRoutes('https://whoami.lo3rwang.cc'),reserved:['風格詞','/'],role:[['管理者頁面','https://manage.lo3rwang.cc']],homes:[['回作者頁面','/'],['回月典首頁','https://loc.lo3rwang.cc']]};
  if(scope==='governance')return {base:'',functions:functionRoutes('https://manage.lo3rwang.cc'),reserved:['治理規則','/'],role:[['管理者頁面','https://manage.lo3rwang.cc']],homes:[['回治理頁面','/'],['回月典首頁','https://loc.lo3rwang.cc']]};
  return {base:'',functions:functionRoutes('https://loc.lo3rwang.cc'),reserved:['月之符文','/runes'],role:[['作者頁面','https://whoami.lo3rwang.cc']],homes:[['回月典首頁','/']]};
}

export function navRoute(config,name){return config.functions[name];}
