import fs from 'node:fs';

const failures=[];
const read=path=>fs.readFileSync(path,'utf8');
const required=[
  'app/loc/views/AboutView.jsx',
  'app/loc/galaxy-query.js',
  'app/modular/features/Search.jsx',
  'app/loc/daily-runes.js',
  'app/daily/log/DailyLogClient.jsx',
  'app/lrunes/DailyRuneCalendar.jsx',
  'app/loc/scope-data.js',
  'scripts/verify-db-public-read.mjs',
  'governance/runtime-capabilities.json',
  'app/loc/rune66-keyword-analysis.js',
  'app/loc/model/rune66-keyword-engine.mjs',
  'app/loc/KeywordLibraryPanel.jsx',
  'app/modular/features/Statistics.jsx',
  'app/modular/features/Culture.jsx',
  'app/loc/db-source-status.mjs',
  'app/loc/providers/neon-public.mjs',
  'app/loc/db-query.mjs',
  'app/modular/feature-data-state.js',
  'app/AppShell.jsx',
  'app/loc/query-contract.mjs',
  'app/loc/ScopeGroupOverview.jsx',
  'app/loc/culture-query.js'
];
for(const path of required)if(!fs.existsSync(path)||!read(path).trim())failures.push('missing Current contract file: '+path);
if(!failures.length){
  const identity=read('app/loc/views/AboutView.jsx');
  const runeIntro=read('app/lrunes/RuneIntroSection.jsx');
  for(const token of ['語言架構框架','Language Architecture Framework','符號式語言'])if(!identity.includes(token))failures.push('identity missing '+token);
  if(!runeIntro.includes('Symbolic Language'))failures.push('Rune intro identity missing Symbolic Language');
  const dailyData=read('app/loc/daily-runes.js');
  for(const token of ['selectPreviousDailyRuneOccurrence','selectDailyRuneSituation','selectDailyRuneContext',"types:['sit_q','daily_r','daily_g','daily_b']","column:'current_moon'"])if(!dailyData.includes(token))failures.push('daily rune context missing '+token);
  const dailyLog=read('app/daily/log/DailyLogClient.jsx');
  for(const token of ['每日占卜提醒','每日占卜引導','每日占卜祝福','上次抽到','之前的狀況','當日真實月相'])if(!dailyLog.includes(token))failures.push('daily calendar context missing '+token);
  for(const token of ['當日狀況','前次紀錄','RuneCardInfo','runeImage','home-rune-layout','home-rune-copy home-rune-copy-plain','home-draw-bubbles','loc-bubble'])if(!dailyLog.includes(token))failures.push('daily calendar must reuse single/daily Rune presentation: '+token);
  const dailyCalendar=read('app/lrunes/DailyRuneCalendar.jsx');
  for(const token of ['realMoonPhase','phaseMarkers',"current+'開始'","current+'結束'"])if(!dailyCalendar.includes(token))failures.push('daily calendar moon markers missing '+token);
  const runeHome=read('app/lrunes/RunesClient.jsx');
  const runeDrawModes=read('app/lrunes/rune-draw-modes.mjs');
  const runeDrawModeBubbles=read('app/lrunes/RuneDrawModeBubbles.jsx');
  const runeSingleDaily=read('app/lrunes/RuneSingleDailySurface.jsx');
  const runeDrawClient=read('app/lrunes/RuneDrawClient.jsx');
  const runeDirectory=read('app/lrunes/RuneDirectoryPages.jsx');
  for(const token of ['single','daily','2card','3card','5card','ow3gs','抽每日指示'])if(!runeDrawModes.includes(token))failures.push('shared fixed draw modes missing '+token);
  for(const token of ['RUNE_DRAW_MODES.map','home-draw-bubbles','loc-bubble'])if(!runeDrawModeBubbles.includes(token))failures.push('shared fixed draw bubbles missing '+token);
  for(const [name,source] of [['single/daily',runeSingleDaily],['spread',runeDrawClient]])if(!source.includes('RuneDrawModeBubbles'))failures.push('Rune draw selection must reuse shared component in '+name);
  for(const token of ['命之符文示例','月之符文籤詩系統','RuneDrawModeBubbles'])if(!runeIntro.includes(token))failures.push('shared complete Rune intro missing '+token);
  if(!runeHome.includes('RuneIntroSection'))failures.push('LunaRunes home must reuse complete LOC Rune intro section');
  if(!identity.includes('RuneIntroSection'))failures.push('LOC home must reuse complete Rune intro section');
  for(const token of ['runes-rune-long-details','runes-rune-long-detail','符文歷史','神話故事','靈魂課題','實踐挑戰','儀式建議','調和建議'])if(!runeDirectory.includes(token))failures.push('Rune directory long detail layout missing '+token);
  if(runeHome.includes('daily/trend'))failures.push('Daily Trend must remain folded into Daily Log.');
  const legacyDailyTrend=read('app/daily/trend/page.jsx');
  if(!legacyDailyTrend.includes("from '../log/page'"))failures.push('Legacy Daily Trend route must reuse Daily Log.');
  const lunarunesSitemap=read('app/lunarunes-sitemap.xml/route.js');
  if(lunarunesSitemap.includes("'/daily/trend'"))failures.push('Retired Daily Trend route must not be advertised in sitemap.');
  const galaxy=read('app/loc/galaxy-query.js');
  for(const token of ["count:'exact',head:true",'.or(','.range(','searchGalaxyRows','selectSourceTrendRows'])if(!galaxy.includes(token))failures.push('Shared Galaxy query pipeline missing '+token);
  if(/flexsearch|new Index\(/i.test(galaxy))failures.push('Global Search must remain Database-first.');
  if(/item_count:count\(\)|createtime::date/.test(galaxy))failures.push('Public feature queries must not depend on optional PostgREST grouped aggregate syntax.');
  const dbQuery=read('app/loc/db-query.mjs');
  for(const token of ['executePublicRead','dbBackupPublicClient','markPrimaryReadFailed','source=\'auto\''])if(!dbQuery.includes(token))failures.push('Public read failover contract missing '+token);
  const configured=read('app/loc/providers/configured.mjs');
  for(const token of ['createNeonPublicAdapter','backupPublicClient','primarySourceLabel:\'Supabase\'','backupSourceLabel:\'Neon\''])if(!configured.includes(token))failures.push('Configured dual-source public read missing '+token);
  const appShell=read('app/AppShell.jsx');
  for(const token of ['主要資料來源：','備用資料來源：','目前使用：','備援資料可能有同步時間差'])if(!appShell.includes(token))failures.push('Global data source disclosure missing '+token);
  if(appShell.indexOf('<DataSourceStatus/>')<appShell.indexOf('<footer'))failures.push('Data source status must remain in the footer, not above page content.');
  const featureState=read('app/modular/feature-data-state.js');
  if(!featureState.includes('pgrst123')||!featureState.includes('資料查詢功能與資料庫介面不相容'))failures.push('Provider capability errors must not be mislabeled as read permissions.');
  const scopeData=read('app/loc/scope-data.js');
  for(const token of ["MANAGE_TABLE='silver.manage'",'scopeDataFromManageRows','defaultScopeData','selectManagedScopes'])if(!scopeData.includes(token))failures.push('Scope data source missing '+token);
  const packageJson=JSON.parse(read('package.json'));
  const packageLock=JSON.parse(read('package-lock.json'));
  if(packageJson.dependencies?.flexsearch||packageLock.packages?.['node_modules/flexsearch'])failures.push('FlexSearch must be removed from runtime dependencies and lockfile');
  const game=read('app/lrunes/game/GameView.jsx');
  const keywordEngine=read('app/loc/model/rune66-keyword-engine.mjs');
  if(/from ['"]flexsearch['"]|new Index\(/i.test(game+'\n'+keywordEngine))failures.push('Runtime text matching must not depend on FlexSearch');
  const capabilityRegistry=JSON.parse(read('governance/runtime-capabilities.json'));
  const publicReadFailover=capabilityRegistry?.capabilities?.public_read_failover;
  if(!publicReadFailover||publicReadFailover.status!=='required'||publicReadFailover.primary_source!=='Supabase'||publicReadFailover.backup_source!=='Neon')failures.push('Public-read failover capability must require Supabase primary and Neon backup.');
  if(publicReadFailover?.write_failover!==false||publicReadFailover?.ui_source_disclosure_required!==true||publicReadFailover?.page_chain_source_pinning_required!==true)failures.push('Public-read failover safety/disclosure contract is incomplete.');
  const portableQueries=capabilityRegistry?.capabilities?.provider_neutral_public_queries;
  if(!portableQueries||portableQueries.optional_provider_aggregate_dependency_allowed!==false)failures.push('Provider-neutral public query capability must reject optional aggregate dependencies.');
  if(Object.keys(capabilityRegistry?.capabilities||{}).some(name=>/flexsearch/i.test(name)))failures.push('Retired FlexSearch capabilities must be removed from governance');
  const rune66Analysis=read('app/loc/rune66-keyword-analysis.js');
  for(const token of ["column:'statistics_able',operator:'eq',value:true"])if(!galaxy.includes(token)||!rune66Analysis.includes(token))failures.push('Statistics and Rune66 analysis must use fixed statistics_able filters');
  const rune66Engine=read('app/loc/model/rune66-keyword-engine.mjs');
  if(!rune66Analysis.includes('classifyRune66Documents'))failures.push('Rune66 data loader must delegate to shared keyword classifier');
  if(!rune66Analysis.includes("`silver.${scope}_keywords`")||rune66Analysis.includes('lo3rwang_style'))failures.push('Rune66 data loader must use the current Scope unified keyword library table');
  if(/silver\.runes(?:_etc)?\b/.test(rune66Analysis))failures.push('Rune66 keyword classification must not depend on LunaRunes Canon tables');
  for(const token of ['class_name','class_group','class_enable'])if(!rune66Analysis.includes(token))failures.push('Rune66 keyword loader missing independent keyword metadata '+token);
  for(const token of ['classifyRune66Documents'])if(!rune66Engine.includes(token))failures.push('Rune66 keyword engine missing classifier '+token);
  for(const token of ['class_group','class_enable','item_no','item_name','principle','keywords'])if(!rune66Engine.includes(token))failures.push('Rune66 unified keyword item model missing '+token);
  if(rune66Engine.includes('keyword_group')||rune66Engine.includes("node_type==='style'")||rune66Engine.includes("node_type==='keyword'"))failures.push('Rune66 engine must not restore style/rule/node-type keyword storage');
  const statistics=read('app/modular/features/Statistics.jsx');
  const culture=read('app/modular/features/Culture.jsx');
  const search=read('app/modular/features/Search.jsx');
  const scopeGroupOverview=read('app/loc/ScopeGroupOverview.jsx');
  const cultureQuery=read('app/loc/culture-query.js');
  const queryContract=read('app/loc/query-contract.mjs');
  if(!queryContract.includes('DB_QUERY_BATCH_SIZE=1000'))failures.push('Portable Data API batch size must remain 1000.');
  for(const token of ['ScopeGroupStatistics','ScopeStatisticsPanel','statisticsQueryRange','selectManagedScopes','selectScopeDensityRows(scopes','LOC 合併總數','Scope 分布（scope_id）','統計來源（scope_id）'])if(!statistics.includes(token))failures.push('Statistics aggregate/query-window contract missing '+token);
  if(statistics.includes("?{startDate:customFrom,endDate:customTo}\n    :{startDate:'',endDate:''}"))failures.push('Preset Statistics ranges must not fall back to an unbounded database query.');
  if(galaxy.includes("{column:'source_name',operator:'neq',value:''}"))failures.push('Unknown source rows must reach Statistics and map to Others instead of being discarded.');
  for(const token of ['表現風格','Class｜符文群組','Group｜符文排行'])if(!statistics.includes(token))failures.push('Statistics style-filter presentation missing '+token);
  for(const token of ['表現風格','Class｜符文群組比例','culture-style-filter'])if(!culture.includes(token))failures.push('Culture style-filter presentation missing '+token);
  for(const token of ['currentStructurePeriod','items={timelineItems}','windowStart={currentStructureStart}','windowEnd={currentStructureEnd}'])if(!culture.includes(token))failures.push('Culture first river must use the full Scope timeline with the current period only as its initial viewport: '+token);
  const structureRiver=culture.slice(culture.indexOf("scope-culture-structure-river"),culture.indexOf("scope-culture-classification-river",culture.indexOf("scope-culture-structure-river")));
  if(structureRiver.includes('fixedMin={currentStructureStart}')||structureRiver.includes('fixedMax={currentStructureEnd}'))failures.push('Culture first river must remain horizontally navigable beyond the current period.');
  for(const token of ['isAggregateScope','locCombinedSourceRiverItems','locScopeDistributionItems'])if(!culture.includes(token))failures.push('LOC aggregate Culture contract missing '+token);
  for(const token of ['selectManagedScopes','Promise.all(managedScopes','buildLocSourceRiver','buildLocScopeDistribution'])if(!cultureQuery.includes(token))failures.push('LOC Culture aggregate data loader missing '+token);
  for(const token of ['selectScopeGroupChildren','不跨 Scope 聚合 Galaxy／Galaxy Media／Time','前往此 Scope'])if(!scopeGroupOverview.includes(token))failures.push('Scope Group overview navigation contract missing '+token);
  if(!search.includes('enabled:!aggregateScopes')||!search.includes('Scope Group 搜尋導引')||!search.includes('ScopeGroupOverview'))failures.push('Scope Group Search must use registry overview instead of multi-Scope search.');
  const timelineEditor=read('app/modular/features/CultureTimelineEditor.jsx');
  if(cultureQuery.includes('anchor_pair')||timelineEditor.includes('anchor_pair'))failures.push('Timeline code must not restore legacy anchor_pair storage.');
  for(const token of ['anchor_ids','milestone_anchor_ids'])if(!cultureQuery.includes(token))failures.push('Culture timeline ordered-anchor contract missing '+token);
  for(const token of ['anchor_ids','normalizeAnchorIds','新增里程碑'])if(!timelineEditor.includes(token))failures.push('Timeline editor ordered-anchor contract missing '+token);
  if(statistics.includes('關鍵詞排行')||culture.includes('關鍵詞排行'))failures.push('Keyword-level ranking must remain hidden behind Class / Group presentation');
  const dbAudit=read('scripts/verify-db-public-read.mjs');
  for(const token of ['managedScopes','scopeMapping','scopeMappings','mapping conflict','verifyManagedScope'])if(!dbAudit.includes(token))failures.push('Public database audit missing Scope-derived '+token);
  for(const token of ['lo3rwang_galaxy','lrunes_galaxy','lo3rwang_time','lrunes_time'])if(dbAudit.includes(token))failures.push('Public database audit must not hard-code Scope table '+token);
}
if(failures.length){
  console.error('[current-semantics] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[current-semantics] Current identity, daily calendar context, fixed Statistics eligibility filters, Database-first Search and dependency-free text matching verified');
