import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {snapTimelineRangeToAnchors} from '../app/modular/modules/culture-timeline/culture-anchor-snap.mjs';
import {blocksToPlainText,normalizeBlocks,plainTextToBlocks} from '../app/loc/blocknote-content.mjs';
import {HOME_BLOCK_LIMIT,homeBlockRows,visibleHomeEntities} from '../app/loc/home-block-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const failures=[];
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const must=(condition,message)=>{if(!condition)failures.push(message);};

const galaxy=read('app/loc/galaxy-query.js');
const culture=read('app/loc/culture-query.js');
const cultureUi=read('app/modular/features/Culture.jsx');
const editor=read('app/modular/features/CultureTimelineEditor.jsx');
const visualStyleTags=read('app/modular/features/CultureStyleTagsEditor.jsx');
const nativeTimeline=read('app/modular/modules/culture-timeline/CultureTimeline.jsx');
const management=read('app/loc/GovernanceManagement.jsx');
const governance=read('app/modular/features/Governance.jsx');
const statistics=read('app/modular/features/Statistics.jsx');
const admin=read('app/loc/views/AdminHomeView.jsx');
const dbContract=read('app/loc/db-contract.mjs');
const keywordLibrary=read('app/loc/KeywordLibraryPanel.jsx');
const keywordNetwork=read('app/loc/KeywordNetworkEditor.jsx');
const keywordAnalysis=read('app/loc/rune66-keyword-analysis.js');
const portableSchema=read('docs/sql/portable-current-schema.sql');
const scopeProvisioning=read('docs/sql/scope-provisioning.sql');
const scopeData=read('app/loc/scope-data.js');
const scopeGroup=read('app/loc/ScopeGroupManagement.jsx');
const locApp=read('app/loc/LocApp.jsx');
const groupOverview=read('app/loc/ScopeGroupOverview.jsx');
const genericHome=read('app/loc/views/GenericScopeHomeView.jsx');
const scopeRuntime=read('app/modular/use-scope-runtime.js');
const scopeRegistry=read('app/modular/scope-registry.js');
const importPanel=read('app/loc/ManagementImportPanel.jsx');
const scopeSettings=read('app/loc/ScopeSettingsPanel.jsx');
const publisher=read('app/loc/ManagementArticlePublisher.jsx');
const blockNoteEntry=read('app/loc/BlockNoteEditor.jsx');
const blockNoteContent=read('app/loc/blocknote-content.mjs');
const blockNoteEditor=read('app/loc/BlockNoteEditorClient.jsx');
const editableBlocks=read('app/loc/ScopeEditableBlocks.jsx');
const authorHome=read('app/loc/views/AuthorHomeView.jsx');
const authorHomeEditable=read('app/loc/AuthorHomeEditableBlock.jsx');
const locHomeBlock=read('app/loc/LocHomeBlockDisplay.jsx');
const locHomeCss=read('app/styles/loc-about-original.css');
const locHome=read('app/loc/views/AboutView.jsx');
const sharedFeatureHero=read('app/loc/feature-hero.mjs');
const featureUi=read('app/modular/ui.jsx');
const runesHome=read('app/lrunes/RunesClient.jsx');
const personalGovernance=read('app/modular/governance/PersonalGovernance.jsx');
const runesGovernance=read('app/modular/governance/LunaRunesGovernance.jsx');
const sharedSearch=read('app/modular/features/Search.jsx');
const registrySql=read('docs/sql/scope-registry-management.sql');
const sourceRefreshIndex=read('docs/sql/source-refresh-index.sql');

