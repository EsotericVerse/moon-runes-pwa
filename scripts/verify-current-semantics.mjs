import fs from 'node:fs';

const files={
  identity:'app/loc/views/AboutView.jsx',
  registry:'app/modular-v2/scope-registry.v2.js',
  guidance:'app/loc/model/semantic-guidance.js',
  canonicalRoute:'app/api/loc/data/route.js'
};
const failures=[];
const read=path=>fs.readFileSync(path,'utf8');
for(const [name,path] of Object.entries(files)){
  if(!fs.existsSync(path))failures.push(`${path}: missing canonical guard file`);
  else if(!read(path).trim())failures.push(`${path}: empty canonical guard file`);
}
const identity=read(files.identity);
for(const token of ['模型化語言框架','Modelized Language Framework','符號式語言','Symbolic Language'])if(!identity.includes(token))failures.push(`identity: missing ${token}`);
const registry=read(files.registry);
for(const token of ["defaultScopeId:'loc'","canonical_context","canonical_rankings","domain:'lrunes.lo3rwang.cc'"])if(!registry.includes(token))failures.push(`scope registry: missing ${token}`);
const guidance=read(files.guidance);
for(const token of ['DIRECTION_FACTOR','SPREAD_WEIGHTS','finalGuidance'])if(!guidance.includes(token))failures.push(`semantic guidance: missing ${token}`);
const route=read(files.canonicalRoute);
for(const token of ['silver.lrunes_runes','silver.lrunes_evolution_history','NEON_SOURCE_UNMAPPED'])if(!route.includes(token))failures.push(`canonical route: missing ${token}`);
for(const path of Object.values(files))if(/data\/json|runtime_json_documents|loc_(?:context|rankings)/.test(read(path)))failures.push(`${path}: retired JSON/projection identifier remains`);

if(failures.length){console.error('Current semantic authority guard failed:\\n'+failures.map(item=>`- ${item}`).join('\\n'));process.exit(1);}
console.log('Current semantic authority guard passed for the Neon canonical runtime.');
