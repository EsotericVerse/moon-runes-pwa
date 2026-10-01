import {readFileSync} from 'node:fs';

const failures=[];
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const surface=readFileSync('app/loc/surface-search.js','utf8');
const providers=readFileSync('app/loc/search-providers.js','utf8');

if(pkg.dependencies?.flexsearch!=='0.8.212')failures.push('FlexSearch 0.8.212 must be a Current dependency.');
for(const token of ["from 'flexsearch'","new Index(","cache:cacheSize","index.add(","index.search("]){
  if(!surface.includes(token))failures.push('Surface FlexSearch contract missing: '+token);
}
for(const forbidden of ['neonPublicClient','selectNeonRows','resolveScopeTables','silver.']){
  if(surface.includes(forbidden))failures.push('Surface FlexSearch must not own Neon/SSOT access: '+forbidden);
}
if(/flexsearch|createSurfaceSearch|new Index\(/i.test(providers)){
  failures.push('Global Search providers must remain Neon-first; FlexSearch is only for pre-scoped surface search.');
}
for(const token of ["count:'exact',head:true",".or(",".range("]){
  if(!providers.includes(token))failures.push('Global Search must retain direct Neon paging contract: '+token);
}

if(failures.length){
  console.error('[flexsearch-role] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[flexsearch-role] Neon SSOT + FlexSearch surface lexical/cache boundary verified.');
