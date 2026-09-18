import {FEATURES_V2,SCOPES_V2,featureHrefV2,resolveScopeV2} from '../app/modular-v2/scope-registry.v2.js';

const failures=[];
const expectedDomains={
  loc:'loc.lo3rwang.cc',
  runes:'lrunes.lo3rwang.cc',
  lo3rwang:'lo3rwang.lo3rwang.cc',
  admin:'admin.lo3rwang.cc'
};
for(const [id,domain] of Object.entries(expectedDomains)){
  if(SCOPES_V2[id]?.domain!==domain)failures.push(id+' domain mismatch');
}
if(JSON.stringify(FEATURES_V2.map(x=>x.id))!==JSON.stringify(['context','statics','culture','governance','search'])){
  failures.push('feature registry mismatch');
}
for(const [host,expected] of Object.entries({
  'loc.lo3rwang.cc':'loc',
  'lrunes.lo3rwang.cc':'runes',
  'lo3rwang.lo3rwang.cc':'lo3rwang',
  'admin.lo3rwang.cc':'admin'
})){
  if(resolveScopeV2(host,'/')!==expected)failures.push(host+' scope mismatch');
}
for(const id of Object.keys(expectedDomains)){
  for(const feature of FEATURES_V2){
    if(featureHrefV2(id,feature.id)!==`https://${expectedDomains[id]}/${feature.path}`)failures.push(id+'/'+feature.id+' route mismatch');
  }
}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('shadow modular v2 registry verified');
