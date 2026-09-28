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
  if(['LOC_DATA','fetchNeonData(','fetchNeonDataBatch(','canonical/runes'].some(token=>source.includes(token)))failures.push(`${file}: retired path-loader contract returned`);
  const pattern=/(?:from\s+|import\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
  for(const match of source.matchAll(pattern))if(!resolves(path,match[1]))failures.push(`${file}: unresolved relative import ${match[1]}`);
});

for(const path of [
  'app/lrunes/RunesClient.jsx',
  'app/loc/rune-repository.js',
  'app/loc/model/rune-graph-core.js',
  'app/loc/neon-culture-client.js',
  'app/loc/neon-ranking-client.js',
  'app/loc/neon-repository.js',
  'app/loc/text-engine.mjs',
  'assets/lunarunes/cards/65_玄.png',
  'assets/lunarunes/cards/66_命.png',
  'pics/LOC-structure.png'
]) if(!existsSync(resolve(root,path)))failures.push(`missing module contract file: ${path}`);

const runesClient=readFileSync(resolve(root,'app/lrunes/RunesClient.jsx'),'utf8');
for(const token of ['selectRuneCatalog','data-draw-action="execute"','function executeDraw','function finishDraw'])if(!runesClient.includes(token))failures.push(`RunesClient: missing draw contract ${token}`);

const cultureView=readFileSync(resolve(root,'app/modular-v2/features/CultureV2.jsx'),'utf8');
const cultureTimeline=readFileSync(resolve(root,'app/modular-v2/modules/culture-timeline/CultureTimelineV2.jsx'),'utf8');
const governanceManagement=readFileSync(resolve(root,'app/loc/GovernanceManagement.jsx'),'utf8');
for(const token of ["isLoc?<CultureTimelineV2","mode='current'","scope-v2-culture-period-2d","選擇完整時期"]){
  if(!cultureView.includes(token))failures.push(`Culture Current contract missing: ${token}`);
}
for(const retired of ["時期比例變化","只比較完整時期內各分類所占比例"]){
  if(cultureView.includes(retired))failures.push(`Culture retired suggestion returned: ${retired}`);
}
if(cultureTimeline.includes("個人時期 · {personalTitle}")||cultureTimeline.includes("LunaRunes · {runeTitle}")){
  failures.push('LOC Culture: Current confluence must not unfold per-scope period lists');
}
for(const token of ["const intersectionStart=Math.max(personalStartTime,runeStartTime)","const domainStart=intersectionStart","Current × Current 交會集合"]){
  if(!cultureTimeline.includes(token))failures.push(`LOC Culture: Current intersection contract missing ${token}`);
}
for(const retired of ["Math.min(runeStartTime,personalStartTime,...validTimes)","personal.map((row,index)=>marker","runes.map((row,index)=>marker"]){
  if(cultureTimeline.includes(retired))failures.push(`LOC Culture: historical/global Current river regression returned ${retired}`);
}
if(!governanceManagement.includes("scopeId!=='loc'?<CultureTimelineEditor")){
  failures.push('LOC Culture: Period settings must not run for LOC');
}

const aggregateQuery=readFileSync(resolve(root,'app/loc/aggregate-query.js'),'utf8');
if(!aggregateQuery.includes("columns:'uid,source_name,createtime,title'")){
  failures.push('aggregate-query: Galaxy list must use lightweight paged fields');
}
if(/columns:['"][^'"]*content[^'"]*(?:url|media_link)|columns:['"][^'"]*(?:url|media_link)[^'"]*content/.test(aggregateQuery)){
  failures.push('aggregate-query: ordinary Galaxy list must not bulk-select content/url/media_link');
}
if(/galaxy_preview|content_preview/.test(aggregateQuery))failures.push('aggregate-query: stored preview dependency returned');

const runeRepository=readFileSync(resolve(root,'app/loc/rune-repository.js'),'utf8');
for(const token of ['selectNeonCatalog','silver.runes','selectRuneCatalog','selectRuneKeywordCatalog','updateRuneKeywords'])if(!runeRepository.includes(token))failures.push(`Rune repository: missing canonical contract ${token}`);
for(const retired of ['app/loc/data.js','app/loc/data-paths.mjs','app/loc/neon-context-client.js','app/modular-v2/features/ContextV2.jsx','app/modular-v2/features/ContextWorkbenchV2.jsx','app/modular-v2/modules/context-graph/ContextGraphV2.jsx'])if(existsSync(resolve(root,retired)))failures.push(`retired path-loader returned: ${retired}`);
if(['LOC_DATA','canonical/runes','fetchNeonData','runtime_json_documents','fetchLocJson','fetchLocDataSegments'].some(token=>runeRepository.includes(token)))failures.push('Rune repository: legacy path/JSON loader semantics returned');

if(!/z\.enum/.test(readFileSync(resolve(root,'app/loc/neon-repository.js'),'utf8')))failures.push('Neon repository: Zod allowlist missing');
for(const [client,contract] of [
  ['app/loc/neon-culture-client.js','ScopeCultureResponseSchema'],
  ['app/loc/neon-ranking-client.js','ScopeRankingResponseSchema']
])if(!readFileSync(resolve(root,client),'utf8').includes(`${contract}.parse`))failures.push(`${client}: shared Zod feature contract not enforced`);

const textEngine=readFileSync(resolve(root,'app/loc/text-engine.mjs'),'utf8');
const searchProviders=readFileSync(resolve(root,'app/loc/search-providers.js'),'utf8');
const keywordClassifier=readFileSync(resolve(root,'app/loc/keyword-classifier.js'),'utf8');
if(!/from ['"]flexsearch['"]/.test(textEngine)||!/Charset\.CJK/.test(textEngine)||!/new Resolver/.test(textEngine))failures.push('Text engine: FlexSearch CJK/Resolver contract missing');
if(!/getRuntimeTextIndex/.test(searchProviders)||!/searchTextIndex/.test(searchProviders))failures.push('Search client: shared FlexSearch contract missing');
if(!/searchTextIndex/.test(keywordClassifier))failures.push('Culture/Statistics keyword classifier: shared FlexSearch contract missing');
if(!/searchNeonRows\(/.test(readFileSync(resolve(root,'app/modular-v2/features/SearchV2.jsx'),'utf8')))failures.push('Search view: shared text search contract missing');

if(!runesClient.includes('selectRuneCatalog()'))failures.push('RunesClient: canonical runes must load through the domain rune repository');

if(failures.length){console.error('[module-contracts] failures:\\n'+failures.map(item=>`- ${item}`).join('\\n'));process.exit(1);}
console.log('[module-contracts] imports, canonical routes and Neon module contracts verified');
