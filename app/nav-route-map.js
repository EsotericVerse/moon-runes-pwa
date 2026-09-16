export const SHARED_NAV_FUNCTIONS=[['脈絡','context'],['統計','statics'],['文化','evolution'],['治理','governance']];

export function detectNavScope(pathname='/',host=''){
  if(host==='lrunes.lo3rwang.cc'||pathname==='/runes'||pathname.startsWith('/runes/'))return 'runes';
  if(host==='whoami.lo3rwang.cc')return 'author';
  if(pathname==='/management'||pathname.startsWith('/management/'))return 'management';
  return 'loc';
}

export function getNavScopeConfig(scope){
  if(scope==='runes')return {
    reserved:['語彙','https://lrunes.lo3rwang.cc/'],
    functions:{
      context:'https://lrunes.lo3rwang.cc/context',
      statics:'https://lrunes.lo3rwang.cc/statics',
      evolution:'https://lrunes.lo3rwang.cc/evolution',
      governance:'https://lrunes.lo3rwang.cc/governance',
      search:'https://lrunes.lo3rwang.cc/search'
    },
    role:[['作者頁面','https://whoami.lo3rwang.cc']],
    homes:[['回月之符文首頁','https://lrunes.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc']]
  };
  if(scope==='author')return {
    reserved:['風格詞','https://whoami.lo3rwang.cc/'],
    functions:{context:'https://whoami.lo3rwang.cc/context',statics:'https://whoami.lo3rwang.cc/statics',evolution:'https://whoami.lo3rwang.cc/evolution',governance:'https://whoami.lo3rwang.cc/governance',search:'https://whoami.lo3rwang.cc/search'},
    role:[['管理者頁面','https://manage.lo3rwang.cc']],homes:[['回作者頁面','https://whoami.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc']]
  };
  if(scope==='management')return {
    reserved:['治理規則','/management'],functions:{context:'/context',statics:'/statics',evolution:'/evolution',governance:'/governance',search:'/search'},role:[],homes:[['回治理頁面','/governance'],['回月典首頁','/']]
  };
  return {
    reserved:['月之符文','https://lrunes.lo3rwang.cc/'],
    functions:{context:'/context',statics:'/statics',evolution:'/evolution',governance:'/governance',search:'/search'},
    role:[['作者頁面','https://whoami.lo3rwang.cc']],homes:[['回月典首頁','/']]
  };
}

export function navRoute(config,name){return config.functions[name];}
