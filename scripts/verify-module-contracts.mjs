import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

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
  return [base,`${base}.js`,`${base}.jsx`,`${base}.mjs`,`${base}.json`,join(base,'index.js'),join(base,'index.jsx'),join(base,'index.mjs')].some(existsSync);
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
  'app/loc/data-paths.mjs',
  'data/json/core/runes.json',
  'data/json/core/lots.json',
  'assets/lunarunes/cards/65_玄.png',
  'assets/lunarunes/cards/66_命.png',
  'pics/LOC-structure.png'
]) if(!existsSync(resolve(root,path)))failures.push(`missing module contract file: ${path}`);

const runesClient=readFileSync(resolve(root,'app/runes/RunesClient.jsx'),'utf8');
for(const token of ['LOC_DATA.RUNES','data-draw-action="execute"','function executeDraw','function finishDraw'])if(!runesClient.includes(token))failures.push(`RunesClient: missing draw contract ${token}`);
const runeLoadIndex=runesClient.indexOf('fetchLocJson(LOC_DATA.RUNES)');
const lotsLoadIndex=runesClient.indexOf('fetchLocJson(LOC_DATA.LOTS)');
if(runeLoadIndex<0)failures.push('RunesClient: canonical RUNES must load directly from local Next data path');
if(lotsLoadIndex<0)failures.push('RunesClient: local LOTS load contract missing');
if(runeLoadIndex>=0&&lotsLoadIndex>=0&&runeLoadIndex>lotsLoadIndex)failures.push('RunesClient: RUNES must unblock draw before LOTS companion data loads');
if(/fetchLocJsonBatch\(\[LOC_DATA\.RUNES,LOC_DATA\.LOTS\]/.test(runesClient))failures.push('RunesClient: RUNES must not wait on LOTS batch loading');

if(failures.length){console.error('[module-contracts] failures:\n'+failures.map(item=>`- ${item}`).join('\n'));process.exit(1);}
console.log('[module-contracts] imports, critical routes and LunaRunes draw contracts verified');