must(!galaxy.includes('include_in_time'),'generic search must not query nonexistent include_in_time');
must(galaxy.includes("'style_tags'")&&galaxy.includes("searchFields:['label','note','status','style_tags']"),'generic Time search must include style_tags');
must(culture.includes('visibility,style_tags'),'Culture shared Time contract must include style_tags');
must(editor.includes('style_tag_descriptions')&&editor.includes('<CultureStyleTagsField')&&visualStyleTags.includes('CultureStyleTagsField'),'Time editor must use visual searchable style chips rather than comma-delimited forms');
must(editor.includes('styleDescriptionOf')&&editor.includes('missingStyleDescription')&&editor.includes('搜尋顯示說明'),'Time editor must require per-tag search descriptions and delegate visual editing to shared module');
must(cultureUi.includes('onClick={canEditWork')&&cultureUi.includes('isInteractiveTarget')&&!cultureUi.includes("UI_COPY.culture.editing:'編輯'"),'Culture existing works must enter editing by direct non-interactive card click without an Edit button');
must(galaxy.includes('selectStyleKeywordIntroductions')&&!galaxy.includes('scopeCards('),'Search must prepend exact style-keyword introductions and must not use partial Scope-ID cards');
must(management.includes('scope?.aggregateChildren?<ManagementDisclosure')&&management.includes('<ScopeGroupManagement scopeId={scopeId}/>'),'every DB Scope Group must have its own collapsed Manage entry');
must(governance.includes('governance-management-cta')&&governance.includes('href={manageHref}')&&!governance.includes("LOC 的管理入口進入 Admin")&&!governance.includes('Manage 只保留雜項設定'),'LOC and Scope Governance CTA must show only a heading and management action without adjacent explanations');
must(management.includes('account.signIn(callbackURL)')&&!management.includes('copy.description')&&!management.includes('description:\'登入後'),'Scope management login must keep its login action without a descriptive paragraph');
must(management.includes('ScopeGroupManagement'),'Manage must compose the Scope Group module');
must(scopeRuntime.includes("aggregateChildren:registryRow.scope_kind==='group'")&&genericHome.includes('ScopeGroupOverview')&&sharedSearch.includes('ScopeGroupOverview'),'New DB Scope Groups must use the generic runtime and existing public overview');
must(locApp.includes("scopeMeta?.aggregateChildren&&scopeId!=='loc'")&&locApp.includes("['statics','culture','governance'].includes(forcedView)")&&locApp.includes('groupOverviewView?<FeaturePage')&&groupOverview.includes('selectScopeGroupChildren(scopeId)'),'Dynamic DB Groups must route Statistics/Culture/Governance to existing read-only member overview instead of LOC aggregate or nonexistent Group tables');
must(groupOverview.includes('scopeHref(row.scope_id')&&groupOverview.includes('不執行 Group 級全文搜尋或統計 COUNT'),'Scope Group overview must direct users to child Scope queries without expensive group-wide counts');
must(management.includes('<ScopeSettingsPanel')&&management.includes('<ManagementArticlePublisher')&&management.includes('<ManagementImportPanel')&&management.includes('ManagementDisclosure')&&management.includes('label="發表文章"')&&!management.includes('KeywordLibraryPanel'),'Scope Manage must keep settings, publishing and import as collapsed one-line disclosures');
must(statistics.includes('KeywordLibraryPanel')&&statistics.includes('canManageKeywords')&&statistics.includes("import Select from 'react-select'")&&statistics.includes("current==='keywords'")&&statistics.includes("ScopeStatisticsResults"),'authenticated keyword settings must use a mutually exclusive React Select workspace within Statistics');
must(!management.includes('ManagementDataPanel')&&!management.includes('LivePreview')&&!management.includes("value:'period'"),'Scope Manage must not recreate data browser, preview or period pages');
must(management.includes("canManage=scope?.aggregateChildren?account.canManageGlobalSync():account.canManageScopeSync(scopeId)"),'Scope Group Manage must use global authority without becoming Admin');
must(governance.includes("scopeHref(scopeId,'governance/manage')"),'Governance must link to Scope Manage');
must(!importPanel.includes('ManagementArticlePublisher')&&!importPanel.includes('role="tablist"')&&importPanel.includes('JsonImport')&&importPanel.includes('SourceRefresh'),'Data Import must contain import tools only');
must(scopeSettings.includes('display_name')&&scopeSettings.includes('search_intro')&&scopeSettings.includes('search_aliases')&&scopeSettings.includes('updateRows'),'misc settings must edit Scope-owned presentation config');
must(publisher.includes('scope-publisher-main')&&publisher.includes('scope-publisher-sidebar')&&publisher.includes('BlockNoteEditor')&&publisher.includes('content_blocks'),'article publisher must use shared BlockNote while preserving plain content');
must(blockNoteEntry.includes("dynamic(()=>import('./BlockNoteEditorClient')")&&blockNoteEntry.includes("from './blocknote-content.mjs'")&&!blockNoteEntry.includes('contentEditable')&&!blockNoteEntry.includes('execCommand'),'BlockNote must be the only shared lazy-loaded editor entrypoint');
must(blockNoteContent.includes('plainTextToBlocks')&&blockNoteContent.includes('blocksToPlainText')&&blockNoteContent.includes('normalizeBlocks'),'BlockNote converters must remain independent of React');
must(blocksToPlainText(plainTextToBlocks('第一段\n第二段'))==='第一段\n第二段','BlockNote converter must preserve paragraph boundaries');
must(normalizeBlocks({html:'<p>原始文字</p>'}).html==='<p>原始文字</p>','BlockNote must preserve legacy HTML hydration');
must(Array.isArray(normalizeBlocks([{type:'paragraph',content:'字'}])),'BlockNote must accept existing content_blocks JSON');
must(!fs.existsSync(path.join(root,'app/loc/RichBlockEditor.jsx')),'retired RichBlockEditor must be removed');
must(blockNoteEditor.includes("from '@blocknote/react'")&&blockNoteEditor.includes("from '@blocknote/mantine'")&&blockNoteEditor.includes('BlockNoteView')&&!blockNoteEditor.includes('uploadFile'),'BlockNote must be the shared URL-only text/media authoring surface');
must(blockNoteEditor.includes('getSelectedLinkUrl')&&blockNoteEditor.includes('createLink')&&blockNoteEditor.includes('移除連結'),'BlockNote must expose explicit hyperlink editing controls');
must(blockNoteEditor.includes('圖片網址')&&blockNoteEditor.includes('imageBlockForUrl')&&blockNoteEditor.includes('canInsertImage'),'BlockNote must allow remote image URL insertion with the current frame quota');
must(blockNoteEntry.includes('canInsertImage={canInsertImage}')&&editableBlocks.includes('frameImageCount(draft)')&&editableBlocks.includes('embeddedImages>1')&&editableBlocks.includes('canInsertImageIn('),'page frames may contain at most one remotely linked image across all body and child fields');
must(editableBlocks.includes('Hero 圖片位置（背景或旁邊，二選一）')&&editableBlocks.includes('image_mode')&&locHomeBlock.includes('heroImageMode(slot)')&&locHomeBlock.includes('authorHomeBlockClass'),'Hero background or side is a persisted exclusive choice shared by LOC and author homepages');
must(locHomeBlock.includes('loc-home-block__media-bubble')&&locHomeBlock.includes('(media||customImage)?')&&locHomeBlock.includes("5:{src:{src:'/pics/lo3rwang-3.png'}"),'non-Hero preset images must be contained image bubbles and never duplicate custom images');

