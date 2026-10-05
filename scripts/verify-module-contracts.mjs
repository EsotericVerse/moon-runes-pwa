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

for(const path of ['docs/NAV_GOVERNANCE.md','docs/DOMAIN_ARCHITECTURE.md']){
  const source=readFileSync(resolve(root,path),'utf8');
  for(const retired of ['modular-v2','ScopeNavV2','scope-registry.v2','GlobalNav.jsx']){
    if(source.includes(retired))failures.push(path+': retired architecture authority must not return: '+retired);
  }
}

for(const path of [
  'app/lrunes/RunesClient.jsx',
  'app/lrunes/RuneDrawClient.jsx',
  'app/loc/scope-data.js',
  'app/loc/galaxy-query.js',
  'app/loc/culture-query.js',
  'assets/lunarunes/cards/65_玄.png',
  'assets/lunarunes/cards/66_命.png'
]){
  if(!existsSync(resolve(root,path)))failures.push('missing Current module/asset: '+path);
}

for(const path of [
  'app/QueryProvider.jsx',
  'app/AppExperience.jsx',
  'app/modular/ScopeNav.jsx',
  'app/modular/ScopeFooter.jsx',
  'app/modular/ThemeSelect.jsx',
  'app/modular/FeaturePage.jsx',
  'app/modular/ContentEditor.jsx',
  'app/modular/WorkFullText.jsx',
  'app/modular/WorkSummaryCard.jsx',
  'app/modular/IncrementalList.jsx',
  'app/loc/scope-table-mapping.js',
  'app/loc/aggregate-query.js',
  'app/loc/search-providers.js',
]){
  if(existsSync(resolve(root,path)))failures.push('retired data-layer module still present: '+path);
}

if(failures.length){
  console.error('[module-contracts] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[module-contracts] imports, single Scope data source, shared Galaxy pipeline and retired-column guards verified');
