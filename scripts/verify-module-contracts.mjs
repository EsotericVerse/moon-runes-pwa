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
  'app/loc/model/rune-graph-core.js',
  'app/loc/neon-culture-client.js',
  'app/loc/neon-ranking-client.js',
  'assets/lunarunes/cards/65_玄.png',
  'assets/lunarunes/cards/66_命.png',
]) if(!existsSync(resolve(root,path)))failures.push(`missing module contract file: ${path}`);

const runesClient=readFileSync(resolve(root,'app/lrunes/RunesClient.jsx'),'utf8');
for(const token of ['data-draw-action="execute"','function executeDraw','function finishDraw'])if(!runesClient.includes(token))failures.push(`RunesClient: missing draw contract ${token}`);

const cultureView=readFileSync(resolve(root,'app/modular-v2/features/CultureV2.jsx'),'utf8');
const cultureTimeline=readFileSync(resolve(root,'app/modular-v2/modules/culture-timeline/CultureTimelineV2.jsx'),'utf8');
const governanceManagement=readFileSync(resolve(root,'app/loc/GovernanceManagement.jsx'),'utf8');
for(const token of ["{isLoc?<>","mode='current'","<option value='works'>時期分割作品</option>","<option value='anchor'>定錨點</option>","culture-period-work-timeline"]){
  if(!cultureView.includes(token))failures.push(`Culture Current contract missing: ${token}`);
}
if(/scope-v2-culture-period-2d|選擇完整時期|activeWorkPeriod|setActiveWorkPeriod/.test(cultureView)){
  failures.push('Culture: retired manual Period selector returned');
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

for(const retired of ['app/loc/data.js','app/loc/data-paths.mjs','app/loc/neon-context-client.js','app/loc/rune-repository.js','app/lrunes/rune-draw-engine.js','app/modular-v2/features/ContextV2.jsx','app/modular-v2/features/ContextWorkbenchV2.jsx','app/modular-v2/modules/context-graph/ContextGraphV2.jsx','app/modular-v2/features/KeywordSettingsV2.jsx','app/modular-v2/features/RuneKeywordSettingsV2.jsx'])if(existsSync(resolve(root,retired)))failures.push(`retired path returned: ${retired}`);
if(/(?:import|<)\s*KeywordSettingsV2\b|RuneKeywordSettingsV2\b/.test(governanceManagement))failures.push('LunaRunes management must not edit canonical rune keywords or use them as a style fallback');

for(const [client,contract] of [
  ['app/loc/neon-culture-client.js','ScopeCultureResponseSchema'],
  ['app/loc/neon-ranking-client.js','ScopeRankingResponseSchema']
])if(!readFileSync(resolve(root,client),'utf8').includes(`${contract}.parse`))failures.push(`${client}: shared Zod feature contract not enforced`);

const listLoadingContract=readFileSync(resolve(root,'app/loc/list-loading-contract.mjs'),'utf8');
const incrementalLoader=readFileSync(resolve(root,'app/modular-v2/IncrementalLoadV2.jsx'),'utf8');
const searchProviders=readFileSync(resolve(root,'app/loc/search-providers.js'),'utf8');
if(!/DEFAULT_LIST_BATCH_SIZE=20/.test(listLoadingContract)||!/RUNE_LIST_BATCH_SIZE=16/.test(listLoadingContract))failures.push('List loading: Current batch contract must remain 20 general / 16 rune');
if((searchProviders.match(/batchSize:RUNE_LIST_BATCH_SIZE/g)||[]).length<5)failures.push('Search client: all LunaRunes providers must use the 16-row rune page size');
if(!/WHEEL_GESTURE_GAP_MS/.test(incrementalLoader)||!/readyAtRef\.current=now\+/.test(incrementalLoader)||/busyRef/.test(incrementalLoader))failures.push('Incremental loader: one-user-gesture / immediate-cooldown contract missing');
if(!/requireGalaxyContent/.test(contentPolicy))failures.push('Galaxy content policy: shared nonblank write guard missing');
for(const token of ["count:'exact',head:true",".or(",".range("])if(!searchProviders.includes(token))failures.push('Search client: direct Neon literal-query contract missing '+token);
for(const forbidden of ['createTextIndex','searchTextIndex','literalTextMatches'])if(searchProviders.includes(forbidden))failures.push('Search client: retired client text engine returned '+forbidden);
if(existsSync(resolve(root,'app/loc/text-engine.mjs')))failures.push('Retired app/loc/text-engine.mjs returned');
if(existsSync(resolve(root,'app/loc/keyword-classifier.js')))failures.push('Retired app/loc/keyword-classifier.js returned');
if(existsSync(resolve(root,'app/loc/style-classifier.js')))failures.push('Retired duplicate style-classifier.js returned');
if(!/searchNeonRows\(/.test(readFileSync(resolve(root,'app/modular-v2/features/SearchV2.jsx'),'utf8')))failures.push('Search view: shared text search contract missing');
const cultureClientSource=readFileSync(resolve(root,'app/loc/neon-culture-client.js'),'utf8');
if(!/selectNeonRows\(/.test(cultureClientSource)||!/filters/.test(cultureClientSource))failures.push('Culture: precise Neon filter query boundary missing');
const mediaWorksSource=(cultureClientSource.split('export async function selectScopeMediaWorks')[1]||'');
if(!/selectNeonRows\(/.test(mediaWorksSource)||/const rows=await selectScopeMediaRows/.test(mediaWorksSource))failures.push('Culture media works: detail list must page Neon directly instead of full-read then slice');

for(const token of ["selectNeonRows('silver.runes'","selectNeonRows('silver.runes_etc'"])if(!runesClient.includes(token))failures.push('RunesClient: direct canonical Neon rune query missing '+token);
if(runesClient.includes('rune-repository'))failures.push('RunesClient: retired rune repository returned');

if(failures.length){console.error('[module-contracts] failures:\\n'+failures.map(item=>`- ${item}`).join('\\n'));process.exit(1);}
console.log('[module-contracts] imports, canonical routes and Neon client contracts verified');