must(editableBlocks.includes('<BlockNoteEditor')&&publisher.includes('<BlockNoteEditor')&&sharedSearch.includes('<BlockNoteEditor')&&cultureUi.includes('plainTextToBlocks'),'all inline, longform and media editors must use BlockNote');
for(const [file,body] of [['app/modular/ui.jsx',read('app/modular/ui.jsx')],['app/loc/ManagementArticlePublisher.jsx',publisher],['app/modular/features/Search.jsx',sharedSearch],['app/modular/features/Culture.jsx',cultureUi],['app/loc/ScopeEditableBlocks.jsx',editableBlocks]])must(!body.includes('RichBlockEditor'),file+' must not refer to retired RichBlockEditor');
must(editableBlocks.includes('ENTITY_LIMIT=6')&&editableBlocks.includes("page='index'")&&editableBlocks.includes('page_name')&&editableBlocks.includes('block_entity')&&editableBlocks.includes("column:'uid'")&&editableBlocks.includes('isInteractiveTarget'),'Scope page editing must use stable block uid plus up to six child entities');
must(['block_eyebrow','block_title','block_subtitle','block_text'].every(col=>editableBlocks.includes(col)&&scopeData.includes(col)),'Scope blocks must read and edit four canonical header/body columns');
must(editableBlocks.includes('childPresentation(entity.title)')&&editableBlocks.includes('不用標題（文字泡泡）')&&!editableBlocks.includes('entity.kind'),'title-free child bubble and titled child card must use implicit kind, without a type selector');
must(locHomeBlock.includes('slot.subtitle')&&authorHomeEditable.includes('renderDisplay={AuthorHomeBlockDisplay}'),'LOC and Author heading displays must use the dedicated rich subtitle');
must(portableSchema.includes('"block_eyebrow"')&&portableSchema.includes('"block_subtitle"')&&scopeProvisioning.includes('like silver.lo3rwang_blocks including all'),'portable and future scope table contracts must include standard block header columns');

