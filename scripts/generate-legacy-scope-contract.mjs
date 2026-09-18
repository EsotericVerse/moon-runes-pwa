import { writeFile } from 'node:fs/promises';
import { SHARED_FEATURES, SITE_SCOPES } from '../app/site-registry.js';

const projection={
  schema:1,
  generatedFrom:'app/site-registry.js',
  sharedFeatures:SHARED_FEATURES.map(({id,label,path})=>({id,label,path})),
  scopes:Object.fromEntries(Object.entries(SITE_SCOPES).map(([key,value])=>[
    key,
    {
      id:value.id,
      domain:value.domain,
      label:value.label,
      reserved:value.reserved,
      role:value.role,
      homes:value.homes
    }
  ]))
};

const source=`// GENERATED FILE. DO NOT EDIT.
// Authority: app/site-registry.js
window.__LOC_SITE_REGISTRY__=Object.freeze(${JSON.stringify(projection)});
`;

await writeFile('js/site-registry.generated.js',source,'utf8');
console.log('Generated legacy Scope projection from app/site-registry.js');
