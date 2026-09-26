import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';

const root=process.cwd();
const failures=[];

function walk(dir,callback){
  if(!existsSync(dir))return;
  for(const name of readdirSync(dir)){
    const path=join(dir,name);
    const stat=statSync(path);
    if(stat.isDirectory())walk(path,callback);else callback(path);
  }
}
function rel(path){return relative(root,path).replaceAll('\\','/');}
function resolves(fromFile,specifier){
  const base=resolve(dirname(fromFile),specifier);
  return [base,`${base}.js`,`${base}.jsx`,`${base}.mjs`,join(base,'index.js'),join(base,'index.jsx'),join(base,'index.mjs')].some(existsSync);
}

walk(resolve(root,'app'),path=>{
  if(!/\.(?:js|jsx|mjs)$/.test(path))return;
  const source=readFileSync(path,'utf8');
  const file=rel(path);
  if(/(?:from\s+|import\s*\(\s*)['"][^'"]*\/lib\//.test(source))failures.push(`${file}: retired lib/ import`);
  const pattern=/(?:from\s+|import\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
  for(const match of source.matchAll(pattern))if(!resolves(path,match[1]))failures.push(`${file}: unresolved relative import ${match[1]}`);
});

for(const path of [
  'app/lrunes/RunesClient.jsx',
  'app/loc/data.js',
  'app/loc/data-paths.mjs',
  'app/loc/neon-context-client.js',
  'app/loc/neon-culture-client.js',
  'app/loc/neon-ranking-client.js',
  'app/loc/neon-repository.js',
  'assets/lunarunes/cards/65_玄.png',
  'assets/lunarunes/cards/66_命.png',
  'pics/LOC-structure.png'
]) if(!existsSync(resolve(root,path)))failures.push(`missing module contract file: ${path}`);

const runesClient=readFileSync(resolve(root,'app/lrunes/RunesClient.jsx'),'utf8');
for(const token of ['LOC_DATA.RUNES','data-draw-action="execute"','function executeDraw','function finishDraw'])if(!runesClient.includes(token))failures.push(`RunesClient: missing draw contract ${token}`);

const dataLoader=readFileSync(resolve(root,'app/loc/data.js'),'utf8');
for(const token of ['selectNeonRows','fetchNeonData','fetchNeonDataBatch'])if(!dataLoader.includes(token))failures.push(`LOC data loader: missing direct Neon canonical contract ${token}`);
if(/indexedDB|getFreshLocalDataSegment|putLocalDataSegment|runtime_json_documents/.test(dataLoader))failures.push('LOC data loader: legacy local or projection path must not return');
if(/fetchLocJson|fetchLocDataSegments|manifestPaths|shards:\[\]/.test(dataLoader))failures.push('LOC data loader: retired JSON manifest/shard path must not return');

if(!/z\.enum/.test(readFileSync(resolve(root,'app/loc/neon-repository.js'),'utf8')))failures.push('Neon repository: Zod allowlist missing');
for(const [client,contract] of [
  ['app/loc/neon-context-client.js','ScopeContextResponseSchema'],
  ['app/loc/neon-culture-client.js','ScopeCultureResponseSchema'],
  ['app/loc/neon-ranking-client.js','ScopeRankingResponseSchema']
])if(!readFileSync(resolve(root,client),'utf8').includes(`${contract}.parse`))failures.push(`${client}: shared Zod feature contract not enforced`);

const searchClient=readFileSync(resolve(root,'app/loc/neon-search.js'),'utf8');
if(!/from ['"]flexsearch['"]/.test(searchClient)||!/new Index\(/.test(searchClient))failures.push('Search client: FlexSearch index missing');
if(!/searchNeonRows\(/.test(readFileSync(resolve(root,'app/modular-v2/features/SearchV2.jsx'),'utf8')))failures.push('Search view: FlexSearch-backed search contract missing');

const coreBatch=/fetchNeonDataBatch\(\[LOC_DATA\.RUNES,LOC_DATA\.LOTS,LOC_DATA\.RUNE_INTERPRETATIONS\]/.test(runesClient);
const directRunes=runesClient.includes('fetchNeonData(LOC_DATA.RUNES)');
if(!(coreBatch||directRunes))failures.push('RunesClient: canonical RUNES must load through the Neon-backed data loader');

if(failures.length){console.error('[module-contracts] failures:\\n'+failures.map(item=>`- ${item}`).join('\\n'));process.exit(1);}
console.log('[module-contracts] imports, canonical routes and Neon module contracts verified');