must(editableBlocks.includes('儲存失敗：')&&editableBlocks.includes('scope-inline-save-status')&&editableBlocks.includes('refetchQueries'),'page block saves must visibly report success/failure and refetch saved data');
must(editableBlocks.includes('dangerouslySetInnerHTML')&&!editableBlocks.includes('editable={false}'),'public page display must use static site markup; BlockNote is edit-only');
must(authorHome.includes('AuthorHomeEditableBlocks')&&!authorHome.includes('heroContent={<div'),'author homepage must render database blocks rather than hardcoded old homepage text');
must(authorHomeEditable.includes('scopeId="lo3rwang"')&&authorHomeEditable.includes('allowEditing')&&authorHomeEditable.includes('containerless')&&authorHomeEditable.includes('renderDisplay={AuthorHomeBlockDisplay}')&&authorHomeEditable.includes('resolveSlotClassName={authorHomeBlockClass}')&&!authorHomeEditable.includes('allowEditing={false}'),'author homepage must use LOC common frames with permission-gated DB editing');
must(locHomeBlock.includes('function SharedHomeBlockDisplay')&&locHomeBlock.includes('function AuthorHomeBlockDisplay')&&locHomeBlock.includes('const AUTHOR_MEDIA')&&authorHome.includes('loc-view loc-home'),'author and LOC homepages must share the identical frame and HTML layout with distinct preset images');
must(!authorHomeEditable.includes('AboutDisplay')&&!authorHomeEditable.includes('ProfessionalDisplay')&&!authorHomeEditable.includes('SoulsDisplay')&&!authorHomeEditable.includes('author-contact-layout'),'author homepage must not retain bespoke section renderers');
must(locHomeCss.includes('[data-loc-scope="lo3rwang"]')&&!locHomeCss.includes('.loc-next-main[data-loc-scope="loc"][data-loc-view="home"]'),'both homes must use the same scoped CSS without per-author overrides');
must(locHomeBlock.includes('loc-home-block__header')&&locHomeBlock.includes('loc-home-block__body')&&locHomeBlock.includes('loc-home-block__children')&&locHomeCss.includes('.loc-home-block__children'),'LOC homepage must use one consistent header/body/children contract');
must(locHome.includes('allowEditing')&&editableBlocks.includes("account.canManageGlobalSync()")&&editableBlocks.includes("scopeId==='loc'"),'LOC homepage must preserve permission-based BlockNote editing');
must(!locHome.includes('LocFeatureHeroManagement')&&!fs.existsSync(path.join(root,'app/loc/LocFeatureHeroManagement.jsx')),'the detached four-feature title manager must not exist on the LOC homepage');
must(!featureUi.includes('editEyebrow={false}')&&featureUi.includes("eyebrow={slot.stored?slot.eyebrow:''}")&&featureUi.includes("eyebrow={shared?.eyebrow||''}")&&sharedFeatureHero.includes("eyebrow:String(row.block_eyebrow||'').trim()"),'four feature-page headers must expose the same editable canonical English eyebrow to LOC and other Scopes');
must(featureUi.includes('locEditableHero?<ScopeEditableBlocks')&&featureUi.includes('slotTag="header"')&&featureUi.includes('page={FEATURE_HERO_PAGE}')&&featureUi.includes('orders={[FEATURE_HERO_ORDER[featureId]]}')&&featureUi.includes('renderDisplay={slot=><FeatureHeroContent')&&featureUi.includes('allowDelete={false}')&&featureUi.includes('allowEntities={false}'),'LOC four function pages must edit their visible first/header frame through the existing BlockNote, without a separate manager');
must(editableBlocks.includes("const SlotTag=slotTag==='header'?'header':'section'")&&editableBlocks.includes('onClickCapture={canEdit&&!active?event=>')&&editableBlocks.includes("account.canManageGlobalSync()"),'shared block editor must render a semantic clickable heading with global manager permission');
must(sharedFeatureHero.includes("scopeId!=='lrunes'")&&featureUi.includes("shouldUseSharedFeatureHero(scopeId,featureId)")&&featureUi.includes("selectScopeBlocks('loc',FEATURE_HERO_PAGE)")&&featureUi.includes("sharedFeatureHeroFor(sharedQuery.data,featureId)"),'non-LOC feature pages read LOC hero content while LunaRunes stays unchanged');
must(featureUi.includes("data-feature-hero-source={shared?'loc':'default'}"),'feature header should expose shared DB origin for automated testing');

must(locHome.includes('maxBlocks={8}')&&locHome.includes('placeholderFirstOrder={1}')&&locHome.includes('containerless')&&locHome.includes('renderDisplay={LocHomeBlockDisplay}')&&locHomeBlock.includes("order===1?'loc-hero loc-home-hero'")&&locHomeBlock.includes('SITE_IMAGES.locHero'),'LOC homepage must print up to 8 ordered frames, with Hero background only for order 1');

must(HOME_BLOCK_LIMIT===8&&homeBlockRows([
  {uid:'A',page_name:'index',block_order:4},
  {uid:'B',page_name:'index',block_order:1},
  {uid:'C',page_name:'other',block_order:3},
  {uid:'D',page_name:'index',block_order:8},
  {uid:'E',page_name:'index',block_order:9}
]).map(row=>row.uid).join(',')==='B,A,D','Home page/order must drive display; reject other pages and >8 and render in order');
const colFixture={
  eyebrow:'System Status',title:'系統狀態',subtitle:'<p>系統簡介</p>',
  text:'<h2>目前文字作品</h2><p>已整理</p><h2>系統架構</h2><p>技術模組</p>',
  entities:[
    {uid:'a',title:'',text:'<p>Next.js</p>'},
    {uid:'b',title:'',text:'<p>vis-timeline</p>'},
    {uid:'c',title:'',text:'<p>Zod</p>'},
    {uid:'d',title:'',text:'<p></p>'}
  ]
};
must(visibleHomeEntities(colFixture).map(entity=>entity.uid).join(',')==='a,b,c','LOC status must show all populated child items in DB order and hide only empty placeholders');
must(visibleHomeEntities({...colFixture,entities:[{uid:'copy',title:'',text:colFixture.text}]}).length===0,'legacy duplicate whole-body child must not print twice');
must(locHomeBlock.includes('visibleHomeEntities(slot)')&&locHomeBlock.includes('dangerouslySetInnerHTML')&&!locHomeBlock.includes('splitStatusContentSections')&&!locHomeBlock.includes('paragraphParts')&&!locHomeBlock.includes('entityAt('),'LOC read-only display must preserve all BlockNote HTML without rewriting or hardcoded data indexes');
must(!fs.existsSync(path.join(root,'app/loc/LocHomeEditableBlock.jsx'))&&!locHome.includes('LocHomeEditableBlock'),'retired multi-renderer homepage module must be gone');
must(editableBlocks.includes('containerless?contents:')&&editableBlocks.includes('resolveSlotClassName(slot)')&&editableBlocks.includes('homeBlockRows(rows,pageName,maxBlocks)'),'Home must create only one DOM section per DB row without nested layout wrappers');
must(editableBlocks.includes('displayed.push(normalizeRow(null,placeholderFirstOrder))')&&locHomeBlock.includes('home-hero-visual'),'Hero responsive image must be rendered statically even before the DB content loads');
must(!locHomeCss.includes('display:contents')&&!locHomeCss.includes('!important'),'Homepage CSS must not rely on wrapper-hiding or cascade override hacks');

