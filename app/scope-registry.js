export const SHARED_SCOPE_FUNCTIONS=Object.freeze([
 ['脈絡','context'],['統計','statics'],['文化','evolution'],['治理','governance']
]);
export const SHARED_SCOPE_ROUTES=Object.freeze(['context','statics','evolution','governance','search']);

// Scope is data, not a page type. parentId builds the hierarchy; aggregate controls
// whether a scope reads descendants. refs allows explicit cross-branch composition
// without transferring ownership or governance authority.
export const SCOPE_REGISTRY=Object.freeze({
 loc:Object.freeze({id:'loc',zhName:'月典',enName:'Luna Codex',inputName:'loc',displayName:'所有',parentId:null,aggregate:'descendants',refs:[],dataset:'loc',searchMode:'federated',host:'loc.lo3rwang.cc',canonicalOrigin:'https://loc.lo3rwang.cc',pathBase:'',managerHome:'https://whoami.lo3rwang.cc/',reserved:['月之符文','https://lrunes.lo3rwang.cc/'],role:[['作者頁面','https://whoami.lo3rwang.cc/']],homes:[['回月典首頁','https://loc.lo3rwang.cc/']]}),
 runes:Object.freeze({id:'runes',zhName:'月之符文',enName:'LunaRunes',inputName:'runes',displayName:'月之符文',parentId:'loc',aggregate:'descendants',refs:[],dataset:'runes',searchMode:'local',host:'lrunes.lo3rwang.cc',canonicalOrigin:'https://lrunes.lo3rwang.cc',pathBase:'/runes',managerHome:'https://whoami.lo3rwang.cc/',reserved:['語彙','https://lrunes.lo3rwang.cc/'],role:[['管理者首頁','https://whoami.lo3rwang.cc/']],homes:[['回月之符文首頁','https://lrunes.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc/']],extensions:Object.freeze(['draw','list'])}),
 author:Object.freeze({id:'author',zhName:'作者',enName:'Author',inputName:'author',displayName:'作者',parentId:'loc',aggregate:'descendants',refs:[],dataset:'author',searchMode:'local',host:'whoami.lo3rwang.cc',canonicalOrigin:'https://whoami.lo3rwang.cc',pathBase:'',managerHome:'https://manage.lo3rwang.cc/',reserved:['風格詞','https://whoami.lo3rwang.cc/'],role:[['管理者頁面','https://manage.lo3rwang.cc/']],homes:[['回作者頁面','https://whoami.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc/']],extensions:Object.freeze(['style'])}),
 management:Object.freeze({id:'management',zhName:'管理',enName:'Management',inputName:'management',displayName:'治理',parentId:'loc',aggregate:'descendants',refs:[],dataset:'management',searchMode:'local',host:'manage.lo3rwang.cc',canonicalOrigin:'https://manage.lo3rwang.cc',pathBase:'',managerHome:'https://whoami.lo3rwang.cc/',reserved:['治理規則','https://manage.lo3rwang.cc/'],role:[['管理者首頁','https://whoami.lo3rwang.cc/']],homes:[['回治理頁面','https://manage.lo3rwang.cc/'],['回月典首頁','https://loc.lo3rwang.cc/']],extensions:Object.freeze(['management'])})
});

export function detectScope(pathname='/',host=''){
 if(host==='lrunes.lo3rwang.cc'||pathname==='/runes'||pathname.startsWith('/runes/'))return 'runes';
 if(host==='whoami.lo3rwang.cc')return 'author';
 if(host==='manage.lo3rwang.cc')return 'management';
 return 'loc';
}
export function getScope(scope){return SCOPE_REGISTRY[scope]||SCOPE_REGISTRY.loc;}
export function getScopeChildren(scopeId){return Object.values(SCOPE_REGISTRY).filter(scope=>scope.parentId===scopeId);}
export function getScopeAncestors(scopeId){const result=[];let current=getScope(scopeId);while(current.parentId){current=getScope(current.parentId);result.push(current);}return result;}
export function getScopeDescendants(scopeId){const result=[];const visit=id=>getScopeChildren(id).forEach(child=>{result.push(child);visit(child.id);});visit(scopeId);return result;}
export function getScopeDataSet(scopeId){const scope=getScope(scopeId);const ids=new Set([scope.id]);if(scope.aggregate==='descendants')getScopeDescendants(scope.id).forEach(child=>ids.add(child.id));(scope.refs||[]).forEach(id=>ids.add(id));return [...ids].map(id=>getScope(id).dataset);}
export function scopeRoute(scopeOrConfig,name=''){const c=typeof scopeOrConfig==='string'?getScope(scopeOrConfig):scopeOrConfig;return `${c.canonicalOrigin}/${name}`.replace(/([^:]\/)\/+/g,'$1');}
export function equivalentPathRoute(scopeOrConfig,name=''){const c=typeof scopeOrConfig==='string'?getScope(scopeOrConfig):scopeOrConfig;return `${c.pathBase}/${name}`.replace(/\/+/g,'/')||'/';}
export function scopeOwns(scope,dataset){return getScope(scope).dataset===dataset;}
export function scopeCanRead(scope,dataset){return getScopeDataSet(scope).includes(dataset);}
export function scopeSearchMode(scope){return getScope(scope).searchMode;}
