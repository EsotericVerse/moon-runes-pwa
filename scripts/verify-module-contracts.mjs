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
  'app/loc/text-engine.mjs',
  'app/loc/spool-client.js',
  'assets/lunarunes/cards/65_玄.png',
  'assets/lunarunes/cards/66_命.png',
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
if(!governanceManagement.includes("function PeriodSettings({scopeId})")||!governanceManagement.includes("if(scopeId==='loc')return null;")){
  failures.push('LOC Culture: Period settings must remain Scope-only and must not run for LOC');
}

const aggregateQuery=readFileSync(resolve(root,'app/loc/aggregate-query.js'),'utf8');
const contentPolicy=readFileSync(resolve(root,'app/loc/content-policy.js'),'utf8');
if(!/column:'content',operator:'neq',value:''/.test(contentPolicy))failures.push('content-policy: blank Galaxy content must remain invalid');
const sharedDisplayModel=readFileSync(resolve(root,'app/modular-v2/work-display-model.v2.js'),'utf8');
const searchViewModel=readFileSync(resolve(root,'app/modular-v2/features/SearchV2.jsx'),'utf8');
if(!/workDisplayHeading/.test(sharedDisplayModel)||!/workDisplayHeading/.test(searchViewModel)||!/workDisplayHeading/.test(cultureView))failures.push('Work display heading must remain shared across Search and Culture');
if(!aggregateQuery.includes("columns:'uid,source_name,createtime,title,content'")){
  failures.push('aggregate-query: paged Galaxy rows must carry content for title fallback');
}
if(!/selectGalaxyPage[\s\S]*limit[\s\S]*offset/.test(aggregateQuery)){
  failures.push('aggregate-query: Galaxy content fallback must remain inside the paged query');
}
if(/columns:['"][^'"]*content[^'"]*(?:url|media_link)|columns:['"][^'"]*(?:url|media_link)[^'"]*content/.test(aggregateQuery)){
  failures.push('aggregate-query: paged Galaxy rows must not bulk-select content together with url/media_link');
}
if(/galaxy_preview|content_preview/.test(aggregateQuery))failures.push('aggregate-query: stored preview dependency returned');

const runeRepository=readFileSync(resolve(root,'app/loc/rune-repository.js'),'utf8');
for(const token of ['neonPublicClient','selectRuneCatalog','selectRuneKeywordCatalog'])if(!runeRepository.includes(token))failures.push(`Rune repository: missing canonical contract ${token}`);
for(const retired of ['app/loc/data.js','app/loc/data-paths.mjs','app/loc/neon-context-client.js','app/modular-v2/features/ContextV2.jsx','app/modular-v2/features/ContextWorkbenchV2.jsx','app/modular-v2/modules/context-graph/ContextGraphV2.jsx'])if(existsSync(resolve(root,retired)))failures.push(`retired path-loader returned: ${retired}`);
if(['LOC_DATA','canonical/runes','fetchNeonData','runtime_json_documents','fetchLocJson','fetchLocDataSegments'].some(token=>runeRepository.includes(token)))failures.push('Rune repository: legacy path/JSON loader semantics returned');

for(const [client,contract] of [
  ['app/loc/neon-culture-client.js','ScopeCultureResponseSchema'],
  ['app/loc/neon-ranking-client.js','ScopeRankingResponseSchema']
])if(!readFileSync(resolve(root,client),'utf8').includes(`${contract}.parse`))failures.push(`${client}: shared Zod feature contract not enforced`);

