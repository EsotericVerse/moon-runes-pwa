import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { SHARED_FEATURES, SITE_SCOPES } from '../app/site-registry.js';

const projectionSource=await readFile('js/site-registry.generated.js','utf8');
const context={window:{}};
vm.createContext(context);
vm.runInContext(projectionSource,context);

const actual=context.window.__LOC_SITE_REGISTRY__;
const expected={
  schema:1,
  generatedFrom:'app/site-registry.js',
  sharedFeatures:SHARED_FEATURES.map(({id,label,path})=>({id,label,path})),
  scopes:Object.fromEntries(Object.entries(SITE_SCOPES).map(([key,value])=>[
    key,
    {id:value.id,domain:value.domain,label:value.label,reserved:value.reserved,role:value.role,homes:value.homes}
  ]))
};

if(JSON.stringify(actual)!==JSON.stringify(expected)){
  throw new Error('Legacy Scope projection drifted from app/site-registry.js. Run npm run generate:legacy-scope.');
}

const legacyNav=await readFile('js/loc-nav.js','utf8');
for(const token of ['whoami.lo3rwang.cc','manage.lo3rwang.cc','/evolution','THEME_MODES','DAY_START_HOUR','NIGHT_START_HOUR']){
  if(legacyNav.includes(token))throw new Error(`Legacy NAV regained Current authority token: ${token}`);
}
for(const token of ['__LOC_SITE_REGISTRY__','site-registry.generated.js']){
  if(!legacyNav.includes(token))throw new Error(`Legacy NAV must consume generated Scope projection: ${token}`);
}

console.log('Single Scope Registry authority verified; legacy NAV is compatibility-only.');
