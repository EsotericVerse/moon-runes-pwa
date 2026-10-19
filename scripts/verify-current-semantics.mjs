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
  'app/loc/db-query.mjs',
  'app/loc/ScopeGroupOverview.jsx',
  'app/loc/culture-query.js'
];
for(const path of required)if(!fs.existsSync(path)||!read(path).trim())failures.push('missing Current contract file: '+path);
if(!failures.length){
  const identity=read('app/loc/views/AboutView.jsx');
  const identitySource=identity+'\n'+read('README.md');
  const runeIntro=read('app/lrunes/RuneIntroSection.jsx');
  // Identity copy now belongs to silver.loc_blocks (index/order), not hardcoded JSX.
  if(!identity.includes('page="index"')||!identity.includes('maxBlocks={8}')||!identity.includes('renderDisplay={LocHomeBlockDisplay}'))failures.push('LOC identity must render the canonical indexed page blocks');
  for(const token of ['LOC','LunaRunes'])if(!identitySource.includes(token))failures.push('identity seed missing '+token);
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
  for(const token of ['.or(','dataQuery.range(offset,offset+pageSize)','searchGalaxyRows','selectSourceTrendRows'])if(!galaxy.includes(token))failures.push('Shared Galaxy query pipeline missing '+token);
  const literalSearchProvider=galaxy.split('function makeProvider(')[1]?.split('function genericScopeProviders(')[0]||'';
  if(/count:'exact'|head:true/.test(literalSearchProvider))failures.push('Search pagination must use bounded lookahead, not exact COUNT (known 57014 timeout)');
  if(/flexsearch|new Index\(/i.test(galaxy))failures.push('Global Search must remain Database-first.');
  if(/item_count:count\(\)|createtime::date/.test(galaxy))failures.push('Public feature queries must not depend on optional PostgREST grouped aggregate syntax.');
  const dbQuery=read('app/loc/db-query.mjs');
  for(const token of ['executePublicRead','dbBackupPublicClient','markPrimaryReadFailed','source=\'auto\''])if(!dbQuery.includes(token))failures.push('Public read failover contract missing '+token);
  const configured=read('app/loc/providers/configured.mjs');
  for(const token of ['createBackupPublicAdapter','backupPublicClient','primarySourceLabel:\'Admin-selected\'','backupSourceLabel:\'Backup\''])if(!configured.includes(token))failures.push('Configured dual-source public read missing '+token);
  const appShell=read('app/AppShell.jsx');
  for(const token of ['主要資料來源：','備用資料來源：','目前使用：','備援資料可能有同步時間差'])if(!appShell.includes(token))failures.push('Global data source disclosure missing '+token);
  if(appShell.indexOf('<DataSourceStatus/>')<appShell.indexOf('<footer'))failures.push('Data source status must remain in the footer, not above page content.');
  const featureState=read('app/modular/feature-data-state.js');
  if(!featureState.includes('pgrst123')||!featureState.includes('l.incompatibleQuery'))failures.push('Provider capability errors must not be mislabeled as read permissions.');
  const scopeData=read('app/loc/scope-data.js');
  for(const token of ["MANAGE_TABLE='silver.manage'",'scopeDataFromManageRows','defaultScopeData','selectManagedScopes'])if(!scopeData.includes(token))failures.push('Scope data source missing '+token);
  const statisticsCurrent=read('app/modular/features/Statistics.jsx');
  if(!statisticsCurrent.includes('selectPublicStatisticsMembers')||statisticsCurrent.includes('queryFn:selectManagedScopes')){
    failures.push('Public statistics must resolve active members without authentication.');
  }
  const packageJson=JSON.parse(read('package.json'));
  const packageLock=JSON.parse(read('package-lock.json'));
  if(packageJson.dependencies?.flexsearch||packageLock.packages?.['node_modules/flexsearch'])failures.push('FlexSearch must be removed from runtime dependencies and lockfile');
  const game=read('app/lrunes/game/GameView.jsx');
  const keywordEngine=read('app/loc/model/rune66-keyword-engine.mjs');
  if(/from ['"]flexsearch['"]|new Index\(/i.test(game+'\n'+keywordEngine))failures.push('Runtime text matching must not depend on FlexSearch');
  // Validate active modules directly; do not keep a separately configured JSON
  // registry or issue a schema/status probe for each public data request.
  const routingState=read('app/loc/providers/routing-state.mjs');
  for(const token of ['selectedDatabaseRouting','recoverableReadError','source===\'backup\'','routing.backupId'])
    if(!dbQuery.includes(token))failures.push('Fail-closed selectable backup route missing '+token);
  for(const token of ['invalidateDatabaseRouting','loc-database-target-changed','backupProvider','mode']){
    if(!routingState.includes(token))failures.push('Database routing cache missing '+token);
  }
  if(/providerExpiresAt|30_000|setInterval\(/.test(dbQuery+routingState))
    failures.push('Database routing must never be polled on a timer');
  const edgeControl=read('supabase/functions/loc-kysely/index.ts');
  for(const token of ['saveDatabaseRouting','backup_selected','set_database_routing','requestedTarget==="backup"','Neon LOC mirror is read-only'])
    if(!edgeControl.includes(token))failures.push('Trusted primary/backup routing missing '+token);
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
  const groupStatistics=read('app/modular/modules/statistics/ScopeGroupStatistics.jsx');
  const runeDaily=read('app/lrunes/DailyRuneAnalytics.jsx');
  const statisticsMultiChart=read('app/modular/modules/statistics/StatisticsMultiChart.jsx');
  const chartModel=read('app/modular/modules/statistics/statistics-time-zoom.mjs');
  const ownIntersection=read('app/modular/modules/statistics/ScopeSelfIntersection.jsx');
  const sourceTaxonomy=read('app/loc/statistics-admin-source.mjs');
  const sourceEditor=read('app/loc/SourceCategoryEditor.jsx');
  const crossMember=read('app/modular/modules/statistics/LocMemberIntersection.jsx');
  if(!statistics.includes('administrativeSourceTrend(')||
     !statistics.includes("queryKey:['statistics-source-taxonomy',scopeId]")||
     !sourceTaxonomy.includes("assignedSource(")||
     !sourceEditor.includes('AdminSourceCategories')||
     !sourceEditor.includes('ScopeCustomSourceCategories')||
     !sourceEditor.includes('silver.scope_source_subcategories')||
     !statistics.includes('source_custom')||
     !statistics.includes('<ScopeCustomSourceCategories')||
     !crossMember.includes("sharing.scopeSources")||
     !ownIntersection.includes("scope_source_subcategories")||
     !crossMember.includes("availableMemberMeasures")||
     !ownIntersection.includes("kind:'group'")){
    failures.push('Group source categories and Scope-owned personal source classification must share real data.');
  }

  // Cross-person participation is Scope × group source consent; there is
  // no blanket Scope sharing flag and no personal custom source switch.
  const crossSharing=read('app/loc/statistics-group-sharing.mjs');
  const sharingEditor=read('app/loc/ScopeGroupStatisticsSharing.jsx');
  if(!groupStatistics.includes("queryKey:['cross-statistics-sharing']")||
     !groupStatistics.includes('sharedScopeDensity(')||
     !statistics.includes('<ScopeGroupStatisticsSharing')||
     !crossMember.includes('sharedSourceBreakdown(')||
     !crossSharing.includes("row.kind!=='source'&&row.kind!=='media'")||
     !crossSharing.includes('sharedGroupCodes(')||
     !sharingEditor.includes('scope_group_source_sharing')||
     !sharingEditor.includes("share_enabled:shareEnabled")||
     statistics.includes('statistics_cross_scope_enabled')||groupStatistics.includes('statistics_cross_scope_enabled')||
     sharingEditor.includes('scope_source_subcategories')){
    failures.push('Group sources must have per-Scope opt-in for cross-member totals and charts; personal custom source controls remain independent.');
  }

  // Regression contract: Daily Rune is an independent LOC comparison test feed.
  // Failure or withdrawal of group-source permissions cannot suppress it.
  if(statistics.includes("from 'recharts'")||!statistics.includes('.then(m=>m.Rune66Summary)'))
    failures.push('Optional Rune66 renderer must not force Recharts into the base statistics bundle');
  if(!statistics.includes('dynamic(()=>import(\'../modules/statistics/StatisticsMultiChart\')')||
     !statistics.includes("from '../modules/statistics/statistics-time-zoom.mjs'")||
     statistics.includes('import StatisticsMultiChart,{')||
     !runeDaily.includes("from '../modular/modules/statistics/statistics-time-zoom.mjs'")){
    failures.push('Chart capability selection must not eagerly import the Recharts renderer');
  }
  if(!crossSharing.includes('row.share_enabled===false')||
     !crossSharing.includes("key.startsWith('daily'))return false")||
     !groupStatistics.includes('sharing={policy.data||{}}')||
     !crossMember.includes("scope:scopes.find(scope=>scope.id==='lrunes')||defaultScopeData('lrunes')")||
     !crossMember.includes("metric.startsWith('daily')")||
     !crossMember.includes("?person==='lrunes':allowedMemberMetric(person,metric,sharing)")||
     !crossMember.includes("preloadedSources.get(id)")||
     !crossMember.includes("{!fetched.isPending&&!fetched.isFetching&&hasCurrentData?<>")||
     crossMember.includes('canOfferMemberCrossStatistics(')||
     !chartModel.includes('if(!hasTime&&!categories.length)return []')||
     !chartModel.includes("if(type==='area')return hasTime&&time.length>=2")){
    failures.push('LOC Daily Rune comparison must not depend on group source-category loading or authorization.');
  }

  if(!ownIntersection.includes("{kind:'personal',label:'個人自訂來源分類'}")||
     !ownIntersection.includes("const basic=ownScopeCategoryCatalog(rows)")||
     !ownIntersection.includes("id:'personal\\u0000'+item.raw")||
     !ownIntersection.includes("ids.push('personal\\u0000'")){
    failures.push('Own-Scope comparisons must preserve the raw source dimension beside group and personal source classifications.');
  }

  if(!crossMember.includes('data-stat-cross-resolved-range=')||
     !crossMember.includes('return {rangeKey,datasets:new Map(pairs)}')||
     !crossMember.includes('fetched.data?.rangeKey===rangeKey')||
     !crossMember.includes('!fetched.isPending&&!fetched.isFetching&&hasCurrentData')||
     !crossMember.includes('uiExtra.statisticsView.memberCrossUpdate')||
     !groupStatistics.includes("key={startDate+'|'+rangeEndDate}")||
     !groupStatistics.includes('choices={memberChoices} onChoicesChange={setMemberChoices}')||
     !groupStatistics.includes('laneCount={memberLaneCount} onLaneCountChange={setMemberLaneCount}')){
    failures.push('Cross-member totals must belong to the exact current date window and preserve selected lanes after zoom.');
  }

  const zoomControls=read('app/modular/modules/statistics/StatisticsZoomControls.jsx');
  const zoomFrame=read('app/modular/modules/statistics/StatisticsChartFrame.jsx');
  const layoutCss=read('app/styles/scope-system.css');
  const zoomModel=read('app/modular/modules/statistics/statistics-time-zoom.mjs');

  if(statistics.includes('TIME_STANDARDS')||statistics.includes('timeStandard')||
     !statistics.includes('<StatisticsChartFrame')||
     !zoomFrame.includes('<StatisticsZoomControls')||
     !statistics.includes('statisticsZoomWindow(')||
     !zoomControls.includes('擴大觀察範圍')||!zoomControls.includes('縮小觀察範圍')||
     zoomControls.includes('type="date"')||zoomControls.includes('<select')||
     !zoomControls.includes('全部資料')||
     !zoomModel.includes("days>31?'week'")||
     !zoomModel.includes('earliestDate')||
     !groupStatistics.includes('selectFirstDailyRuneDate()')||
     !statistics.includes('selectFirstScopeStatisticsDate')||
     !runeDaily.includes('selectFirstDailyRuneDate')||
     !runeDaily.includes('<StatisticsChartFrame')||
     !runeDaily.includes('zoomRange.bucket')||
     !ownIntersection.includes('range?.bucket')||
     !crossMember.includes("unit='month'")){
    failures.push('Statistics controls must be +/- only, default to one year, reach real oldest records and preserve query/aggregation precision.');
  }

  if(statistics.includes('<StatisticsZoomControls')||runeDaily.includes('<StatisticsZoomControls')||
     !groupStatistics.includes('idPrefix="loc-stat"')||
     !statistics.includes('idPrefix="scope-stat"')||
     !statistics.includes('idPrefix="loc-member-stat"') &&
       !crossMember.includes('idPrefix="loc-member-stat"')||
     !zoomFrame.includes('scope-stat-chart-frame__canvas')||
     !zoomControls.includes('scope-stat-zoom-rail')||
     !layoutCss.includes('grid-template-columns:minmax(0,1fr) 44px')||
     !crossMember.includes('<StatisticsChartFrame')||
     !ownIntersection.includes('<StatisticsChartFrame')||
     !runeDaily.includes('idPrefix="daily-rune-stat"')){
    failures.push('Statistics +/- zoom must stay on the right of each chart, not among selection controls.');
  }

  const chartChoices=chartModel.match(/'uiExtra\.chartTypes\.'\+type/g)||[];
  const chartIds=['line','bar','pie','area','stacked','composed','scatter','radar','radial','treemap'];
  // Real visual analytics must depend on valid dimensions; never manufacture
  // a 100% 'total' pie or render a time index as a second scatter metric.
  for(const token of [
    'availableStatisticChartTypes','categories.length>=2',
    "type==='scatter'","type==='radar'","type==='radial'",
    'scatterPair(time,fields)','radarPeriodComparison(time,fields)',
    'activePeriodCoverage(time,fields)','movingAverage(time,fields,totalKey)',
    "t('uiExtra.chartLabels.movingAverage')","t('uiExtra.chartLabels.firstHalf')","t('uiExtra.chartLabels.lastHalf')"
  ])if(!(chartModel+'\n'+statisticsMultiChart).includes(token)){
    failures.push('Statistics chart must have a real analytic purpose: '+token);
  }
  for(const token of ['locAllowed.length?locAllowed.map','locChartType']){
    if(!groupStatistics.includes(token))failures.push('LOC charts must hide unsupported visualizations: '+token);
  }
  for(const token of ['optionsForCurrent.length?optionsForCurrent.map',"aggregateScopes&&scopeId==='loc'"]){
    if(!statistics.includes(token))failures.push('Scope statistics capability must remain isolated: '+token);
  }
  if(statistics.includes('disabled={!locAllowed.some')||statistics.includes('disabled={!optionsForCurrent.some')||ownIntersection.includes('disabled={!availableCharts.some')){
    failures.push('Unsupported chart types must be hidden, not left grey in controls.');
  }
  if(statistics.includes("Pie data={aggregateType==='total'")||statistics.includes("type={chartType}\n        rows={basicTrend}")){
    failures.push('Statistics must not use an all-100% single total as a category chart.');
  }

  if((chartChoices.length<1||chartIds.length<10)||!statisticsMultiChart.includes('foldEmptyTimeBuckets')||
     !statistics.includes('CHART_TYPES=STAT_VISUAL_TYPES')||
     !statistics.includes('<ScopeSelfIntersection')||
     !ownIntersection.includes("selectScopeSourceBreakdownRows")||
     !ownIntersection.includes("scope.galaxyMedia")||
     ownIntersection.includes('只分析目前 Scope 已允許統計的作品與媒體紀錄')||
     ownIntersection.includes("useState(false);\n  const [numberOfLanes")||
     ownIntersection.includes('開啟自交互統計')||
     !ownIntersection.includes('enabled:valid&&!sharedCatalog,')||
     !galaxy.includes('export async function selectScopeSourceBreakdownRows(scope,')){
    failures.push('Statistics must expose ten real charts, optional visible gap folds and strictly own-Scope intersections.');
  }

  const typeIntersection=read('app/loc/statistics-source-intersection.mjs');
  const importPanel=read('app/loc/ManagementImportPanel.jsx');
  function listAppFiles(dir){
    return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
      const entryPath=dir+'/'+entry.name;
      if(entry.isDirectory())return listAppFiles(entryPath);
      return /\.(?:js|jsx|mjs|ts|tsx)$/.test(entry.name)?[entryPath]:[];
    });
  }
  for(const appPath of listAppFiles('app')){
    const source=read(appPath);
    if(source.includes('content_type')||source.includes('作品類型')){
      failures.push('Retired Galaxy work-type field remains in '+appPath);
    }
  }
  if(!importPanel.includes("searchable:explicit.searchable?record.searchable:current.searchable")||
     !importPanel.includes("statistics_able:explicit.statistics_able?record.statistics_able:current.statistics_able")){
    failures.push('Source Refresh must not overwrite visibility flags when the incoming file omits them.');
  }

  if(typeIntersection.includes("kind:'type'")||importPanel.includes('匯入時作品類型')||
     importPanel.includes('<ImportContentTypeCatalog')||
     !typeIntersection.includes('aggregateOwnScopeStatistics')||
     !typeIntersection.includes('ownScopeCategoryCatalog')||
     !ownIntersection.includes('OWN_STAT_DIMENSIONS')||
     !galaxy.includes('aggregateOwnScopeStatistics(texts.rows,media.rows)')){
    failures.push('Source/media statistics must not expose redundant work-type labels.');
  }

  const culture=read('app/modular/features/Culture.jsx');
  // Disabling the optional keyword Class river must never disable or clear the
  // independent period works paginator (including P5).
  for(const token of [
    "const effectiveCategoryKey=selectedGroup?.category_key||'';",
    "effectiveCategoryKey||'all'",
    "enabled:worksOpen&&!isLrunesDaily&&!isAggregateScope&&Boolean(scopeData)&&Boolean(selectedWorkPeriod)",
    "styleFilter==='rune66'?<section className='scope-culture-style-filter'>",
    'l.loadingPeriodWorks',
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
  // Database-read budget: one corpus read per source, with derived views
  // computed from the returned metadata rather than repeated SELECTs.
  const cultureSnapshot=cultureQuery.split('export async function selectScopePeriodSourceSnapshot(')[1]?.split('export async function selectScopePeriodWorkIndex(')[0]||'';
  const searchProviders=galaxy.split('function genericScopeProviders(')[1]?.split('function normalizeSearch(')[0]||'';
  if((cultureSnapshot.match(/selectAllRows\(scope\.(?:galaxy|galaxyMedia),/g)||[]).length!==2||
     /selectSourceCatalog\(|selectSourceDaily\(|selectCategoryCounts\(/.test(cultureSnapshot))
    failures.push('Culture source snapshots must read Galaxy and Media just once each');
  if(!culture.includes('enabled:worksOpen')||!culture.includes("onToggle={event=>setWorksOpen(event.currentTarget.open)}"))
    failures.push('Culture work detail SELECTs must wait for explicit list expansion');
  if(!culture.includes("const [styleFilter,setStyleFilter]=useState('none');")||
     !culture.includes("setStyleFilter('none');"))
    failures.push('Culture keyword Class corpus scans must wait for an explicit user selection');
  if(!culture.includes('initialPeriodSelectionPending=Boolean(primaryPeriods.length&&!openPeriod&&!selectedPeriodKey)')||
     !culture.includes('!initialPeriodSelectionPending&&Boolean(scopeData)'))
    failures.push('Culture must not scan all-time metadata before auto-selecting its initial saved period');
  const cultureWorkIndex=cultureQuery.split('export async function selectScopePeriodWorkIndex(')[1]?.split('export async function selectScopePeriodWorkDetails(')[0]||'';
  if(!cultureWorkIndex.includes('const hasCursorCounts=')||
     (cultureWorkIndex.match(/count:hasCursorCounts\?null:'exact'/g)||[]).length!==2||
     !cultureWorkIndex.includes('galaxyCount:Number(galaxyCount)||0')||
     !cultureWorkIndex.includes('mediaCount:Number(mediaCount)||0'))
    failures.push('Culture bounded work-list queries must reuse their first-page exact counts in the cursor');
  const ownStatistics=statistics.split('function ScopeStatisticsResults(')[1]?.split('function ScopeStatisticsPanel(')[0]||'';
  if(ownStatistics.includes("queryKey:['managed-scopes']")||!ownStatistics.includes('defaultScopeData(scopeId)'))
    failures.push('Single-Scope statistics must reuse the resolved route instead of requesting every Scope');
  if(!groupStatistics.includes('enabled:scopesQuery.isSuccess&&policy.isSuccess,')||
     !groupStatistics.includes('...scopes.map(selectFirstScopeStatisticsDate)'))
    failures.push('Group statistics history probes must exclude Scopes disabled by sharing consent');
  if(!groupStatistics.includes("queryKey:['scope-density','loc',startDate,rangeEndDate,scopeIds.join('|')]")||
     !groupStatistics.includes('sharedScopeDensity(entry.rows,entry.scopeId,policy.data)')||
     groupStatistics.includes('JSON.stringify(policy.data?.permissions')||
     sharingEditor.includes("invalidateQueries({queryKey:['scope-density','loc']}"))
    failures.push('Sharing changes must recompute group charts from cached raw rows without issuing new Galaxy SELECTs');
  if(!search.includes("enabled:scopeId==='loc'&&!aggregateScopes,")||
     !search.includes("if((scopeId==='loc'&&!scopesQuery.isSuccess)||account.permissionLoading)return;"))
    failures.push('Single-Scope Search must neither fetch nor await the LOC Scope registry');
  if(!search.includes("queryKey:['search-style-keyword',")||
     !search.includes('queryClient.fetchQuery({')||
     !culture.includes("queryClient.invalidateQueries({queryKey:['search-style-keyword']})"))
    failures.push('Repeated exact style searches must reuse a bounded cache, invalidated by Culture updates');
  if(!statistics.includes('summary={<UiText id="uiExtra.statisticsView.selfIntersectionTitle"/>}')||
     !groupStatistics.includes('summary={<UiText id="uiExtra.statisticsView.memberCrossTitle"/>}'))
    failures.push('Intersection chart bundles must remain unopened until requested');
  if(!groupStatistics.includes('preloadedSources={preloadedSources}')||
     !crossMember.includes('preloadedSources.get(id)')||
     crossMember.includes('selectScopeSourceBreakdownRows(')||crossMember.includes('selectScopeRegistry(')||
      !crossMember.includes("queryKey:['loc-member-daily-runes',startDate,endDate]")||
      !crossMember.includes('queryClient.fetchQuery({')||!crossMember.includes('new Map(scopes.map(row=>[row.id,row.label||row.id]))')||
     !ownIntersection.includes('sharedCatalog||localCatalog'))
    failures.push('Statistics intersection must reuse already fetched source rows and taxonomy');
  if(!searchProviders.includes("const textColumns=['uid','title','createtime'")||
     searchProviders.includes("const textColumns=['uid','title','content'"))
    failures.push('Search provider result pages must not SELECT complete article bodies');
  const queryContract=read('app/loc/db-contract.mjs');
  for(const token of ['DB_QUERY_BATCH_SIZE=65535','DB_QUERY_TEXT_BATCH_SIZE=1000','queryBatchSize(columns'])if(!queryContract.includes(token))failures.push('Shared metadata/text query limit contract missing '+token);
  for(const token of ['ScopeGroupStatistics','ScopeStatisticsPanel','statisticsZoomWindow','selectPublicStatisticsMembers'])if(!statistics.includes(token))failures.push('Statistics aggregate/query-window contract missing '+token);
  for(const token of ['sharedScopeDensity(','uiExtra.statisticsView.memberCount','uiExtra.statisticsView.memberDistribution'])if(!groupStatistics.includes(token))failures.push('LOC aggregate statistics contract missing '+token);
  if(statistics.includes("?{startDate:customFrom,endDate:customTo}\n    :{startDate:'',endDate:''}"))failures.push('Preset Statistics ranges must not fall back to an unbounded database query.');
  if(galaxy.includes("{column:'source_name',operator:'neq',value:''}"))failures.push('Unknown source rows must reach Statistics and map to Others instead of being discarded.');
  if(!statistics.includes('uiExtra.statisticsView.displayStyle')||!statistics.includes('Rune66Summary')||
     !statisticsMultiChart.includes('uiExtra.statisticsView.classRuneTitle')||
     !statisticsMultiChart.includes('uiExtra.statisticsView.runeRankTitle'))
    failures.push('Statistics style-filter presentation missing');
  // Group is an already-aggregated ranking; page only its rendered rows, while
  // keeping the full result set for percentages and stable rank ordering.
  for(const token of ['RUNE_RANKING_PAGE_SIZE=8','groupRows.slice((activeGroupPage-1)*RUNE_RANKING_PAGE_SIZE,activeGroupPage*RUNE_RANKING_PAGE_SIZE)','visibleGroupRows.map','uiExtra.statisticsView.groupPageNav','setGroupPage(activeGroupPage-1)','setGroupPage(activeGroupPage+1)']){
    if(!statisticsMultiChart.includes(token))failures.push('Statistics Group ranking pagination missing '+token);
  }
  if(!groupStatistics.includes('<LocMemberIntersection')||!groupStatistics.includes('uiExtra.statisticsView.memberDistribution'))failures.push('LOC member-level cross comparison missing.');
  if(statisticsMultiChart.includes('{groupRows.map(row=>'))failures.push('Statistics Group ranking must not render every item in one long list.');
  const keywordPanel=read('app/loc/KeywordLibraryPanel.jsx');
  for(const token of ["const [styleFilter,setStyleFilter]=useState('none')","<ScopeStatisticsResults","scopeHref(scopeId,'statics/keywords')","uiExtra.statisticsView.keywordSettings"]){
    if(!statistics.includes(token))failures.push('Statistics must defer keyword analysis and link its independent editor: '+token);
  }
  if(statistics.includes('KeywordLibraryPanel')||statistics.includes("current==='keywords'"))failures.push('Statistics must not mount the keyword editor in the same route.');
  const keywordSettings=read('app/modular/features/KeywordSettings.jsx');
  for(const token of ['canManageScopeSync(scopeId)',"dynamic(()=>import('../../loc/KeywordLibraryPanel')","<FeaturePage featureId=\"statics\""]){
    if(!keywordSettings.includes(token))failures.push('Standalone keyword route must gate lazy management: '+token);
  }
  for(const token of ["workspace==='analysis'","workspace==='manual'","workspace==='network'","dynamic(()=>import('./KeywordNetworkEditor')","l.workspace"]){
    if(!keywordPanel.includes(token))failures.push('Keyword Library must expose separate analysis, manual and lazy graph views: '+token);
  }
  for(const token of ['l.selectRuneGroup','l.selectRune','l.selectKeyword','groupItems.map(item=>','draftKeywords.map(word=>']){
    if(!keywordPanel.includes(token))failures.push('Manual keyword selection must descend Group → Item → Keyword: '+token);
  }
  const keywordGraph=read('app/loc/KeywordNetworkEditor.jsx');
  for(const token of ["expandedGroup","expandedItemId","rows.filter(row=>","},[graph,classId]);","groups.includes('特殊')","network.focus(originId","viewportRef.current={classId","network.moveTo({position:previousView.position"]){
    if(!keywordGraph.includes(token))failures.push('Keyword network must start at Special when present and preserve viewport during progressive expansion: '+token);
  }
  if(!keywordPanel.includes("key={selectedClassId||selectedClass}")||!keywordPanel.includes("next==='manual'||next==='network'")){
    failures.push('Keyword network must reset initial selection and origin when entering or changing its Class.');
  }
  for(const token of ["onTimeClick={account.canManageScopeSync(scopeId)?date=>","onAdd={null}","items={timelineItems}","uiExtra.cultureView.periodRange","safeDates=selectedVirtualAnchorDates.filter","selectedVirtualAnchorDates.includes(item.date)","uiExtra.cultureView.selectAllCandidates","saveSelectedVirtualAnchors"]){
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
  if(!culture.includes('locIntersectionScopeIds.map')||!culture.includes('l.personalTimelineSuffix')||culture.includes('scope_id: {id} · 個人時間長河'))failures.push('LOC Culture must link to the member without technical IDs or explanation blocks.');
  if(!cultureQuery.includes("style_comment:'風格標籤'")||!cultureQuery.includes('style_comment:2,period:3')||
     !culture.includes("beginTimelineCreation(recordType,'')")||
     !culture.includes("aria-label={translateUiField(locale,'新增時間長河紀錄')}")||
     culture.includes('尋找風格標籤')||culture.includes('尋找既有定錨點')||
     culture.includes('新增時期（選擇既有定錨點）')||culture.includes('新增事件（選擇既有定錨點）')||
     culture.includes('scope-culture-style-panel')||
     !read('app/modular/modules/culture-timeline/CultureTimeline.jsx').includes('style_comment:labels.styleComment,period:labels.period')){
    failures.push('First Time river must show style as third type, period fourth, and use one compact add selector.');
  }
  const timeEditor=read('app/modular/features/CultureTimelineEditor.jsx');
  if(!culture.includes('uiExtra.cultureView.ddOfficialAnchor')||
     ![['period','uiExtra.cultureView.period'],['event','uiExtra.cultureView.event'],['style_comment','uiExtra.cultureView.styleTag']].every(([value,id])=>
        culture.includes("<option value='"+value+"'><UiText id=\""+id+"\"/></option>"))||
     !timeEditor.includes('l.styleEditor')||
     !timeEditor.includes('l.periodHint')||
     !timeEditor.includes('l.eventHint')||
     !timeEditor.includes('legacyEventUnchanged')||
     timeEditor.includes('addIntermediateAnchor')){
    failures.push('Unified Time editor must select period 1–2 / event 2 / style 1 anchors and preserve legacy events.');
  }
  for(const token of ['currentStructurePeriod','items={timelineItems}','windowStart={currentStructureStart}','windowEnd={currentStructureEnd}','labelOf={localizedLabelOf}'])if(!culture.includes(token))failures.push('Culture first river must retain all historic anchors and keep the camera focused on the selected period: '+token);
  if(culture.includes('riverAction')||culture.includes('onBoundaryNavigate={riverAction'))failures.push('Culture river must not restore the browse/create mode toggle.');
  const timeline=read('app/modular/modules/culture-timeline/CultureTimeline.jsx');
  // Mobile Safari/WKWebView should not require keyboard modifiers or raw DOM dblclick.
  for(const token of ["instance.on('doubleClick'","zoomKey:''","scope-timeline-controls","data-anchor-gesture={onTimeClick?'double-tap':'none'}"]){
    if(!timeline.includes(token))failures.push('Culture timeline touch-accessibility contract missing: '+token);
  }
  for(const label of ['放大時間長河','縮小時間長河']){
    if(!timeline.includes("aria-label='"+label+"'")&&!timeline.includes("aria-label={t('"+label+"')}"))
      failures.push('Culture timeline touch-accessibility contract missing: '+label);
  }
  if(timeline.includes("addEventListener('dblclick'")||timeline.includes("zoomKey:'ctrlKey'")||timeline.includes("instance.on('click'")||
     !timeline.includes('hiddenDates=EMPTY_HIDDEN_DATES')||!timeline.includes('focus=EMPTY_FOCUS')||
     !timeline.includes("updateTime:row.entryType==='anchor'")){
    failures.push('Culture timeline must preserve selection/write boundaries without mouse-only gestures or free-date edits.');
  }
  const uiComponents=read('app/modular/ui.jsx');
  if(!culture.includes("<div className='scope-culture-timeline-tools'>")||culture.includes("{account.canManageScopeSync(scopeId)?<div className='scope-culture-timeline-tools'>")||
     !culture.includes("{account.canManageScopeSync(scopeId)?<>")||
     !uiComponents.includes("aria-label={t('uiExtra.pagination.loadMoreAria')}")){
    failures.push('Public period selection and manual pagination must work without an authenticated mouse user.');
  }
  const structureRiver=culture.slice(culture.indexOf("scope-culture-structure-river"),culture.indexOf("scope-culture-classification-river",culture.indexOf("scope-culture-structure-river")));
  if(structureRiver.includes('fixedMin={currentStructureStart}')||structureRiver.includes('fixedMax={currentStructureEnd}'))failures.push('Culture first river must remain horizontally navigable beyond the current period.');
  for(const token of ['isAggregateScope','locCombinedSourceRiverItems','locScopeDistributionItems'])if(!culture.includes(token))failures.push('LOC aggregate Culture contract missing '+token);
  for(const token of ['selectManagedScopes','Promise.all(managedScopes','buildLocSourceRiver','buildLocScopeDistribution'])if(!cultureQuery.includes(token))failures.push('LOC Culture aggregate data loader missing '+token);
  for(const token of ['selectScopeGroupChildren','uiExtra.scopeGroup.memberHome','uiExtra.scopeGroup.openMemberFeature'])if(!scopeGroupOverview.includes(token))failures.push('Scope Group overview navigation contract missing '+token);
  if(!search.includes("enabled:scopeId==='loc'&&!aggregateScopes,")||!search.includes('uiExtra.searchUI.memberSearch')||!search.includes('ScopeGroupOverview'))failures.push('Scope Group Search must use registry overview instead of multi-Scope search.');
  const timelineEditor=read('app/modular/features/CultureTimelineEditor.jsx');
  if(cultureQuery.includes('anchor_pair')||timelineEditor.includes('anchor_pair'))failures.push('Timeline code must not restore legacy anchor_pair storage.');
  if(!cultureQuery.includes('anchor_ids'))failures.push('Culture timeline ordered-anchor contract missing anchor_ids');
  for(const token of ['anchor_ids','normalizeAnchorIds','chosenAnchorPair','anchorOptions.map(row=>','l.periodHint','l.eventHint'])if(!timelineEditor.includes(token))failures.push('Timeline editor must retain semantic references to existing anchor points: '+token);
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