must(!runesHome.includes('ScopeEditableBlocks')&&runesHome.includes('className="basic-grid"'),'LunaRunes homepage must remain a fixed special presentation without inline management editing');
must(personalGovernance.includes('ScopeEditableBlocks')&&personalGovernance.includes('page="governance"'),'personal governance must use governance block rows');
must(runesGovernance.includes('ScopeEditableBlocks')&&runesGovernance.includes('page="governance"'),'LunaRunes governance must use governance block rows');
must(sharedSearch.includes('startEditing')&&sharedSearch.includes('BlockNoteEditor')&&sharedSearch.includes('GALAXY_EDITOR_COLUMNS')&&sharedSearch.includes('GalaxyAttrSummary')&&sharedSearch.includes('GalaxyAttrEditor')&&sharedSearch.includes("fullTextKey===row.key")&&sharedSearch.includes('updateRows'),'Search must open full Galaxy articles first, then expose permission-gated full Attr editing');
must(cultureUi.includes('<CultureStyleTagsEditor')&&cultureUi.includes('onSaved={refreshTimelineData}')&&visualStyleTags.includes('CultureStyleTagsField')&&visualStyleTags.includes('updateRows(table,')&&visualStyleTags.includes('style_tag_descriptions'),'Culture period style tags must edit visible chips and save their canonical Time attrs');
must(culture.includes('visibility,style_tags,style_tag_descriptions')&&culture.includes('record_id:row.record_id')&&culture.includes('style_tag_descriptions:row.style_tag_descriptions'),'Culture periods must expose original record ID and searchable style introduction metadata');
must(cultureUi.includes('beginTimelineCreation')&&cultureUi.includes('pickingAnchorSlot')&&cultureUi.includes('selectedAnchorPick={pickedAnchor}')&&editor.includes('從時間長河選擇')&&editor.includes('<CultureStyleTagsField'),'Culture WYSIWYG must create Time entries through the timeline and pick anchor_ids[] directly from plotted anchors');
must(nativeTimeline.includes('new Timeline(')&&['onAdd:','onMove:','onUpdate:','onRemove:','add:Boolean(onAddRef.current)','onTimeClickRef.current'].every(token=>nativeTimeline.includes(token)),'Time manipulation must retain vis-timeline edits and make add opt-in to avoid river gesture collisions');

must(cultureUi.includes('snapTimelineRangeToAnchors')&&nativeTimeline.includes("row.entryType==='period'")&&nativeTimeline.includes("row.entryType==='event'"),'Native vis-timeline must edit anchored period and event ranges without storing independent dates');
const anchorFixture=[
  {entry_type:'anchor',resource_id:'a',date_status:'exact',start_date:'2024-01-01'},
  {entry_type:'anchor',resource_id:'b',date_status:'exact',start_date:'2024-03-01'},
  {entry_type:'anchor',resource_id:'c',date_status:'exact',start_date:'2024-04-01'},
  {entry_type:'anchor',resource_id:'d',date_status:'exact',start_date:'2024-05-01'}
];
const snappedPeriod=snapTimelineRangeToAnchors({start:'2024-01-02',end:'2024-03-31'},{entryType:'period',raw:{anchor_ids:['a','b']}},anchorFixture);
must(snappedPeriod.anchor_ids.join(',')==='a,c'&&snappedPeriod.item.end==='2024-03-31','period range drag must snap to exclusive-end anchor without changing row dates');
const snappedEvent=snapTimelineRangeToAnchors({start:'2024-01-01',end:'2024-04-01'},{entryType:'event',raw:{anchor_ids:['a','b']}},anchorFixture);
must(snappedEvent.anchor_ids.join(',')==='a,c'&&snappedEvent.item.end==='2024-04-01','event range drag must snap inclusive end to actual anchor');
let duplicateAnchorRejected=false;
try{snapTimelineRangeToAnchors({start:'2024-04-01',end:'2024-03-31'},{entryType:'period',raw:{anchor_ids:['a','b']}},anchorFixture);}catch{duplicateAnchorRejected=true}
must(duplicateAnchorRejected,'period bounds must reject duplicate or reversed anchor ranges');

