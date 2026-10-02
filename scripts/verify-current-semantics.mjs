import fs from 'node:fs';

const failures=[];
const read=path=>fs.readFileSync(path,'utf8');
const required=[
  'app/loc/views/AboutView.jsx',
  'app/loc/neon-search.js',
  'app/modular-v2/features/SearchV2.jsx',
  'app/loc/model/daily-trend-engine.mjs',
  'app/loc/search-providers.js'
];
for(const path of required)if(!fs.existsSync(path)||!read(path).trim())failures.push('missing Current contract file: '+path);
if(!failures.length){
  const identity=read('app/loc/views/AboutView.jsx');
  for(const token of ['語言架構框架','Language Architecture Framework','符號式語言','Symbolic Language'])if(!identity.includes(token))failures.push('identity missing '+token);
  const daily=read('app/loc/model/daily-trend-engine.mjs');
  for(const token of ['summarizeDailyRange','dailyPresetRange'])if(!daily.includes(token))failures.push('daily trend missing '+token);
  const providers=read('app/loc/search-providers.js');
  for(const token of ["count:'exact',head:true",".or(",".range("])if(!providers.includes(token))failures.push('Search provider missing '+token);
  if(/flexsearch|new Index\(/i.test(providers))failures.push('Global Search must remain Neon-first.');
  const search=read('app/loc/neon-search.js');
  for(const token of ['getSearchProviders','getMediaSearchProviders','provider.search'])if(!search.includes(token))failures.push('Search orchestration missing '+token);
}
if(failures.length){
  console.error('[current-semantics] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[current-semantics] Current identity, daily trend and Neon-first Search contracts verified');
