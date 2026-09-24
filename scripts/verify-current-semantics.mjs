import fs from 'node:fs';

const files={
  identity:'app/loc/views/AboutView.jsx',
  registry:'app/modular-v2/scope-registry.v2.js',
  guidance:'app/loc/model/semantic-guidance.js',
  canonicalLoader:'app/loc/data.js',
  search:'app/loc/neon-search.js',
  searchView:'app/modular-v2/features/SearchV2.jsx'
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
for(const token of ["defaultScopeId:'loc'","dataViews:Object.freeze({context:'api.loc_context_entries',rankings:'api.loc_rankings'})","domain:'lrunes.lo3rwang.cc'"])if(!registry.includes(token))failures.push(`scope registry: missing ${token}`);
const guidance=read(files.guidance);
for(const token of ['DIRECTION_FACTOR','SPREAD_WEIGHTS','finalGuidance'])if(!guidance.includes(token))failures.push(`semantic guidance: missing ${token}`);
const loader=read(files.canonicalLoader);
for(const token of ['selectNeonRows','silver.lrunes_runes'])if(!loader.includes(token))failures.push(`canonical Neon loader: missing ${token}`);
for(const path of Object.values(files))if(/data\/json|runtime_json_documents/.test(read(path)))failures.push(`${path}: retired JSON identifier remains`);

const search=read(files.search);
for(const token of ['columns:columns.join(\',\')','filter(value=>typeof value===\'string\')'])if(!search.includes(token))failures.push(`search: missing scalar-only projection ${token}`);
for(const path of [files.search,files.searchView,files.canonicalLoader]){
  const source=read(path);
  if(/columns:\s*['"]\*['"]|JSON\.stringify|canonical_payload|SEARCH_(?:INDEX|TABLE)_CACHE|memoryCache/.test(source))failures.push(`${path}: forbidden JSON read or retained cache remains`);
}

if(failures.length){console.error('Current semantic authority guard failed:\\n'+failures.map(item=>`- ${item}`).join('\\n'));process.exit(1);}
console.log('Current semantic authority guard passed for the Neon canonical runtime.');