const listLoadingContract=readFileSync(resolve(root,'app/loc/list-loading-contract.mjs'),'utf8');
const incrementalLoader=readFileSync(resolve(root,'app/modular-v2/IncrementalLoadV2.jsx'),'utf8');
const textEngine=readFileSync(resolve(root,'app/loc/text-engine.mjs'),'utf8');
const searchProviders=readFileSync(resolve(root,'app/loc/search-providers.js'),'utf8');
const keywordClassifier=readFileSync(resolve(root,'app/loc/keyword-classifier.js'),'utf8');
if(!/DEFAULT_LIST_BATCH_SIZE=20/.test(listLoadingContract)||!/RUNE_LIST_BATCH_SIZE=16/.test(listLoadingContract))failures.push('List loading: Current batch contract must remain 20 general / 16 rune');
if((searchProviders.match(/batchSize:RUNE_LIST_BATCH_SIZE/g)||[]).length<5)failures.push('Search client: all LunaRunes providers must use the 16-row rune batch');
if(!/WHEEL_GESTURE_GAP_MS/.test(incrementalLoader)||!/readyAtRef\.current=now\+/.test(incrementalLoader)||/busyRef/.test(incrementalLoader))failures.push('Incremental loader: one-user-gesture / immediate-cooldown contract missing');
if(!/requireGalaxyContent/.test(contentPolicy))failures.push('Galaxy content policy: shared nonblank write guard missing');
if(!/from ['"]flexsearch['"]/.test(textEngine)||!/Charset\.CJK/.test(textEngine)||!/new Resolver/.test(textEngine))failures.push('Text engine: FlexSearch CJK/Resolver contract missing');
if(/records\s*=\s*new Map|records\.set|engine\.records/.test(textEngine))failures.push('Text engine: FlexSearch may retain IDs only; record payload storage is forbidden');
if(!/const ids=new Set\(\)/.test(textEngine))failures.push('Text engine: ID-only transient index contract missing');
if(!/createTextIndex/.test(searchProviders)||!/searchTextIndex/.test(searchProviders)||!/nextCursor|cursor=/.test(searchProviders))failures.push('Search client: batched FlexSearch contract missing');
if(/engine\.add\([^\n]*recordFor/.test(searchProviders))failures.push('Search client: FlexSearch index must not retain record payloads');
const spoolClient=readFileSync(resolve(root,'app/loc/spool-client.js'),'utf8');
for(const token of ['MAX_SPOOL_IDS=10000','SPOOL_BATCH_SIZE=500','writeSpoolIds','clearSpool','withSpoolIds','neonAuthClient'])if(!spoolClient.includes(token))failures.push(`Spool contract missing: ${token}`);
if(/\b(content|title|url|meta_tags|source_name)\b/.test(spoolClient))failures.push('Spool client: content/media payload fields are forbidden');
if(/neonPublicClient/.test(spoolClient))failures.push('Spool client: anonymous/public client access is forbidden');
if(/getRuntimeTextIndex/.test(searchProviders))failures.push('Search client: runtime index cache must not return to batched providers');
if(/scanSize|maxScanSize|while\(matched\.length/.test(searchProviders))failures.push('Search client: provider must fetch exactly one raw batch per user trigger');
if(!/searchTextIndex/.test(keywordClassifier))failures.push('Culture/Statistics keyword classifier: shared FlexSearch contract missing');
if(!/searchNeonRows\(/.test(readFileSync(resolve(root,'app/modular-v2/features/SearchV2.jsx'),'utf8')))failures.push('Search view: shared text search contract missing');
const cultureClientSource=readFileSync(resolve(root,'app/loc/neon-culture-client.js'),'utf8');
const mediaWorksSource=(cultureClientSource.split('export async function selectScopeMediaWorks')[1]||'');
if(!/selectNeonRows\(/.test(mediaWorksSource)||/const rows=await selectScopeMediaRows/.test(mediaWorksSource))failures.push('Culture media works: detail list must page Neon directly instead of full-read then slice');

if(!runesClient.includes('selectRuneCatalog()'))failures.push('RunesClient: canonical runes must load through the domain rune repository');

if(failures.length){console.error('[module-contracts] failures:\\n'+failures.map(item=>`- ${item}`).join('\\n'));process.exit(1);}
console.log('[module-contracts] imports, canonical routes and Neon client contracts verified');