must(cultureUi.includes('CultureTimelineEditor')&&cultureUi.includes('selectedTimelineRecordId')&&cultureUi.includes('editable={account.canManageScopeSync(scopeId)}')&&cultureUi.includes('onMove={account.canManageScopeSync(scopeId)?moveTimelineRecord:null}')&&cultureUi.includes('onRemove={account.canManageScopeSync(scopeId)?removeTimelineRecord:null}'),'Culture first timeline must use native vis-timeline manipulation for authenticated period/anchor CRUD');
must(admin.includes("insertRows('silver.manage'")&&admin.includes("deleteRows('silver.manage'"),'Admin Registry node panel must add/remove Manage mappings');
must(admin.includes('DeploymentTree')&&admin.includes('vis-network/standalone')&&admin.includes("onMoveParent"),'Admin must manage Scope Registry through a draggable vis-network tree');
must(admin.includes("{id:'__admin__',label:'Admin',shape:'box',fixed:true}")&&!admin.includes("shape:'box',level:0")&&admin.includes('layout:{hierarchical:{enabled:true'),'Admin hierarchical graph must not mix explicit node levels with unlevelled registry nodes');
must(!admin.includes("react-select")&&!admin.includes('<Select')&&admin.includes('admin-native-select'),'Admin must use native select controls instead of react-select');
must(['群組人員管理','資料庫設定','主題設定'].every(label=>admin.includes("label:'"+label+"'"))&&!admin.includes("value:'search'")&&!admin.includes('SearchKeywordReport'),'Admin primary menu must stay concise Chinese system settings without a redundant search query report');
must(!admin.includes('applyTheme(')&&admin.includes('admin-theme-local-preview')&&admin.includes('正在編輯的主題（只修改草稿，不影響網站配色）'),'Admin Theme draft and preview must never mutate the live document root theme on entry or edit');
must(admin.includes('admin-registry-fallback')&&admin.includes('圖形樹載入失敗，已切換清單模式。')&&admin.includes('setTreeError'),'Scope Registry must provide a visible fallback instead of failing blank');
must(admin.includes('syncManageScopeRow(')&&admin.includes("role:'scope'"),'Admin Scope node must edit Manage mapping atomically and keep role=scope fixed');
must(admin.includes('部分 Scope 設定讀取失敗')&&admin.includes('configFailures.push')&&admin.includes("if(error)throw new Error(error.message||'Scope config 讀取失敗。')"),'Admin Scope config failures must be surfaced, not swallowed');
must(admin.includes('provisionScope(')&&admin.includes('＋ Scope')&&admin.includes('＋ Group'),'Admin Registry must create Scope and Scope Group from the tree workspace');
must(scopeProvisioning.includes("create table silver.%I (like silver.lo3rwang_blocks including all)")&&!scopeProvisioning.includes('block_page')&&scopeProvisioning.includes("enable row level security',v_blocks_name"),'new Scope Blocks must clone current UID/page_name/entity contract and enable RLS');
must(scopeProvisioning.includes('New Scopes start with no content rows.')&&!scopeProvisioning.includes('generate_series(1,4)'),'new Scope must not pre-populate blank homepage/governance frames');

