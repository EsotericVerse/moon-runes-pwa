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
  for(const match of source.matchAll(imports))if(!resolves(path,match[1]))failures.push(file+': unresolved relative import '+match[1]);
  if(/silver\.(?:lo3rwang|lrunes)_(?:galaxy(?:_media)?|time)\b/.test(source))failures.push(file+': Scope Galaxy/Time table must resolve through silver.manage');
  if(/\bwork_count\b/.test(source))failures.push(file+': stored work_count is outside the Current live aggregate contract');
});

for(const path of ['app/lrunes/RunesClient.jsx','app/loc/model/rune-graph-core.js','app/loc/neon-culture-client.js','app/loc/neon-statistics-client.js','assets/lunarunes/cards/65_玄.png','assets/lunarunes/cards/66_命.png']){
  if(!existsSync(resolve(root,path)))failures.push('missing Current module contract file: '+path);
}

const runesClient=readFileSync(resolve(root,'app/lrunes/RunesClient.jsx'),'utf8');
for(const token of ['data-draw-action="execute"','function executeDraw','function finishDraw'])if(!runesClient.includes(token))failures.push('RunesClient missing '+token);

const cultureView=readFileSync(resolve(root,'app/modular-v2/features/CultureV2.jsx'),'utf8');
const uiCopy=readFileSync(resolve(root,'app/i18n/ui-copy.js'),'utf8');
const cultureClient=readFileSync(resolve(root,'app/loc/neon-culture-client.js'),'utf8');
const governanceManagement=readFileSync(resolve(root,'app/loc/GovernanceManagement.jsx'),'utf8');
for(const token of ['時期・事件・定錨點','作品分類河道','該時期總作品數','first_date','last_date']){
  if(!cultureView.includes(token)&&!uiCopy.includes(token)&&!cultureClient.includes(token))failures.push('Culture contract missing '+token);
}
for(const token of ['交會時期的總文章數','fixedMin={locDistributionStart}','fixedMax={locDistributionEnd}'])if(!cultureView.includes(token))failures.push('LOC Culture missing '+token);
for(const token of ["const intersectionStart=starts.at(-1)||''",'intersectionScopeIds','buildLocScopeDistribution'])if(!cultureClient.includes(token))failures.push('Culture intersection missing '+token);
if(!governanceManagement.includes('function PeriodSettings({scopeId})')||!governanceManagement.includes("if(scopeId==='loc')return null;"))failures.push('Period settings must remain Scope-only');

const aggregate=readFileSync(resolve(root,'app/loc/aggregate-query.js'),'utf8');
const contentPolicy=readFileSync(resolve(root,'app/loc/content-policy.js'),'utf8');
if(!/column:'content',operator:'neq',value:''/.test(contentPolicy))failures.push('blank Galaxy content guard missing');
if(!aggregate.includes("columns:'uid,source_name,createtime,title,url,source_id,target_id,media_link'"))failures.push('paged Galaxy index must use the Current lightweight field set');
if(!aggregate.includes("columns:'uid,content'"))failures.push('Galaxy full text must load through the Current per-record content query');
if(!/selectGalaxyPage[\s\S]*limit[\s\S]*offset/.test(aggregate))failures.push('Galaxy page query must use limit/offset');

const providers=readFileSync(resolve(root,'app/loc/search-providers.js'),'utf8');
for(const token of ["count:'exact',head:true",".or(",".range("])if(!providers.includes(token))failures.push('Search direct query contract missing '+token);

const scopeManagement=governanceManagement;
const adminManagement=readFileSync(resolve(root,'app/loc/views/AdminHomeView.jsx'),'utf8');
if(!scopeManagement.includes('useNeonAccount')||!scopeManagement.includes('canManageScopeSync'))failures.push('Scope management role gate missing');
if(!adminManagement.includes('useNeonAccount')||!adminManagement.includes('canManageGlobalSync'))failures.push('Admin management role gate missing');

for(const [client,contract] of [['app/loc/neon-culture-client.js','ScopeCultureResponseSchema'],['app/loc/neon-statistics-client.js','ScopeRankingResponseSchema']]){
  if(!readFileSync(resolve(root,client),'utf8').includes(contract+'.parse'))failures.push(client+': shared feature schema not enforced');
}

const loading=readFileSync(resolve(root,'app/loc/list-loading-contract.mjs'),'utf8');
const incremental=readFileSync(resolve(root,'app/modular-v2/IncrementalLoadV2.jsx'),'utf8');
if(!/DEFAULT_LIST_BATCH_SIZE=10/.test(loading)||!/RUNE_LIST_BATCH_SIZE=16/.test(loading))failures.push('list loading contract must remain 10 general / 16 rune');
if(!/WHEEL_GESTURE_GAP_MS/.test(incremental)||!/readyAtRef\.current=now\+/.test(incremental))failures.push('incremental loading gesture contract missing');
if(!/Number\.isFinite\(cursorGalaxyOffset\)/.test(cultureClient)||!/Number\.isFinite\(cursorMediaOffset\)/.test(cultureClient)||!/const baseOffset=/.test(cultureClient))failures.push('Culture merged cursor/base-offset contract missing');
for(const token of ["selectNeonRows('silver.runes'","selectNeonRows('silver.runes_etc'"])if(!runesClient.includes(token))failures.push('Rune canonical query missing '+token);

if(failures.length){
  console.error('[module-contracts] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[module-contracts] Current imports, feature composition, paging and Neon client contracts verified');
