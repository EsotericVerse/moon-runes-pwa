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
  for(const retired of ['modular-v2','scope-v2-','.v2.']){
    if(source.includes(retired))failures.push(file+': retired architecture marker must not return: '+retired);
  }
  if(/\b[A-Za-z][A-Za-z0-9]*V2\b/.test(source)){
    failures.push(file+': retired V2 identifier must not return');
  }
});


// Cover every .mjs dependency in the repository, not only the browser app.
// Node tooling and test entrypoints are included but are not browser bundles.
const mjsInventory={app:[],scripts:[],tests:[],root:[]};
let staticMjsEdges=0;
function auditMjs(path,group){
  if(!path.endsWith('.mjs'))return;
  mjsInventory[group].push(rel(path));
  const content=readFileSync(path,'utf8');
  // Match ESM declarations, not text inside assertions or source-code strings.
  // Dynamic import boundaries are checked separately against each capability.
  const declarations=/^\s*(?:import|export)\s+(?:\{[^}]*\}|[^\n;{}]*?)(?:\s+from\s+|\s*)['"](\.{1,2}\/[^'"]+)['"]/gm;
  for(const match of content.matchAll(declarations)){
    if(!resolves(path,match[1]))failures.push(rel(path)+': unresolved relative module '+match[1]);
    if(match[1].endsWith('.mjs'))staticMjsEdges+=1;
  }
}
for(const group of ['app','scripts','tests']){
  walk(resolve(root,group),path=>auditMjs(path,group));
}
for(const name of readdirSync(root)){
  if(name.endsWith('.mjs')&&statSync(resolve(root,name)).isFile())
    auditMjs(resolve(root,name),'root');
}
const mjsTotal=Object.values(mjsInventory).reduce((sum,files)=>sum+files.length,0);
if(mjsTotal===0)failures.push('No .mjs modules found; inventory cannot be verified');
console.log('[module-contracts] audited '+mjsTotal+' .mjs (app '+
  mjsInventory.app.length+', scripts '+mjsInventory.scripts.length+
  ', tests '+mjsInventory.tests.length+', root '+mjsInventory.root.length+
  '), static .mjs edges: '+staticMjsEdges);

for(const path of [
  'app/lrunes/RunesClient.jsx',
  'app/lrunes/RuneDrawClient.jsx',
  'app/loc/scope-data.js',
  'app/loc/galaxy-query.js',
  'app/loc/culture-query.js',
  'assets/lunarunes/cards/65.png',
  'assets/lunarunes/cards/66.png'
]){
  if(!existsSync(resolve(root,path)))failures.push('missing Current module/asset: '+path);
}

// The route imports GameBoard's default export. Exporting a helper instead
// silently renders only the Hero and prevents ALL gameplay data requests.
const gameBoardSource=readFileSync(resolve(root,'app/lrunes/game/GameBoard.jsx'),'utf8');
if(!/export\s+default\s+function\s+GameBoard\s*\(/.test(gameBoardSource))
  failures.push('LunaRunes game default export must be GameBoard, not GameHomeHero');

if(failures.length){
  console.error('[module-contracts] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[module-contracts] imports, single Scope data source, shared Galaxy pipeline and retired-column guards verified');
