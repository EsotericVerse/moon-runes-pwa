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
  'app/runes/RunesClient.jsx',
  'app/loc/data.js',
  'app/loc/data-paths.mjs',
  'app/api/loc/data/route.js',
  'app/api/context/route.js',
  'app/api/statistics/rankings/route.js',
  'app/loc/neon-repository.js',
  'assets/lunarunes/cards/65_玄.png',
  'assets/lunarunes/cards/66_命.png',
  'pics/LOC-structure.png'
]) if(!existsSync(resolve(root,path)))failures.push(`missing module contract file: ${path}`);

const runesClient=readFileSync(resolve(root,'app/runes/RunesClient.jsx'),'utf8');
for(const token of ['LOC_DATA.RUNES','data-draw-action="execute"','function executeDraw','function finishDraw'])if(!runesClient.includes(token))failures.push(`RunesClient: missing draw contract ${token}`);

const dataLoader=readFileSync(resolve(root,'app/loc/data.js'),'utf8');
for(const token of ['api/loc/data','fetchLocJson','fetchLocJsonBatch',"cache:'no-store'"])if(!dataLoader.includes(token))failures.push(`LOC data loader: missing Neon canonical contract ${token}`);
if(/indexedDB|getFreshLocalDataSegment|putLocalDataSegment|runtime_json_documents/.test(dataLoader))failures.push('LOC data loader: legacy local or projection path must not return');

if(!/silver\.lrunes_runes/.test(readFileSync(resolve(root,'app/api/loc/data/route.js'),'utf8')))failures.push('canonical route: rune table missing');
if(!/silver\.work_scope_affiliations/.test(readFileSync(resolve(root,'app/api/statistics/rankings/route.js'),'utf8')))failures.push('statistics route: scope link table missing');
if(!/z\.enum/.test(readFileSync(resolve(root,'app/loc/neon-repository.js'),'utf8')))failures.push('Neon repository: Zod allowlist missing');

const coreBatch=/fetchLocJsonBatch\(\[LOC_DATA\.RUNES,LOC_DATA\.LOTS,LOC_DATA\.RUNE_INTERPRETATIONS\]/.test(runesClient);
const directRunes=runesClient.includes('fetchLocJson(LOC_DATA.RUNES)');
if(!(coreBatch||directRunes))failures.push('RunesClient: canonical RUNES must load through the Neon-backed data loader');

if(failures.length){console.error('[module-contracts] failures:\\n'+failures.map(item=>`- ${item}`).join('\\n'));process.exit(1);}
console.log('[module-contracts] imports, canonical routes and Neon module contracts verified');
