import {readFileSync,existsSync} from 'node:fs';

const failures=[];
const providers=readFileSync('app/loc/search-providers.js','utf8');
const search=readFileSync('app/loc/neon-search.js','utf8');

for(const token of ["count:'exact',head:true",".or(",".range(","outputColumns.join(',')"]){
  if(!providers.includes(token))failures.push('Search provider missing direct Neon query contract: '+token);
}
for(const forbidden of ['createTextIndex','searchTextIndex','literalTextMatches',"from './text-engine.mjs'"]){
  if(providers.includes(forbidden))failures.push('Search provider still uses client text engine: '+forbidden);
}
if(!search.includes('provider.search'))failures.push('Search orchestration no longer calls provider.search');
if(existsSync('app/loc/text-engine.mjs'))failures.push('Retired app/loc/text-engine.mjs returned');
if(existsSync('app/loc/keyword-classifier.js'))failures.push('Retired app/loc/keyword-classifier.js returned');

if(failures.length){
  console.error('[search-query-contract] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[search-query-contract] Neon direct literal query + count/offset verified.');
