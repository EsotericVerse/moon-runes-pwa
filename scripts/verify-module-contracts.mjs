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
function rel(path){return relative(root,path).replaceAll('\\\\','/');}
function resolves(fromFile,specifier){
  const base=resolve(dirname(fromFile),specifier);
  return [base,base+'.js',base+'.jsx',base+'.mjs',join(base,'index.js'),join(base,'index.jsx'),join(base,'index.mjs')].some(existsSync);
}

walk(resolve(root,'app'),path=>{
  if(!/\.(?:js|jsx|mjs)$/.test(path))return;
  const source=readFileSync(path,'utf8');
  const file=rel(path);
  const imports=/(?:from\s+|import\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
  for(const match of source.matchAll(imports)){
    if(!resolves(path,match[1]))failures.push(file+': unresolved relative import '+match[1]);
  }
  if(/silver\.(?:lo3rwang|lrunes)_(?:galaxy(?:_media)?|time)\b/.test(source)){
    failures.push(file+': Scope Galaxy/Time table must resolve through silver.manage');
  }
  if(/\bwork_count\b/.test(source)){
    failures.push(file+': stored work_count is outside the Current live aggregate contract');
  }
});

for(const path of [
  'app/lrunes/RunesClient.jsx',
  'app/lrunes/RuneDrawClient.jsx',
  'app/loc/neon-culture-client.js',
  'app/loc/neon-statistics-client.js',
  'assets/lunarunes/cards/65_玄.png',
  'assets/lunarunes/cards/66_命.png'
]){
  if(!existsSync(resolve(root,path)))failures.push('missing Current module/asset: '+path);
}

if(failures.length){
  console.error('[module-contracts] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[module-contracts] imports, Scope table ownership and retired-column guards verified');
