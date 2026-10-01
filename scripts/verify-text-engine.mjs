import {readFileSync} from 'node:fs';

const failures=[];
const providers=readFileSync('app/loc/search-providers.js','utf8');
const search=readFileSync('app/loc/neon-search.js','utf8');

for(const token of ["count:'exact',head:true",".or(",".range(","outputColumns.join(',')"]){
  if(!providers.includes(token))failures.push('Global Search provider missing direct Neon query contract: '+token);
}
if(!search.includes('provider.search'))failures.push('Search orchestration no longer calls provider.search');
if(/flexsearch|createSurfaceSearch|new Index\(/i.test(providers))failures.push('Global Search providers must not turn FlexSearch into corpus authority');

if(failures.length){
  console.error('[search-query-contract] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[search-query-contract] Global Search remains Neon-first; local surface search is a separate layer.');
