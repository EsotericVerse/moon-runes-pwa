import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const guarded=[
 'data/json/registries/LOC_LANGUAGE_SYSTEM_REGISTRY.json',
 'data/json/registries/LOC_TERMINOLOGY_CANON.json',
 'data/json/registries/LOC_SHARED_SCHEMA.json',
 'data/json/registries/LOC_SHARED_MANIFEST.json',
 'data/json/registries/LOC_REFERENCE_MODEL.json',
 'data/json/registries/LOC_SOURCE_TYPE_REGISTRY.json',
 'data/json/registries/LOC_CONTENT_TYPE_REGISTRY.json',
 'data/json/registries/LOC_CONTENT_RIGHTS_POLICY.json',
 'data/json/registries/LOC_SOURCE_SYNC_POLICY.json',
 'data/json/registries/LOC_ANALYSIS_TYPE_REGISTRY.json',
 'data/json/registries/LOC_SEMANTIC_FAMILY_REGISTRY.json',
 'data/json/registries/LOC_KEYWORD_GOVERNANCE.json',
 'data/json/registries/LOC_GRAPH_SCHEMA.json',
 'data/json/registries/LOC_GRAPH_EVAL_CASES.json'
];
const failures=[];
const numbered=/^LOC[1-8](?:\b|[/_-])/i;
function walk(v,k='',historical=false){if(Array.isArray(v)){v.forEach((x,i)=>walk(x,`${k}[${i}]`,historical));return;}if(!v||typeof v!=='object')return;for(const [key,child] of Object.entries(v)){const next=k?`${k}.${key}`:key;const hist=historical||/historical|provenance|legacy|compatibility/i.test(key);if(!hist&&typeof child==='string'){if(/^(authority|owner|owner_rule|primary_loc)$/i.test(key)&&numbered.test(child))failures.push(`${next}=${JSON.stringify(child)}`);if(/\bLOC[1-8]\b\s+(?:owns?|authority)/i.test(child))failures.push(`${next} contains numbered Current authority`);}walk(child,next,hist);}}
for(const rel of guarded){const full=path.join(root,rel);if(!fs.existsSync(full)){failures.push(`${rel}: missing guarded Current file`);continue;}try{walk(JSON.parse(fs.readFileSync(full,'utf8')),rel,false);}catch(e){failures.push(`${rel}: invalid JSON (${e.message})`);}}
const currentRegistryDir=path.join(root,'data/json/registries');
const namingDebt=fs.readdirSync(currentRegistryDir)
  .filter(name=>/^LOC[1-8](?:_|-)/i.test(name))
  .map(name=>`data/json/registries/${name}`);

if(failures.length){
  console.error('Current semantic contamination detected:');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
if(namingDebt.length){
  console.warn('Historical numbered registry filename migration debt:');
  namingDebt.forEach(x=>console.warn('- '+x));
}
console.log('Current semantic authority guard passed.');