must(admin.includes("dbAuthRelation('silver.scope_registry')")&&admin.includes('parent_scope_id'),'Admin must read the DB Scope Registry hierarchy');
must(admin.includes("silver.database_targets")&&admin.includes('Database Target')&&admin.includes('Project ID'),'Admin must persist explicit Supabase/Neon migration targets');
must(admin.includes("silver.loc_theme")&&admin.includes('theme_attr')&&admin.includes('THEME_TOKEN_KEYS')&&admin.includes('type="color"'),'Admin Theme editor must persist all editable theme attrs in loc_theme');
must(dbContract.includes("schema('silver').rpc('management_write'")&&dbContract.includes('batchSize=200')&&!dbContract.includes("schema('api').rpc("),'client RPC calls must use exposed silver wrappers with bounded insert batches');
must(dbContract.includes('`silver.${scope}_keywords`')&&!dbContract.includes("api.lo3rwang_keywords_manage"),'keyword library writes must resolve the current Scope keyword table');
must(dbContract.includes('copyKeywordLibraryClass')&&keywordLibrary.includes('copyKeywordLibraryClass'),'keyword library must support copying a complete independent Class');
must(dbContract.includes('syncManageScopeRow')&&dbContract.includes("p_operation:'scope_sync'"),'Scope mapping updates must use one atomic management write');
must(dbContract.includes('affected 0 rows')&&dbContract.includes('affected!==batch.length'),'management write helpers must reject zero-row updates/deletes and incomplete inserts');
must(scopeData.includes("keywords:`silver.${id}_keywords`")&&scopeData.includes("blocks:`silver.${id}_blocks`")&&scopeData.includes('selectScopeGroupChildren')&&scopeData.includes('display_name,search_intro,search_aliases,theme,locale'),'Scope data must resolve Keywords, block tables, DB hierarchy and Scope-owned presentation');
must(scopeGroup.includes('selectScopeGroupChildren(scopeId)')&&scopeGroup.includes('parent_scope_id'),'Scope Group management must read DB parent/child membership');
must(admin.includes("if(mappingResult.error)throw new Error(mappingResult.error.message||'Mapping 讀取失敗。')")&&admin.includes("if(registryResult.error)throw new Error(registryResult.error.message||'Scope Registry 讀取失敗。')")&&admin.includes("setStatus(error?.message||'Admin 資料讀取失敗。')"),'Admin mapping/registry read rejections must surface in the UI');
must(keywordLibrary.includes('class_name')&&keywordLibrary.includes('class_group')&&keywordLibrary.includes('class_enable')&&keywordLibrary.includes('item_name')&&keywordLibrary.includes('principle')&&keywordLibrary.includes('keywords_text'),'keyword library editor must edit self-contained Class, Group, participation, item, principle and one keyword collection together');
must(keywordLibrary.includes("dynamic(()=>import('./KeywordNetworkEditor')")&&keywordLibrary.includes("workspace==='manual'")&&keywordLibrary.includes("workspace==='network'")&&keywordNetwork.includes("import('vis-network/standalone')")&&keywordNetwork.includes('manipulation:')&&keywordNetwork.includes('addNode:')&&keywordNetwork.includes('editNode:')&&keywordNetwork.includes('deleteNode:'),'keyword library must expose manual editing without mounting its lazy vis-network workspace');
must(!keywordLibrary.includes('keyword_group')&&!keywordLibrary.includes("node_type:'style'")&&!keywordLibrary.includes("node_type:'keyword'"),'keyword library editor must not recreate style/rule/node-type storage');
must(keywordLibrary.includes('scopeData=account.scopeDataFor(scopeId)')&&keywordLibrary.includes('keyword_min_chars')&&keywordLibrary.includes('keyword_min_documents'),'keyword analysis thresholds must resolve from the current Scope');
must(keywordLibrary.includes('current_keyword_class_id')&&keywordLibrary.includes('keyword_class_share_enabled')&&keywordLibrary.includes('Class UUID'),'keyword library must expose current Class UUID and Scope sharing control');
must(keywordLibrary.includes('重新分析並寫入文章 Attr')&&keywordLibrary.includes('runRune66ClassificationBatch'),'keyword management must expose explicit batch classification instead of live recalculation');
must(dbContract.includes("rpc('apply_keyword_classification'")&&dbContract.includes('p_scope_id:scope')&&dbContract.includes('silver.keyword_classes')&&dbContract.includes('randomUUID'),'keyword classification writes and copied Classes must be Scope-aware and use the UUID registry');
must(dbContract.includes("rpc('read_keyword_class'")&&portableSchema.includes('api.read_keyword_class')&&portableSchema.includes('keyword_class_share_enabled'),'shared Keyword Class resolution must require scope + UUID and obey Scope sharing authorization');
must(!portableSchema.includes('GRANT SELECT ON "silver"."lo3rwang_keywords" TO "anonymous"'),'private keyword contents must not be anonymously enumerable');
must(keywordAnalysis.includes('DEFAULT_KEYWORD_MIN_CHARS=32')&&keywordAnalysis.includes('DEFAULT_KEYWORD_MIN_DOCUMENTS=100'),'keyword batch must retain >32 article and >100 statistics thresholds');
must(keywordAnalysis.includes('analysisCharacterCount(row?.content)>minChars'),'keyword classification must gate on non-whitespace body characters');
must(keywordAnalysis.includes("columns:'uid,createtime,class_id,group_lists'"),'public keyword Statistics/Culture must read stored article attrs');
must(keywordAnalysis.includes('dynamicTieCount')&&keywordAnalysis.includes('counts.get(candidate)'),'complete keyword ties must use dynamic current Class counts');
must(portableSchema.includes("group_lists='false'::jsonb")&&keywordAnalysis.includes('group_lists:result?.group_lists||{}'),'keyword attrs must reset excluded rows to false and store eligible no-hit rows as objects');
must(portableSchema.includes('"lrunes_galaxy_class_id_check"')&&portableSchema.includes('"lrunes_galaxy_group_lists_shape_check"'),'all managed Galaxy schemas must keep class_id/group_lists parity');
must(dbContract.includes("mode:'begin'")&&dbContract.includes("mode:'chunk'")&&dbContract.includes("mode:'finalize'")&&dbContract.includes('batchSize=500'),'keyword attr writes must reset, write bounded chunks, then finalize staticstime');
must(!keywordAnalysis.includes('PERSONAL_KEYWORD_TABLE')&&keywordAnalysis.includes('`silver.${scope}_keywords`'),'keyword classification must read the current Scope private keyword library');
must(dbContract.includes("rpc('provision_scope'")&&dbContract.includes('provisionScope'),'DB client must expose the transactional Scope provisioning RPC');
must(scopeProvisioning.includes('create table if not exists silver.scope_registry')&&scopeProvisioning.includes('create or replace function api.provision_scope'),'Scope provisioning SQL must define the DB registry and provisioning RPC');
for(const suffix of ["_galaxy'","_galaxy_media'","_time'","_keywords'"])must(scopeProvisioning.includes(suffix),'Scope provisioning SQL missing fixed table suffix '+suffix);
must(scopeProvisioning.includes('v_keyword_count<>66')&&scopeProvisioning.includes('p_parent_scope_id'),'Scope provisioning must lock the Rune66 default copy and parent Scope Group');
must(scopeProvisioning.includes("v_blocks_name := v_scope||'_blocks'")&&scopeProvisioning.includes('like silver.lo3rwang_blocks including all')&&portableSchema.includes('"loc_blocks"')&&portableSchema.includes('"lo3rwang_blocks"')&&portableSchema.includes('"lrunes_blocks"'),'Scope provisioning/schema must store page blocks by uid with nested entities');
must(portableSchema.includes('"content_blocks" jsonb'),'Galaxy schema must preserve optional rich-editor layout separately from plain content');
must((portableSchema.match(/"content_blocks" jsonb/g)||[]).length>=4,'Galaxy and Galaxy Media schemas must both persist BlockNote structure');
must(portableSchema.includes('"loc_theme"')&&portableSchema.includes('"theme_attr" jsonb')&&portableSchema.includes('"database_targets"'),'portable schema must include loc_theme attributes and database targets');
must(portableSchema.includes('FUNCTION silver.management_write')&&portableSchema.includes('FUNCTION silver.provision_scope')&&portableSchema.includes('FUNCTION silver.manage_scope_registry'),'portable schema must expose application RPC wrappers through silver');

