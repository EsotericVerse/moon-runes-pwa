export const SHARED_NAV_FUNCTIONS=[['脈絡','context'],['統計','statics'],['文化','culture'],['治理','governance']];
const FUNCTION_NAMES=['context','statics','culture','governance','search'];
const functionRoutes=origin=>Object.fromEntries(FUNCTION_NAMES.map(name=>[name,`${origin}/${name}`]));

export function detectNavScope(pathname='/',host=''){
  if(host==='lrunes.lo3rwang.cc'||pathname==='/runes'||pathname.startsWith('/runes/'))return 'runes';
  if(host==='lo3rwang.lo3rwang.cc'||pathname==='/lo3rwang'||pathname.startsWith('/lo3rwang/'))return 'author';
  if(host==='admin.lo3rwang.cc'||pathname==='/management'||pathname.startsWith('/management/'))return 'governance';
  return 'loc';
}

export function getNavScopeConfig(scope,host=''){
  if(scope==='runes'){
    return {
      base:'',
      functions:functionRoutes('https://lrunes.lo3rwang.cc'),
      reserved:['語彙','https://lrunes.lo3rwang.cc/list'],
      role:[['管理者介紹','https://admin.lo3rwang.cc']],
      homes:[['回月之符文首頁','https://lrunes.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc/']]
    };
  }
  if(scope==='author'){
    return {
      base:'',
      functions:functionRoutes('https://lo3rwang.lo3rwang.cc'),
      reserved:['簡介','https://lo3rwang.lo3rwang.cc/'],
      role:[['管理者介紹','https://admin.lo3rwang.cc']],
      homes:[['回作者簡介','https://lo3rwang.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc/']]
    };
  }
  if(scope==='governance'){
    return {
      base:'',
      functions:functionRoutes('https://admin.lo3rwang.cc'),
      reserved:['管理','https://admin.lo3rwang.cc/'],
      role:[['管理者介紹','https://admin.lo3rwang.cc/']],
      homes:[['回管理首頁','https://admin.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc/']]
    };
  }
  return {
    base:'',
    functions:functionRoutes('https://loc.lo3rwang.cc'),
    reserved:['月之符文','https://lrunes.lo3rwang.cc/'],
    role:[['作者介紹','https://lo3rwang.lo3rwang.cc/']],
    homes:[['回月典首頁','https://loc.lo3rwang.cc/']]
  };
}

export function navRoute(config,name){return config.functions[name];}
