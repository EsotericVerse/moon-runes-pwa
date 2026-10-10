import fs from 'node:fs';

const failures=[];
const read=path=>fs.readFileSync(path,'utf8');
const required=[
  'app/loc/views/AboutView.jsx',
  'docs/sql/page-block-entities-blocknote.sql',
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
  const pageBlockSeed=read('docs/sql/page-block-entities-blocknote.sql');
  const identitySource=identity+'\n'+pageBlockSeed;
  const runeIntro=read('app/lrunes/RuneIntroSection.jsx');
  // Identity copy now belongs to silver.loc_blocks (index/order), not hardcoded JSX.
  if(!identity.includes('page="index"')||!identity.includes('maxBlocks={8}')||!identity.includes('renderDisplay={LocHomeBlockDisplay}'))failures.push('LOC identity must render the canonical indexed page blocks');
  for(const token of ['Language Architecture Framework','符號式語言'])if(!identitySource.includes(token))failures.push('identity seed missing '+token);
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
  for(const token of ['月之符文籤詩系統','RuneDrawModeBubbles',"selectRows('silver.runes'",'RuneCardInfo','runeImage(sample.data)'])if(!runeIntro.includes(token))failures.push('shared complete Rune intro or DB-backed sample missing '+token);
  if(!runeHome.includes('RuneIntroSection'))failures.push('LunaRunes home must keep the complete Rune intro section');
  if(identity.includes('RuneIntroSection'))failures.push('LOC home must not duplicate the LunaRunes Rune intro section');
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
  const statisticsMultiChart=read('app/modular/modules/statistics/StatisticsMultiChart.jsx');
  const ownIntersection=read('app/modular/modules/statistics/ScopeSelfIntersection.jsx');
  const sourceTaxonomy=read('app/loc/statistics-admin-source.mjs');
  const sourceEditor=read('app/loc/SourceCategoryEditor.jsx');
  const crossMember=read('app/modular/modules/statistics/LocMemberIntersection.jsx');
  if(!statistics.includes('administrativeSourceTrend(')||
     !statistics.includes("queryKey:['statistics-source-taxonomy']")||
     !sourceTaxonomy.includes("assignedSource(")||
     !sourceEditor.includes('AdminSourceCategories')||
     !sourceEditor.includes('ScopeOtherSources')||
     !crossMember.includes("availableMemberMeasures")||
     !ownIntersection.includes("kind:'group'")){
    failures.push('Global source classes, member-level Others and cross-member analytics must share real data.');
  }

  const chartChoices=statisticsMultiChart.match(/\['(?:line|bar|pie|area|stacked|composed|scatter|radar|radial|treemap)','/g)||[];
  // Real visual analytics must depend on valid dimensions; never manufacture
  // a 100% 'total' pie or render a time index as a second scatter metric.
  for(const token of [
    'availableStatisticChartTypes','categories.length>=2',
    "type==='scatter'","type==='radar'","type==='radial'",
    'scatterPair(time,fields)','radarPeriodComparison(time,fields)',
    'activePeriodCoverage(time,fields)','movingAverage(time,fields,totalKey)',
    'name="近三期移動平均"','name="前半期占比"','name="後半期占比"'
  ])if(!statisticsMultiChart.includes(token)){
    failures.push('Statistics chart must have a real analytic purpose: '+token);
  }
  for(const token of ['locAllowed.length?locAllowed.map','optionsForCurrent.length?optionsForCurrent.map',
    "aggregateScopes&&scopeId==='loc'",'locChartType']){
    if(!statistics.includes(token))failures.push('Statistics must disable meaningless views and keep LOC Scope isolation: '+token);
  }
  if(statistics.includes('disabled={!locAllowed.some')||statistics.includes('disabled={!optionsForCurrent.some')||ownIntersection.includes('disabled={!availableCharts.some')){
    failures.push('Unsupported chart types must be hidden, not left grey in controls.');
  }
  if(statistics.includes("Pie data={aggregateType==='total'")||statistics.includes("type={chartType}\n        rows={basicTrend}")){
    failures.push('Statistics must not use an all-100% single total as a category chart.');
  }

  if(chartChoices.length<10||!statisticsMultiChart.includes('foldEmptyTimeBuckets')||
     !statistics.includes('CHART_TYPES=STAT_VISUAL_TYPES')||
     !statistics.includes('<ScopeSelfIntersection')||
     !ownIntersection.includes("selectScopeSourceBreakdownRows")||
     !ownIntersection.includes("scope.galaxyMedia")||
     ownIntersection.includes('只分析目前 Scope 已允許統計的作品與媒體紀錄')||
     ownIntersection.includes("useState(false);\n  const [numberOfLanes")||
     ownIntersection.includes('開啟自交互統計')||
     !ownIntersection.includes('enabled:valid,')||
     !galaxy.includes('export async function selectScopeSourceBreakdownRows(scope,')){
    failures.push('Statistics must expose ten real charts, optional visible gap folds and strictly own-Scope intersections.');
  }

  const typeCatalog=read('app/loc/ImportContentTypeCatalog.jsx');
  const typeIntersection=read('app/loc/statistics-source-intersection.mjs');
  const importPanel=read('app/loc/ManagementImportPanel.jsx');
  if(!typeCatalog.includes("silver.scope_content_types")||
     !typeCatalog.includes('新增作品類型')||
     !importPanel.includes('匯入時作品類型')||
     !importPanel.includes("content_type:row.content_type")||
     !typeIntersection.includes('aggregateOwnScopeStatistics')||
     !typeIntersection.includes('ownScopeCategoryCatalog')||
     !ownIntersection.includes('OWN_STAT_DIMENSIONS')||
     !galaxy.includes('aggregateOwnScopeStatistics(texts.rows,media.rows)')){
    failures.push('Import-managed work types and source/media/type intersections are not connected.');
  }

  const culture=read('app/modular/features/Culture.jsx');
  // Disabling the optional keyword Class river must never disable or clear the
  // independent period works paginator (including P5).
  for(const token of [
    "const effectiveCategoryKey=selectedGroup?.category_key||'';",
    "effectiveCategoryKey||'all'",
    "enabled:!isLrunesDaily&&!isAggregateScope&&Boolean(scopeData)&&Boolean(selectedWorkPeriod)",
    "styleFilter==='rune66'?<section className='scope-culture-style-filter'>",
    "正在載入該時期作品…",
    'onClick={periodWorksPage.reload}'
  ])if(!culture.includes(token))failures.push('Culture P5/all works must survive keyword style changes: '+token);
  if(culture.includes("(!selectedCategory||Boolean(selectedGroup))"))failures.push('Culture must not disable work pagination while source-category snapshot refreshes.');

  const cultureTimeline=read('app/modular/modules/culture-timeline/CultureTimeline.jsx');
  // Explicit period ranges must be applied before vis-timeline's first fit/layout.
  if(!cultureTimeline.includes('const hasSelectedWindow=Boolean(windowStart&&windowEnd&&')||
     !cultureTimeline.includes('...(hasSelectedWindow?{start:windowStart,end:windowEnd}:{})')||
     !cultureTimeline.includes('if(hasSelectedWindow){')){
    failures.push('Culture timeline must initialize selected window before auto-fit');
  }
  // An existing ?from=... deep link may set the initial period, but must not
  // reset a later explicit period selection on unrelated React query rerenders.
  for(const token of [
    'const primaryPeriods=useMemo(',
    "const appliedDateNavigationRef=useRef('');",
    "const navigationKey=[scopeId,requestedWindowStart,requestedWindowEnd].join('|');",
    'if(appliedDateNavigationRef.current===navigationKey)return;',
    'appliedDateNavigationRef.current=navigationKey;',
    'if(isAggregateScope||!query.data)return;',
    'onChange={event=>setSelectedPeriodKey(event.target.value)}'
  ])if(!culture.includes(token))failures.push('Culture manual period range must survive refetch and deep-link rerenders: '+token);

  const search=read('app/modular/features/Search.jsx');
  const scopeGroupOverview=read('app/loc/ScopeGroupOverview.jsx');
  const cultureQuery=read('app/loc/culture-query.js');
  const queryContract=read('app/loc/query-contract.mjs');
  if(!queryContract.includes('DB_QUERY_BATCH_SIZE=1000'))failures.push('Portable Data API batch size must remain 1000.');
  for(const token of ['ScopeGroupStatistics','ScopeStatisticsPanel','statisticsQueryRange','selectManagedScopes','selectScopeDensityRows(scopes','LOC 合併總數','所屬人員分布'])if(!statistics.includes(token))failures.push('Statistics aggregate/query-window contract missing '+token);
  if(statistics.includes("?{startDate:customFrom,endDate:customTo}\n    :{startDate:'',endDate:''}"))failures.push('Preset Statistics ranges must not fall back to an unbounded database query.');
  if(galaxy.includes("{column:'source_name',operator:'neq',value:''}"))failures.push('Unknown source rows must reach Statistics and map to Others instead of being discarded.');
  for(const token of ['表現風格','Class｜符文群組','Group｜符文排行'])if(!statistics.includes(token))failures.push('Statistics style-filter presentation missing '+token);
  // Group is an already-aggregated ranking; page only its rendered rows, while
  // keeping the full result set for percentages and stable rank ordering.
  for(const token of ['RUNE_RANKING_PAGE_SIZE=8','groupRows.slice((activeGroupPage-1)*RUNE_RANKING_PAGE_SIZE,activeGroupPage*RUNE_RANKING_PAGE_SIZE)','visibleGroupRows.map','Group 統計分頁','setGroupPage(activeGroupPage-1)','setGroupPage(activeGroupPage+1)']){
    if(!statistics.includes(token))failures.push('Statistics Group ranking pagination missing '+token);
  }
  if(!statistics.includes('<LocMemberIntersection')||!statistics.includes('所屬人員分布'))failures.push('LOC member-level cross comparison missing.');
  if(statistics.includes('{groupRows.map(row=>'))failures.push('Statistics Group ranking must not render every item in one long list.');
  const keywordPanel=read('app/loc/KeywordLibraryPanel.jsx');
  for(const token of ["const [styleFilter,setStyleFilter]=useState('none')","<ScopeStatisticsResults","scopeHref(scopeId,'statics/keywords')","關鍵詞設定"]){
    if(!statistics.includes(token))failures.push('Statistics must defer keyword analysis and link its independent editor: '+token);
  }
  if(statistics.includes('KeywordLibraryPanel')||statistics.includes("current==='keywords'"))failures.push('Statistics must not mount the keyword editor in the same route.');
  const keywordSettings=read('app/modular/features/KeywordSettings.jsx');
  for(const token of ['canManageScopeSync(scopeId)',"dynamic(()=>import('../../loc/KeywordLibraryPanel')","<FeaturePage featureId=\"statics\""]){
    if(!keywordSettings.includes(token))failures.push('Standalone keyword route must gate lazy management: '+token);
  }
  for(const token of ["workspace==='analysis'","workspace==='manual'","workspace==='network'","dynamic(()=>import('./KeywordNetworkEditor')","關鍵詞工作區"]){
    if(!keywordPanel.includes(token))failures.push('Keyword Library must expose separate analysis, manual and lazy graph views: '+token);
  }
  for(const token of ['選擇符文群組','選擇符文','選擇關鍵詞','groupItems.map(item=>','draftKeywords.map(word=>']){
    if(!keywordPanel.includes(token))failures.push('Manual keyword selection must descend Group → Item → Keyword: '+token);
  }
  const keywordGraph=read('app/loc/KeywordNetworkEditor.jsx');
  for(const token of ["expandedGroup","expandedItemId","rows.filter(row=>","},[graph,classId]);","groups.includes('特殊')","network.focus(originId","viewportRef.current={classId","network.moveTo({position:previousView.position"]){
    if(!keywordGraph.includes(token))failures.push('Keyword network must start at Special when present and preserve viewport during progressive expansion: '+token);
  }
  if(!keywordPanel.includes("key={selectedClassId||selectedClass}")||!keywordPanel.includes("next==='manual'||next==='network'")){
    failures.push('Keyword network must reset initial selection and origin when entering or changing its Class.');
  }
  for(const token of ["onTimeClick={account.canManageScopeSync(scopeId)?date=>","onAdd={null}","items={timelineItems}","檢視時期範圍","safeDates=selectedVirtualAnchorDates.filter","selectedVirtualAnchorDates.includes(item.date)","全選待審候選","saveSelectedVirtualAnchors"]){
    if(!culture.includes(token))failures.push('Culture river must review reusable existing anchors, compare suggestions, and add only after review: '+token);
  }
  if(!culture.includes("()=>[...classificationBuckets,...virtualAnchorItems]")||
     culture.includes('visibleExistingAnchors')||culture.includes('anchorReviews.map')||
     culture.includes('既有定錨點｜持續檢討')||
     culture.includes("className:'scope-existing-anchor'")){
    failures.push('Culture second river must not duplicate existing anchor markers or always-on review cards.');
  }
  if(!culture.includes("<details className='scope-culture-anchor-picker'>")||
     culture.includes("<details className='scope-culture-anchor-picker' open>")){
    failures.push('Candidate density comparison must stay opt-in and collapsed by default.');
  }
  for(const token of ['表現風格','Class｜符文群組比例','culture-style-filter'])if(!culture.includes(token))failures.push('Culture style-filter presentation missing '+token);
  if(!culture.includes('locIntersectionScopeIds.map')||!culture.includes('個人時間長河')||culture.includes('scope_id: {id} · 個人時間長河'))failures.push('LOC Culture must link to the member without technical IDs or explanation blocks.');
  if(!cultureQuery.includes("style_comment:'風格標籤'")||!cultureQuery.includes('style_comment:2,period:3')||
     !culture.includes("beginTimelineCreation(recordType,'')")||
     !culture.includes("aria-label='新增時間長河紀錄'")||
     culture.includes('尋找風格標籤')||culture.includes('尋找既有定錨點')||
     culture.includes('新增時期（選擇既有定錨點）')||culture.includes('新增事件（選擇既有定錨點）')||
     culture.includes('scope-culture-style-panel')||
     !read('app/modular/modules/culture-timeline/CultureTimeline.jsx').includes("style_comment:'風格標籤',period:'時期'")){
    failures.push('First Time river must show style as third type, period fourth, and use one compact add selector.');
  }
  const timeEditor=read('app/modular/features/CultureTimelineEditor.jsx');
  if(!culture.includes('＋ 新增正式定錨點')||
     !["<option value='period'>時期</option>","<option value='event'>事件</option>","<option value='style_comment'>風格標籤</option>"].every(option=>culture.includes(option))||
     !timeEditor.includes('風格標籤（新增／編輯）')||
     !timeEditor.includes('時期：1 或 2 個定錨點')||
     !timeEditor.includes('事件：固定選擇 2 個定錨點')||
     !timeEditor.includes('legacyEventUnchanged')||
     timeEditor.includes('addIntermediateAnchor')){
    failures.push('Unified Time editor must select period 1–2 / event 2 / style 1 anchors and preserve legacy events.');
  }
  for(const token of ['currentStructurePeriod','items={timelineItems}','windowStart={currentStructureStart}','windowEnd={currentStructureEnd}','labelOf={labelOf}'])if(!culture.includes(token))failures.push('Culture first river must retain all historic anchors and keep the camera focused on the selected period: '+token);
  if(culture.includes('riverAction')||culture.includes('onBoundaryNavigate={riverAction'))failures.push('Culture river must not restore the browse/create mode toggle.');
  const timeline=read('app/modular/modules/culture-timeline/CultureTimeline.jsx');
  // Mobile Safari/WKWebView should not require keyboard modifiers or raw DOM dblclick.
  for(const token of ["instance.on('doubleClick'","zoomKey:''","scope-timeline-controls","aria-label='放大時間長河'","aria-label='縮小時間長河'","data-anchor-gesture={onTimeClick?'double-tap':'none'}"]){
    if(!timeline.includes(token))failures.push('Culture timeline touch-accessibility contract missing: '+token);
  }
  if(timeline.includes("addEventListener('dblclick'")||timeline.includes("zoomKey:'ctrlKey'")||timeline.includes("instance.on('click'")||
     !timeline.includes('hiddenDates=EMPTY_HIDDEN_DATES')||!timeline.includes('focus=EMPTY_FOCUS')||
     !timeline.includes("updateTime:row.entryType==='anchor'")){
    failures.push('Culture timeline must preserve selection/write boundaries without mouse-only gestures or free-date edits.');
  }
  const uiComponents=read('app/modular/ui.jsx');
  if(!culture.includes("<div className='scope-culture-timeline-tools'>")||culture.includes("{account.canManageScopeSync(scopeId)?<div className='scope-culture-timeline-tools'>")||
     !culture.includes("{account.canManageScopeSync(scopeId)?<>")||
     !uiComponents.includes('aria-label="載入更多內容"')){
    failures.push('Public period selection and manual pagination must work without an authenticated mouse user.');
  }
  const structureRiver=culture.slice(culture.indexOf("scope-culture-structure-river"),culture.indexOf("scope-culture-classification-river",culture.indexOf("scope-culture-structure-river")));
  if(structureRiver.includes('fixedMin={currentStructureStart}')||structureRiver.includes('fixedMax={currentStructureEnd}'))failures.push('Culture first river must remain horizontally navigable beyond the current period.');
  for(const token of ['isAggregateScope','locCombinedSourceRiverItems','locScopeDistributionItems'])if(!culture.includes(token))failures.push('LOC aggregate Culture contract missing '+token);
  for(const token of ['selectManagedScopes','Promise.all(managedScopes','buildLocSourceRiver','buildLocScopeDistribution'])if(!cultureQuery.includes(token))failures.push('LOC Culture aggregate data loader missing '+token);
  for(const token of ['selectScopeGroupChildren','成員首頁','前往該成員'])if(!scopeGroupOverview.includes(token))failures.push('Scope Group overview navigation contract missing '+token);
  if(!search.includes('enabled:!aggregateScopes')||!search.includes('成員搜尋')||!search.includes('ScopeGroupOverview'))failures.push('Scope Group Search must use registry overview instead of multi-Scope search.');
  const timelineEditor=read('app/modular/features/CultureTimelineEditor.jsx');
  if(cultureQuery.includes('anchor_pair')||timelineEditor.includes('anchor_pair'))failures.push('Timeline code must not restore legacy anchor_pair storage.');
  if(!cultureQuery.includes('anchor_ids'))failures.push('Culture timeline ordered-anchor contract missing anchor_ids');
  for(const token of ['anchor_ids','normalizeAnchorIds','chosenAnchorPair','anchorOptions.map(row=>','時期：1 或 2 個定錨點','事件：固定選擇 2 個定錨點'])if(!timelineEditor.includes(token))failures.push('Timeline editor must retain semantic references to existing anchor points: '+token);
  if(timelineEditor.includes('里程碑'))failures.push('Timeline editor must not expose milestone as a separate concept.');
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
