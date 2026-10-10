import {FEATURES,SCOPES,featureHref,resolveScope,scopeHref,duplicateDomainLabelError,setScopeRegistryRouteRows} from '../app/modular/scope-registry.js';
import {heroExtraFor} from '../app/loc/hero-extra.mjs';

const failures=[];
const expectedExtra=[
  {scopeId:'loc',scopeKind:'group',extraSign:'codex',key:'codex',label:'LOC 圓環中心實心點標誌',text:''},
  {scopeId:'lo3rwang',scopeKind:'scope',extraSign:'anchor',key:'anchor',label:'光之定錨點',text:'光之定錨點'},
  {scopeId:'lrunes',scopeKind:'scope',extraSign:'moon',key:'moon',label:'玄韻家黃色圓點標誌',text:''}
];
for(const {scopeId,scopeKind,extraSign,key,label,text} of expectedExtra){
  const sign=heroExtraFor({scopeId,scopeKind,extraSign});
  if(!sign||sign.key!==key||sign.label!==label||sign.text!==text)
    failures.push('Public Extra Sign contract mismatch: '+scopeId);
}
for(const candidate of [
  {scopeId:'loc',scopeKind:'scope',extraSign:'codex'},
  {scopeId:'lo3rwang',scopeKind:'scope',extraSign:'moon'},
  {scopeId:'lrunes',scopeKind:'group',extraSign:'moon'},
  {scopeId:'anotherscope',scopeKind:'scope',extraSign:'anchor'},
  {scopeId:'lo3rwang',scopeKind:'scope',extraSign:''}
]){
  if(heroExtraFor(candidate)!==null)failures.push('Unregistered/mismatched Scope must not receive protected Extra Sign');
}

if(resolveScope('unknown.example','/')!=='loc')failures.push('default Scope must remain loc');
if(SCOPES.lunarunes)failures.push('retired lunarunes runtime Scope id must not return');
if(!SCOPES.lrunes)failures.push('canonical lrunes Scope id missing');
if(Object.values(SCOPES).some(scope=>Boolean(scope.searchAliases)))failures.push('DB search_aliases must not be duplicated in static Scope Registry');
if(resolveScope('127.0.0.1','/lrunes/')!=='lrunes')failures.push('local static preview must resolve /lrunes/ as LunaRunes');
if(resolveScope('localhost','/lrunes/game/')!=='lrunes')failures.push('local static preview must resolve mounted LunaRunes feature paths');
if(Object.values(SCOPES).some(scope=>scope.domain||scope.mount))failures.push('Scope Domain/Directory values must not be duplicated in static JS');
if(scopeHref('lrunes')!=='https://loc.lo3rwang.cc/lrunes/')failures.push('initial link fallback must use deployed Next mount without a duplicate Domain configuration');
setScopeRegistryRouteRows([
  {scope_id:'loc',domain:'loc.lo3rwang.cc',directory:null,active:true},
  {scope_id:'lrunes',domain:'lrunes.lo3rwang.cc',directory:null,active:true},
  {scope_id:'lo3rwang',domain:null,directory:'/lo3rwang',active:true},
  {scope_id:'admin',domain:'admin.lo3rwang.cc',directory:null,active:true}
]);
if(scopeHref('lrunes')!=='https://lrunes.lo3rwang.cc/')failures.push('LunaRunes canonical Domain must come from DB Registry');
if(resolveScope('lrunes.lo3rwang.cc','/')!=='lrunes')failures.push('LunaRunes host must resolve from DB Registry');
if(scopeHref('lo3rwang')!=='https://loc.lo3rwang.cc/lo3rwang/')failures.push('Author Directory must derive from DB Registry');
if(resolveScope('lo3rwang.lo3rwang.cc','/')!=='loc')failures.push('Directory-only Author must never resolve as an invented subdomain');
if(resolveScope('loc.lo3rwang.cc','/admin/')!=='admin')failures.push('Admin redirect target must resolve as Admin Scope');
for(const [id,mode,reject] of [['lo3rwang','domain',true],['cc','domain',true],['aaa','domain',false],['lo3rwang','directory',false]]){
  if(Boolean(duplicateDomainLabelError(id,mode))!==reject)failures.push('Domain duplicate labels mismatch: '+id+' / '+mode);
}
if(scopeHref('lo3rwang')!=='https://loc.lo3rwang.cc/lo3rwang/')failures.push('Author homepage must remain a LOC Directory route');
if(scopeHref('newscope')!=='https://loc.lo3rwang.cc/scope/?scope=newscope')failures.push('dynamic Scope homepage must use the generic static shell');
if(featureHref('newscope','search')!=='https://loc.lo3rwang.cc/scope/search/?scope=newscope')failures.push('dynamic Scope features must preserve Scope ID in the generic shell query');
for(const [id,scope] of Object.entries(SCOPES)){
  if(scope.id!==id)failures.push(id+' registry key/id mismatch');
  if(scope.domain||scope.mount)failures.push(id+' must not independently define Domain/Directory values');
  for(const feature of FEATURES){
    if(!featureHref(id,feature.id).startsWith('https://'))failures.push(id+'/'+feature.id+' canonical href invalid');
  }
}
if(failures.length){
  console.error('[scope-registry] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[scope-registry] Current Scope identity, resolution and canonical feature URLs verified');