must(dbContract.includes("rpc('manage_scope_registry'")&&dbContract.includes('manageScopeRegistry'),'DB client must expose authorized Scope Registry management');
must(admin.includes('CreateNodePanel')&&admin.includes("manageScopeRegistry('update'")&&admin.includes("manageScopeRegistry('create_group'"),'Admin tree workspace must edit Registry hierarchy and create Scope Groups');
must(registrySql.includes('create or replace function api.manage_scope_registry')&&registrySql.includes('Scope Group parent would create a cycle'),'Scope Registry SQL must enforce global authorization and cycle-safe hierarchy');
must(scopeRuntime.includes("pathname==='/scope'||pathname.startsWith('/scope/')")&&scopeRuntime.includes('selectScopeRegistryEntry'),'generic Scope runtime must resolve DB registry entries through the fixed static shell');
must(scopeRegistry.includes("GENERIC_SCOPE_PATH='/scope'")&&scopeRegistry.includes("params.set('scope',id)"),'unknown DB Scope links must route through the generic static shell');
must(importPanel.includes('function SourceRefresh')&&importPanel.includes("source_native_id")&&importPanel.includes(".eq('source_name',selected)")&&importPanel.includes("offset+=200"),'Source Refresh must use bounded source_name + source_native_id delta queries instead of full-table scans');
must(sourceRefreshIndex.includes('(source_name,source_native_id)')&&sourceRefreshIndex.includes('where source_name is not null and source_native_id is not null'),'Source Refresh lookup must keep the composite partial index contract');
must(importPanel.includes('record.createtime||current.createtime||null')&&importPanel.includes('record.source_place||current.source_place||null')&&importPanel.includes('record.url||current.url||null'),'Source Refresh must preserve optional existing metadata when the payload omits it');

must(!/silver\.runes(?:_etc)?\b/.test(galaxy),'generic Galaxy/Search provider must not expose private Rune Core tables');
must(!/runeScopeIds|silver\.runes(?:_etc)?\b/.test(sharedSearch),'shared Search must stay Scope-data only');
must(sharedSearch.includes('matchesScopeAlias')&&sharedSearch.includes('scope.searchIntro')&&sharedSearch.includes("label:'前往 Scope 首頁'")&&sharedSearch.includes('return;'),'exact Scope aliases must use Scope-owned presentation and stop the search');
must(sharedSearch.includes('selectStyleKeywordIntroductions')&&sharedSearch.includes('[...styleIntroductions,...enrichedRows]'),'style keyword descriptions must precede ordinary related results');

if(failures.length){
  console.error('[management-contract] verification failed');
  failures.forEach(item=>console.error(' - '+item));
  process.exit(1);
}
console.log('[management-contract] flat Manage, Statistics keywords, block tables, loc_theme and Admin separation verified');
