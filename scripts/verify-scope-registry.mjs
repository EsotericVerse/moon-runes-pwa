import {FEATURES,SCOPES,featureHref,resolveScope,resolveScopeSearchAlias,scopeHref} from '../app/modular/scope-registry.js';

const failures=[];
if(resolveScope('unknown.example','/')!=='loc')failures.push('default Scope must remain loc');
if(resolveScope('127.0.0.1','/lrunes/')!=='lrunes')failures.push('local static runtime must resolve mounted LunaRunes path');
if(SCOPES.lunarunes)failures.push('retired lunarunes runtime Scope id must not return');
if(!SCOPES.lrunes)failures.push('canonical lrunes Scope id missing');
for(const [query,id] of [['月典','loc'],['LunaCodex','loc'],['LOC','loc'],['月之符文','lrunes'],['LunaRunes','lrunes'],['lrunes','lrunes'],['lo3rwang','lo3rwang'],['政德','lo3rwang'],['Lucas Oscar Wang','lo3rwang']]){
  if(resolveScopeSearchAlias(query)?.id!==id)failures.push('Scope search alias mismatch: '+query+' -> '+id);
}
if(resolveScopeSearchAlias('月')!==null)failures.push('Scope search aliases must require exact matches');
if(scopeHref('newscope')!=='https://loc.lo3rwang.cc/scope/?scope=newscope')failures.push('dynamic Scope homepage must use the generic static shell');
if(featureHref('newscope','search')!=='https://loc.lo3rwang.cc/scope/search/?scope=newscope')failures.push('dynamic Scope features must preserve Scope ID in the generic shell query');
for(const [id,scope] of Object.entries(SCOPES)){
  if(scope.id!==id)failures.push(id+' registry key/id mismatch');
  if(scope.domain&&resolveScope(scope.domain,'/')!==id)failures.push(id+' domain resolution mismatch');
  if(scope.domain&&!featureHref(id,FEATURES[0].id).startsWith('https://'+scope.domain+'/'))failures.push(id+' canonical domain mismatch');
  if(!scope.domain&&!scope.mount)failures.push(id+' route identity missing');
  if(scope.mount&&resolveScope(scope.mount.host,scope.mount.path)!==id)failures.push(id+' mount resolution mismatch');
  for(const feature of FEATURES){
    if(!featureHref(id,feature.id).startsWith('https://'))failures.push(id+'/'+feature.id+' canonical href invalid');
  }
}
if(failures.length){
  console.error('[scope-registry] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[scope-registry] Current Scope identity, resolution and canonical feature URLs verified');
