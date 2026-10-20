import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CultureTimelineModel} from '../app/modular/modules/culture-timeline/culture-timeline-model.js';
import {blocksToPlainText,looksLikeMarkdown,normalizeBlocks,plainTextToBlocks} from '../app/loc/blocknote-content.mjs';
import {HomeBlock} from '../app/loc/home-block-model.js';
import {importRowsFromJson,mappedImportValue} from '../app/loc/import-batch.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const failures=[];
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const must=(condition,message)=>{if(!condition)failures.push(message);};

const galaxy=read('app/loc/galaxy-query.js');
const culture=read('app/loc/culture-query.js');
const cultureUi=read('app/modular/features/Culture.jsx');
const editor=read('app/modular/features/CultureTimelineEditor.jsx');
const nativeTimeline=read('app/modular/modules/culture-timeline/CultureTimeline.jsx');
const management=read('app/loc/GovernanceManagement.jsx');
const globalSettings=read('app/loc/GlobalSettings.jsx');
const governance=read('app/modular/features/Governance.jsx');
const statistics=read('app/modular/features/Statistics.jsx');
const admin=read('app/loc/views/AdminHomeView.jsx');
const adminDatabasePanel=read('app/loc/views/admin-panels/DatabaseTarget.jsx');
const adminThemePanel=read('app/loc/views/admin-panels/ThemeEditor.jsx');
const adminBlocklistPanel=read('app/loc/views/admin-panels/AdminEmailBlocklist.jsx');
const dbContract=read('app/loc/db-contract.mjs');
const contentPolicy=read('app/loc/content-policy.js');
const keywordLibrary=read('app/loc/KeywordLibraryPanel.jsx');
const keywordNetwork=read('app/loc/KeywordNetworkEditor.jsx');
const keywordAnalysis=read('app/loc/rune66-keyword-analysis.js');
const scopeData=read('app/loc/scope-data.js');
const scopeGroup=read('app/loc/ScopeGroupManagement.jsx');
const locApp=read('app/loc/LocApp.jsx');
const groupOverview=read('app/loc/ScopeGroupOverview.jsx');
const genericHome=read('app/loc/views/GenericScopeHomeView.jsx');
const scopeRuntime=read('app/modular/use-scope-runtime.js');
const scopeRegistry=read('app/modular/scope-registry.js');
const importPanel=read('app/loc/ManagementImportPanel.jsx');
const sunoImport=read('app/loc/SunoImportPanel.jsx');
const scopeSettings=read('app/loc/ScopeSettingsPanel.jsx');
const publisher=read('app/loc/ManagementArticlePublisher.jsx');
const blockNoteEntry=read('app/loc/BlockNoteEditor.jsx');
const articleListItem=read('app/modular/Article.jsx');
const blockNoteContent=read('app/loc/blocknote-content.mjs');
const blockNoteEditor=read('app/loc/BlockNoteEditorClient.jsx');
const editableBlocks=read('app/loc/ScopeEditableBlocks.jsx');
const editableSession=read('app/loc/ScopeBlockEditorSession.jsx');
const authorHome=read('app/loc/views/AuthorHomeView.jsx');
const authorHomeEditable=read('app/loc/AuthorHomeEditableBlock.jsx');
const locHomeBlock=read('app/loc/LocHomeBlockDisplay.jsx');
const locHomeCss=read('app/styles/loc-about-original.css');
const locHome=read('app/loc/views/AboutView.jsx');
const sharedFeatureHero=read('app/loc/home-block-model.js');
const featureUi=read('app/modular/ui.jsx');
const runesHome=read('app/lrunes/RunesClient.jsx');
const sharedSearch=read('app/modular/features/Search.jsx');

// Verify current runtime boundaries, not checked-in database patches. CI's
// verify:db-public covers the actual Supabase Data API and public visibility.
const runtimePorts=read('app/loc/providers/kysely-runtime.mjs');
const edgeServer=read('supabase/functions/loc-kysely/index.ts');
const liveProbe=read('scripts/verify-db-public-read.mjs');
const zhUi=JSON.parse(read('app/i18n/zh_tw.json'));
const uiTextIds=label=>Object.entries(zhUi.uiExtra).flatMap(([section,entries])=>
  Object.entries(entries).filter(([,value])=>value===label).map(([key])=>'uiExtra.'+section+'.'+key));
const uiTextInside=(source,tag,label)=>uiTextIds(label).some(id=>
  source.includes('<'+tag+'><UiText id="'+JSON.stringify(id).slice(1,-1)+'"/></'+tag+'>'));
const functionalLabel=(source,tag,label)=>source.includes('<'+tag+'>'+label+'</'+tag+'>')||
  source.includes('<'+tag+'><FieldText text="'+label+'"/></'+tag+'>')||uiTextInside(source,tag,label);
const functionalOption=(source,value,label)=>source.includes("<option value='"+value+"'>"+label+"</option>")||
  source.includes("<option value='"+value+"'><FieldText text=\""+label+"\"/></option>")||
  uiTextIds(label).some(id=>source.includes("<option value='"+value+"'><UiText id=\""+id+"\"/></option>"));
const functionalButton=(source,onClick,label)=>source.includes('onClick={'+onClick+'}>'+label+'</button>')||
  source.includes('onClick={'+onClick+'}><FieldText text="'+label+'"/></button>')||
  uiTextIds(label).some(id=>source.includes('onClick={'+onClick+'}><UiText id="'+id+'"/></button>'));

for(const name of ['provision_scope','manage_scope_registry','apply_keyword_classification','read_keyword_class']){
  must(runtimePorts.includes("'silver."+name+"'")&&dbContract.includes("rpc('"+name+"'"),
    name+' must remain available through authorized Kysely and Data API modules');
}
must(dbContract.includes('copyKeywordLibraryClass')&&dbContract.includes("rpc('read_keyword_class'"),
  'private and shared Keyword Class operations must remain explicitly scoped');
must(contentPolicy.includes('export function assertPlainGalaxyAttributes(')&&
  dbContract.includes("import {assertPlainGalaxyAttributes} from './content-policy.js'")&&
  dbContract.includes('for(const row of list)validateGalaxyWrite(table,row)')&&
  dbContract.includes('validateGalaxyWrite(table,values)')&&
  !fs.existsSync(path.join(root,'app/loc/galaxy-attr-plain-text.mjs')),
  'Galaxy metadata validation must be consolidated in existing content-policy and shared DB writes, without an extra editor or validator module');
must(edgeServer.includes('auth.getUser(token)')&&edgeServer.includes('set local role authenticated'),
  'trusted Edge writes must retain authenticated execution');
must(liveProbe.includes('verifyManagedScope(client,scope)')&&liveProbe.includes('probe(client,scope.galaxy,galaxyColumns)'),
  'release public database probe must cover each managed Galaxy without a full private-row scan');
must(editableBlocks.includes('block_eyebrow')&&editableBlocks.includes('block_subtitle')&&
  scopeData.includes('block_eyebrow')&&scopeData.includes('block_subtitle'),
  'future Scope blocks must retain four canonical header/body fields');
must(!importPanel.includes('source_native_id')&&importPanel.includes("offset+=200"),
  'source refresh must avoid removed identity fields');
must(keywordAnalysis.includes(`group_lists:result?.group_lists??''`)&&
  dbContract.includes("mode:'begin'")&&dbContract.includes("mode:'finalize'"),
  'keyword attr writes must preserve safe batch lifecycle');

must(!galaxy.includes('include_in_time'),'generic search must not query nonexistent include_in_time');
must(galaxy.includes("searchFields:['label','note','status','style_description']")&&!galaxy.includes("'style_tags'"),'Search uses dedicated TEXT style body and no comma tags');
must(culture.includes("value:['anchor','period','event','style_comment']"),'Culture reads independent style comments');
must(editor.includes("['style_comment','style']")&&!editor.includes('style_tags')&&!cultureUi.includes('CultureStyleTagsEditor'),'Fourth style comment must use the shared Time editor, not legacy tag fields or a separate editor');
must(cultureUi.includes('<Article')&&cultureUi.includes('editable={canEditWork}')&&!cultureUi.includes('actions={canEditWork?')&&!cultureUi.includes('onClick={canEditWork'),'Culture articles must use shared Article(uid) click editing without an Edit button');
must(galaxy.includes('selectStyleKeywordMatches')&&!galaxy.includes('scopeCards('),'Search must match exact style-tag keywords and must not use partial Scope-ID cards');
must(management.includes('<ScopeGroupManagement scopeId="loc"/>')&&management.includes("routeScopeId==='loc'&&canManageGlobal"),'Website group membership is permission-gated in LOC Governance, not device Settings');
must(governance.includes("navigationHref(scopeId,'governance/manage',native)")&&governance.includes('account.canManageScopeSync(scopeId)')&&globalSettings.includes("native?[option('manage',uiT('uiExtra.globalSettings.manageMenu'))]"),'Each Scope routes to its own Governance; native-only management stays on the device');
must(management.includes('href="/settings/?section=account"')&&management.includes('if(!account.user)')&&management.includes('canManageHere=account.canManageScopeSync(routeScopeId)')&&!management.includes('account.signIn(')&&globalSettings.includes('account.signIn(new URL('),'management must hand unauthenticated users to Settings OAuth and keep Scope permission gates');
must(management.includes("dynamic(()=>import('./ScopeGroupManagement')"),'Website Scope Group management must load only in the Governance global section');
must(scopeRuntime.includes("aggregateChildren:activeRegistryRow.scope_kind==='group'")&&genericHome.includes('ScopeGroupOverview')&&sharedSearch.includes('ScopeGroupOverview'),'New DB Scope Groups must use the generic runtime and existing public overview');
must(locApp.includes("scopeMeta?.aggregateChildren&&scopeId!=='loc'")&&locApp.includes("['statics','culture','governance'].includes(forcedView)")&&locApp.includes('groupOverviewView?<FeaturePage')&&groupOverview.includes('selectScopeGroupChildren(scopeId)'),'Dynamic DB Groups must route Statistics/Culture/Governance to existing read-only member overview instead of LOC aggregate or nonexistent Group tables');
must(groupOverview.includes('navigationHref(row.scope_id')&&groupOverview.includes('useNativeNavigation')&&groupOverview.includes('selectScopeGroupChildren(scopeId)'),'Scope Group overview must direct users to child Scope queries without expensive group-wide counts');
must(globalSettings.includes('<ScopeSettingsPanel')&&globalSettings.includes('<ManagementImportPanel')&&
  globalSettings.includes("native&&activeSection==='manage'?<PrivateLocalFiles/>")&&
  !globalSettings.includes('<ManagementArticlePublisher')&&
  !globalSettings.includes('<ScopeGroupManagement')&&
  management.includes('<ManagementArticlePublisher')&&
  !globalSettings.includes('ManagementDisclosure'),
  'Web Settings keep Scope preferences/import; native-only Manage operates local files; website publishing stays in Governance');
const keywordPage=read('app/modular/features/KeywordSettings.jsx');
const keywordAuthorRoute=read('app/lo3rwang/statics/keywords/page.jsx');
const keywordGenericRoute=read('app/scope-shell/statics/keywords/page.jsx');
must(statistics.includes("scopeHref(scopeId,'statics/keywords')")&&statistics.includes('ScopeStatisticsResults')&&!statistics.includes('KeywordLibraryPanel')&&!statistics.includes("current==='keywords'"),'Statistics must link to a dedicated keyword management page without mounting keyword editor');
must(keywordPage.includes("dynamic(()=>import('../../loc/KeywordLibraryPanel')")&&keywordPage.includes('canManageScopeSync(scopeId)')&&keywordAuthorRoute.includes('forcedView="keywords"')&&keywordGenericRoute.includes('forcedView="keywords"')&&locApp.includes('keywords:KeywordSettings'),'all Scope keyword management must use a dedicated permission-gated static route');
must(!management.includes('ManagementDataPanel')&&!management.includes('LivePreview')&&!management.includes("value:'period'"),'Scope Manage must not recreate data browser, preview or period pages');
must(globalSettings.includes('account.canManageScopeSync(item.id)')&&globalSettings.includes('selectedScope')&&
  management.includes('canManageHere=account.canManageScopeSync(routeScopeId)'),
  'Web Settings select authorized Scope; Governance enforces authority of its own route');
must(governance.includes("navigationHref(scopeId,'governance/manage',native)")&&
  genericHome.includes("navigationHref(scopeId,'governance/manage',native)")&&
  read('app/governance/manage/page.jsx').includes('forcedView="manage"')&&
  read('app/lrunes/governance/manage/page.jsx').includes('forcedScope="lrunes"')&&
  read('app/lo3rwang/governance/manage/page.jsx').includes('forcedScope="lo3rwang"')&&
  locApp.includes('<ActiveView section={forcedSection} scopeId={scopeId}/>')&&
  read('app/settings/page.jsx').includes('<GlobalSettings'),
  'Scope Governance routes, website Settings and device-local management must retain separate entrypoints');
must(!importPanel.includes('ManagementArticlePublisher')&&!importPanel.includes('role="tablist"')&&importPanel.includes('JsonImport')&&importPanel.includes('SourceRefresh'),'Data Import must contain import tools only');
must(!importPanel.includes('content_type')&&!importPanel.includes('<ImportContentTypeCatalog')&&importPanel.includes('statistics_able:row.statistics_able'),'Import excludes redundant content types and preserves visibility');
must(importPanel.includes('ImportFormatSettings')&&importPanel.includes('format.recordPath')&&importPanel.includes('format.fields')&&importPanel.includes('writeImportBatches')&&importPanel.includes('progress.percent')&&importPanel.includes('uiExtra.importUI.nextJson'),'Import must configure source formats, write bounded batches, and report visible progress across queued files');
must(importRowsFromJson({payload:{entries:[{body:'字'}]}},'payload.entries').length===1,'Import format must select nested array paths');
must(mappedImportValue({data:{body:'甲'}},'content',{content:'data.body'})==='甲','Import mapping must read configured nested fields');

must(scopeSettings.includes('display_name')&&scopeSettings.includes('search_intro')&&scopeSettings.includes('search_aliases')&&scopeSettings.includes('updateRows'),'misc settings must edit Scope-owned presentation config');
must(admin.includes('admin-page-description:')&&admin.includes('admin-search-intro:')&&admin.includes('admin-search-aliases:')&&
  scopeSettings.includes('scope-intro:')&&scopeSettings.includes('scope-aliases:')&&
  keywordLibrary.includes('keyword-principle:')&&keywordLibrary.includes('keyword-lines:')&&
  editor.includes('timeline-note:')&&editor.includes('timeline-style:')&&
  sunoImport.includes('suno-lyrics:')&&sunoImport.includes('suno-style:')&&
  blockNoteEntry.includes('onPlainTextChange')&&
  [admin,scopeSettings,keywordLibrary,editor,importPanel,sunoImport].every(source=>!source.includes('<textarea')),
  'All Admin and management narrative text must reuse BlockNote; structured data retains native typed fields');

must(publisher.includes('scope-publisher-main')&&publisher.includes('scope-publisher-sidebar')&&publisher.includes('BlockNoteEditor')&&publisher.includes('draft.bodyHtml')&&!publisher.includes('content_blocks'),'article publisher must use shared BlockNote and persist its HTML in the existing content field');
must(sunoImport.includes("import {refreshSunoStyleMetaTags}")&&sunoImport.includes("refreshSunoStyleMetaTags(blocksToPlainText(blocks),current.metaTags)")&&sunoImport.includes("regenerateStyleTags")&&
  importPanel.includes("dynamic(()=>import('./SunoImportPanel')")&&importPanel.includes("sunoOpen?<SunoImport"),
  'Suno authoring must load on demand, preserve BlockNote and derive editable Style Meta Tags');
must(blockNoteEntry.includes("dynamic(()=>import('./BlockNoteEditorClient')")&&blockNoteEntry.includes("from './blocknote-content.mjs'")&&!blockNoteEntry.includes('contentEditable')&&!blockNoteEntry.includes('execCommand'),'BlockNote must be the only shared lazy-loaded editor entrypoint');
must(blockNoteContent.includes('plainTextToBlocks')&&blockNoteContent.includes('blocksToPlainText')&&blockNoteContent.includes('normalizeBlocks'),'BlockNote converters must remain independent of React');
must(looksLikeMarkdown('# 標題\n\n## 小標\n\n- 項目')&&!looksLikeMarkdown('一般文章\n第二段'),'BlockNote must distinguish authored Markdown from ordinary plain text');
must(read('app/loc/BlockNoteEditorClient.jsx').includes('tryParseMarkdownToBlocks(initialMarkdown)'),'BlockNote must import legacy Markdown into formatted editing blocks');
must(blocksToPlainText(plainTextToBlocks('第一段\n第二段'))==='第一段\n第二段','BlockNote converter must preserve paragraph boundaries');
must(normalizeBlocks({html:'<p>原始文字</p>'}).html==='<p>原始文字</p>','BlockNote must preserve legacy HTML hydration');
must(Array.isArray(normalizeBlocks([{type:'paragraph',content:'字'}])),'BlockNote must accept temporary UI editor blocks');
must(blockNoteEditor.includes("from '@blocknote/react'")&&blockNoteEditor.includes("from '@blocknote/mantine'")&&blockNoteEditor.includes('BlockNoteView')&&!blockNoteEditor.includes('uploadFile'),'BlockNote must be the shared URL-only text/media authoring surface');

must(editableSession.includes('<ObjectEditor mode="scope"')&&publisher.includes('<ObjectEditor mode="fields"')&&publisher.includes("kind:'rich',bare:true")&&blockNoteEntry.includes('field.bare?')&&articleListItem.includes('<ObjectEditor mode="article"')&&blockNoteEntry.includes('export function ObjectEditor(')&&blockNoteEntry.includes('<BlockNoteCanvas')&&sharedSearch.includes('editorDraft={draft}')&&cultureUi.includes('editorDraft={editingWorkKey===workKey?editDraft:null}')&&blockNoteEntry.includes('onBlocksChange={blocks=>')&&blockNoteEntry.includes('onHtmlChange={html=>')&&blockNoteEntry.includes('bodyHtml??draft.bodyBlocks'),'homepage, Culture, Search and publishing must share one BlockNote editor module with WYSIWYG HTML persistence');
must(articleListItem.includes('scope-article-editor-actions')&&articleListItem.includes('titleEditor={titleEditor}')&&articleListItem.includes('UI_COPY.common.save')&&articleListItem.includes('uiExtra.editBlocks.remove')&&articleListItem.includes('onClick:onSave')&&editableSession.includes('onClick:save')&&admin.includes('mode="actions"')&&blockNoteEntry.includes("if(mode==='actions')return actionBar;")&&sharedSearch.includes('onSave={()=>saveEditing(editTarget)}')&&sharedSearch.includes('onDelete={()=>deleteEditing(editTarget)}')&&sharedSearch.includes("attributeFields={editable?(row.resourceType==='galaxy'?GALAXY_ATTR_FIELDS:row.resourceType==='galaxy_media'?MEDIA_ATTR_FIELDS:null):null}")&&cultureUi.includes('onSave={()=>saveEditingWork(work)}')&&cultureUi.includes('onDelete={()=>deleteEditingWork(work)'),'Search and Culture must share the homepage-style header action row, editable title, article attributes, Save, Delete, and Cancel');
must(sharedSearch.includes('<Article')&&cultureUi.includes('<Article')&&articleListItem.includes('onClickCapture')&&articleListItem.includes('onEdit(uid)')&&articleListItem.includes('richBody')&&articleListItem.includes('<DeferredArticleBody html={body}')&&articleListItem.includes('IntersectionObserver'),'Search and Culture lists must render the same Article(uid) component with BlockNote rich-body display');

must(editableBlocks.includes('dangerouslySetInnerHTML')&&!editableBlocks.includes('editable={false}')&&
  editableBlocks.includes("dynamic(()=>import('./ScopeBlockEditorSession')")&&
  !editableBlocks.includes("from './db-client.mjs'")&&
  editableSession.includes('const [draft,setDraft]=useState(')&&
  editableSession.includes("await import('./db-client.mjs')"),
  'All Scope pages render without editor mutation code and load one self-contained React session only on edit');
must(authorHome.includes('AuthorHomeEditableBlocks')&&!authorHome.includes('heroContent={<div'),'author homepage must render database blocks rather than hardcoded old homepage text');
must(locHome.includes('allowEditing')&&editableBlocks.includes("account.canManageGlobalSync()")&&editableBlocks.includes("scopeId==='loc'"),'LOC homepage must preserve permission-based BlockNote editing');

must(HomeBlock.limit===8&&HomeBlock.rows([
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
must(HomeBlock.visibleEntities(colFixture).map(entity=>entity.uid).join(',')==='a,b,c','LOC status must show all populated child items in DB order and hide only empty placeholders');
must(HomeBlock.visibleEntities({...colFixture,entities:[{uid:'copy',title:'',text:colFixture.text}]}).length===0,'legacy duplicate whole-body child must not print twice');

must(
  runesHome.includes('ScopeEditableBlocks')&&
  runesHome.includes('page="hero"')&&
  runesHome.includes('scopeId="lrunes"')&&
  runesHome.includes('allowDelete={false}')&&
  runesHome.includes('allowEntities={false}')&&
  runesHome.includes('allowImages={false}')&&
  runesHome.includes('renderDisplay={slot=>renderRuneHero(slot,native)}')&&
  runesHome.includes('className="basic-grid"')&&
  (runesHome.match(/<ScopeEditableBlocks/g)||[]).length===1,
  'Only the LunaRunes Hero may use inline BlockNote; its other homepage sections remain fixed'
);
must(governance.includes("dynamic(()=>import('../../loc/ScopeEditableBlocks')")&&governance.includes('page="governance"')&&governance.includes('scopeId={scopeId}'),
  'every Scope governance page must use the one lazy shared block implementation');
must(governance.includes('governance-grid-loc')&&governance.includes('GOVERNANCE_SUBTITLES')&&
  governance.includes('account.canManageScopeSync(scopeId)')&&
  governance.includes("navigationHref(scopeId,'governance/manage',native)"),
  'shared governance must preserve Scope styling, authority and its dedicated management route');
must(management.includes("dynamic(()=>import('./ManagementArticlePublisher')")&&management.includes("dynamic(()=>import('./RuneManagementPanel')"),
  'Governance management must load only the selected tab capability');
must(!publisher.includes('content_blocks')&&!sharedSearch.includes('content_blocks')&&!cultureUi.includes('content_blocks')&&!galaxy.includes('content_blocks')&&!featureUi.includes('blocks=null'),'Galaxy must read, write and display canonical content only');
must(sharedSearch.includes('startEditing')&&sharedSearch.includes('editorDraft={draft}')&&articleListItem.includes('<ObjectEditor mode="article"')&&featureUi.includes('<BlockNoteEditor')&&sharedSearch.includes('GALAXY_EDITOR_COLUMNS')&&!sharedSearch.includes('GalaxyAttrSummary')&&!sharedSearch.includes('GalaxyAttrEditor')&&!sharedSearch.includes('GalaxyAttrPanel')&&sharedSearch.includes('assertPlainGalaxyAttributes(')&&blockNoteEntry.includes('attributeFields.map(')&&sharedSearch.includes("SearchEditDraft.changedAttributes('galaxy',editDraft,t)")&&sharedSearch.includes("await import('./search-edit-draft')")&&read('app/modular/features/search-edit-draft.js').includes("'../../loc/group-lists.mjs'")&&sharedSearch.includes('<Article')&&!sharedSearch.includes('actions={editable?')&&sharedSearch.includes('rowScopeData?.galaxy')&&sharedSearch.includes('assertPlainGalaxyAttributes(')&&sharedSearch.includes('updateRows')&&sharedSearch.includes('deleteRows'),'Search must use Article(uid), shared BlockNote, and the existing management_write boundary for article attributes and deletes');
must(!sharedSearch.includes('selectAuthRow')&&sharedSearch.includes('selectPublicEditableRow')&&!cultureUi.includes('dbAuthRelation')&&cultureUi.includes('selectRows'),'Search and Culture article edit forms must use the same public read path as the homepage before permission-checked writes');
must(sharedSearch.includes('selectScopeRegistry')&&sharedSearch.includes("item.scope_kind==='scope'")&&!sharedSearch.includes('selectManagedScopes')&&sharedSearch.includes('mediaOnly:false,browse')&&!sharedSearch.includes('setSearchMode('),'Unified public search must enumerate active public Scopes, while management permissions gate editing');
must(nativeTimeline.includes('anchor:labels.anchor,event:labels.event,style_comment:labels.styleComment,period:labels.period'),'Time River fourth group must always be period, not style');
must(editor.includes("ids.length!==2||concrete.length!==2")&&
  editor.includes("ids.length>2||concrete.length<1||concrete.length>2")&&
  editor.includes("payload.anchor_ids=[anchorId]")&&
  !editor.includes('addIntermediateAnchor')&&editor.includes('legacyEventUnchanged'),
  'Canonical Time anchor counts are period 1–2, event 2, style 1; historic 1/3 point events are not silently changed');
must(nativeTimeline.includes('hasTimeKinds')&&nativeTimeline.includes('style_comment:labels.styleComment')&&nativeTimeline.includes('standardTimeKinds.map'),'Time chart must create the fourth style group even when it is empty');
must(cultureUi.includes('beginTimelineCreation')&&cultureUi.includes('items={timelineItems}')&&cultureUi.includes('...classificationBuckets,...virtualAnchorItems')&&!cultureUi.includes('anchorReviews.map')&&
  editor.includes('l.periodHint')&&editor.includes('l.eventHint')&&editor.includes('anchorOptions.map(row=>')&&!editor.includes('CultureStyleTagsField'),
  'Shared Time editor must use 1–2 anchors for periods, 2 for events, 1 for styles, without extra controls');
must(nativeTimeline.includes('new Timeline(')&&['onAdd:','onMove:','onUpdate:','onRemove:','add:Boolean(onAddRef.current)','onTimeClickRef.current'].every(token=>nativeTimeline.includes(token)),'Time manipulation must retain vis-timeline edits and make add opt-in to avoid river gesture collisions');

must(nativeTimeline.includes("updateTime:row.entryType==='anchor'")&&!cultureUi.includes('snapTimelineRangeToAnchors')&&editor.includes('payload.anchor_ids=ids'),'Only real anchor points can be dragged; periods and events must reference ordered anchor IDs from selectors');
const anchorFixture=[
  {entry_type:'anchor',resource_id:'a',date_status:'exact',start_date:'2024-01-01'},
  {entry_type:'anchor',resource_id:'b',date_status:'exact',start_date:'2024-03-01'},
  {entry_type:'anchor',resource_id:'c',date_status:'exact',start_date:'2024-04-01'},
  {entry_type:'anchor',resource_id:'d',date_status:'exact',start_date:'2024-05-01'}
];
const snappedPeriod=CultureTimelineModel.snapTimelineRangeToAnchors({start:'2024-01-02',end:'2024-03-31'},{entryType:'period',raw:{anchor_ids:['a','b']}},anchorFixture);
must(snappedPeriod.anchor_ids.join(',')==='a,c'&&snappedPeriod.item.end==='2024-03-31','period range drag must snap to exclusive-end anchor without changing row dates');
const snappedEvent=CultureTimelineModel.snapTimelineRangeToAnchors({start:'2024-01-01',end:'2024-04-01'},{entryType:'event',raw:{anchor_ids:['a','b']}},anchorFixture);
must(snappedEvent.anchor_ids.join(',')==='a,c'&&snappedEvent.item.end==='2024-04-01','event range drag must snap inclusive end to actual anchor');
let duplicateAnchorRejected=false;
try{CultureTimelineModel.snapTimelineRangeToAnchors({start:'2024-04-01',end:'2024-03-31'},{entryType:'period',raw:{anchor_ids:['a','b']}},anchorFixture);}catch{duplicateAnchorRejected=true}
must(duplicateAnchorRejected,'period bounds must reject duplicate or reversed anchor ranges');

must(cultureUi.includes('CultureTimelineEditor')&&cultureUi.includes('selectedTimelineRecordId')&&cultureUi.includes('editable={account.canManageScopeSync(scopeId)}')&&cultureUi.includes('onMove={account.canManageScopeSync(scopeId)?moveTimelineRecord:null}')&&cultureUi.includes('onRemove={account.canManageScopeSync(scopeId)?removeTimelineRecord:null}'),'Time vis-timeline must preserve native add/edit/remove for four types');
must(admin.includes("insertRows('silver.manage'")&&admin.includes("deleteRows('silver.manage'"),'Admin Registry node panel must add/remove Manage mappings');
must(admin.includes('DeploymentTree')&&admin.includes('vis-network/standalone')&&admin.includes("onMoveParent"),'Admin must manage Scope Registry through a draggable vis-network tree');
must(admin.includes("registry.filter(row=>row.scope_kind!=='system')")&&!admin.includes("id:'__admin__'")&&admin.includes("fixed:row.scope_id==='loc'")&&admin.includes('layout:{hierarchical:{enabled:true'),'Admin hierarchy must display only real Scope/Group nodes, never a duplicate Admin system node');
const adminCss=read('app/styles/features.css');
must(adminCss.includes('.admin-context-panel input:not([type="checkbox"]):not([type="radio"])')&&adminCss.includes('.admin-inline-flags input:is([type="checkbox"],[type="radio"])'),'Admin checkbox and radio inputs must retain native sizing instead of 100% field width');
must(adminCss.includes('.admin-inline-flags[role="radiogroup"]')&&!adminCss.includes('max-height:78vh;overflow:auto'),'Admin route controls must be readable without a clipped nested form scrollbar');
must(admin.includes('if(!scopeRows.length)return()=>{cancelled=true;}')&&admin.includes('network.fit({animation:false,maxZoomLevel:1})')&&!admin.includes('network.focus(selectedId,'),'Admin graph must fit populated canvas without zooming for every selection');
must(admin.includes('},[registry]);')&&admin.includes('handlersRef.current={onSelect,onMoveParent,onDeleteNode}'),'Draft Scope config changes must not rebuild the vis-network tree on each keystroke');
must(!admin.includes('Registry：')&&admin.includes('{!routeLocked?<div className="admin-inline-flags"')&&admin.includes('className="admin-route-summary"'),'Admin UI must show actual Domain or Directory values without redundant Registry prose');
must(admin.includes('shapeProperties:{borderRadius:12}')&&admin.includes('themeObserver?.disconnect()')&&admin.includes("token('--loc-text'"),'Admin graph nodes must use compact theme-aware shapes with observer cleanup');
must(admin.includes("direction:'LR'")&&admin.includes("forceDirection:'horizontal'")&&!admin.includes("direction:'UD'"),'Scope graph must place LOC at left and its children at right');
must(adminCss.includes('.admin-deployment-layout{display:grid;grid-template-columns:minmax(0,1fr)')&&admin.includes('className="admin-editor-section"'),'Scope management must show full-width graph with editor below');
must(admin.includes("select('id,email,role,galaxy,time,birthday,Title_TW,Desc_TW')")&&admin.includes("updateRows('silver.manage'")&&admin.includes("Title_TW:String(currentCopy.Title_TW")&&admin.includes('uiExtra.adminView.navigationTitle'),'Admin must edit silver.manage Title_TW and Desc_TW, including true DB writes');
must(admin.includes("role=\"application\"")||admin.includes('manipulation:{'),'Scope graph must preserve direct vis-network edit/delete operations');
must(admin.includes("const [editDraft,setEditDraft]=useState(null)")&&admin.includes('const editing=editDraft?.scopeId===selectedId;')&&admin.includes("const cancelEdit=()=>setEditDraft(null);"),'Scope node edits must remain local drafts until explicit Save or Cancel');
must(admin.includes('key={selectedId} data={data} selectedId={selectedId}'),'Switching Scope node must discard any uncommitted edit draft');
must(!admin.includes('async function toggleScopeHidden')&&admin.includes("patchRegistry('active',e.target.checked)"),'Visibility changes must not write before Save');
must(!admin.includes("react-select")&&!admin.includes('<Select')&&admin.includes('admin-native-select'),'Admin must use native select controls instead of react-select');
must(admin.includes('scopeDomainError?<p')&&admin.includes('groupDomainError?<p')&&admin.includes("duplicateDomainLabelError(id,mode)")&&admin.includes('disabled={Boolean(scopeDomainError)||creatingScope}'),'Admin Scope creation must immediately reject repeated Domain labels');
must(read('app/AppShell.jsx').includes('function ScopePageCopy(')&&
  read('app/AppShell.jsx').includes('appBootstrapPageCopy(bootstrap.data,scopeId)')&&
  read('app/AppShell.jsx').includes('pageCopy?.Title_TW')&&
  read('app/AppShell.jsx').includes('pageCopy?.Desc_TW')&&
  read('app/loc/app-bootstrap.js').includes("rpc('read_app_bootstrap'")&&
  read('app/AppShell.jsx').includes('configRow?.display_name||registryRow?.display_name'),
  'browser page copy must derive from manage Title_TW/Desc_TW independently of display_name, via the one shared bootstrap request');
must(!adminThemePanel.includes('applyTheme(')&&adminThemePanel.includes('admin-theme-local-preview')&&adminThemePanel.includes('uiExtra.adminView.editingTheme'),'Admin Theme draft and preview must never mutate the live document root theme on entry or edit');
must(admin.includes('syncManageScopeRow(')&&admin.includes("role:'scope'"),'Admin Scope node must edit Manage mapping atomically and keep role=scope fixed');
must(admin.includes('provisionScope(')&&admin.includes('uiExtra.adminView.ddMember')&&admin.includes('uiExtra.adminView.ddGroup'),'Admin Registry must create Scope and Scope Group from the tree workspace');

must(functionalButton(admin,'refresh','重新讀取'),'Admin graph must allow manual reload after a dynamic Scope schema cache settles');

must(admin.includes('className="admin-delete-confirm"')&&admin.includes("onClick={confirmDelete}")&&admin.includes("deleteTyped.trim().toLowerCase()!==deletePending")&&admin.includes("onClick={cancelDelete}"),'Scope delete UI must require typed ID and support visible cancellation');
must(admin.includes("result?.deleted!==true")&&admin.includes("dbAuthRelation('silver.scope_registry')")&&admin.includes("if(remaining?.length)")&&admin.includes('setRegistry(rows=>rows.filter(row=>row.scope_id!==id))'),'Scope node may disappear only after RPC success and Registry verification');
must(adminCss.includes('.admin-delete-confirm')&&adminCss.includes('.admin-node-actions'),'delete confirmation must remain readable and visible on mobile');

const scopeCreatePanel=admin.split("    {kind==='scope'?<>")[1]?.split("    </>:<>")[0]||'';
must(
  functionalLabel(scopeCreatePanel,'span','人員代碼')&&
  scopeCreatePanel.includes('uiExtra.adminView.administratorEmail')&&scopeCreatePanel.includes('type="email" required')&&
  scopeCreatePanel.includes('uiExtra.adminView.defaultLanguage')&&scopeCreatePanel.includes('UI_LOCALE_OPTIONS')&&
  scopeCreatePanel.split('<input').length===5&&
  scopeCreatePanel.includes('type="radio" name="new-scope-route-mode" value="directory"')&&
  scopeCreatePanel.includes('type="radio" name="new-scope-route-mode" value="domain"')&&
  !scopeCreatePanel.includes('<span>Domain</span>')&&!scopeCreatePanel.includes('<span>Directory</span>'),
  'Admin Scope creation must show only ID, required Email, locale and exclusive Directory/Domain radio options'
);
must(
  admin.includes("const EMPTY_SCOPE_CREATE={scope_id:'',email:'',locale:'zh-Hant',route_mode:'directory'}")&&
  admin.includes("const email=String(scopeDraft.email||'').trim().toLowerCase()")&&
  admin.includes("domain:mode==='domain'?id+'.lo3rwang.cc':null")&&
  admin.includes("directory:mode==='directory'?'/'+id:null")&&
  admin.includes("theme:'system-default'")&&admin.includes('copy_keywords:true')&&
  admin.includes("locale:normalizeUiLocale(scopeDraft.locale)"),
  'Scope provisioning derives routing from ID, stores explicit owner/locale, auto Theme and initial Rune66 class'
);

must(
  editableSession.includes('async function moveBlock(direction)')&&
  editableSession.includes('moveScopeBlock(scopeId,pageName,draft.uid,direction)')&&
  editableSession.includes('uiExtra.editBlocks.moveUp')&&editableSession.includes('uiExtra.editBlocks.moveDown')&&
  editableSession.includes('movableSlots.length>1')&&
  dbContract.includes("rpc('move_scope_block'")&&
  scopeSettings.includes('THEME_SLOTS.map(theme=>')&&
  adminThemePanel.includes('label:theme.theme_name||theme.label||THEME_SLOTS.find'),
  'Editable page frames must move up/down atomically while theme selectors display names only'
);

must(['DatabaseTarget','ThemeEditor','AdminEmailBlocklist'].every(name=>
  admin.includes("dynamic(()=>import('./admin-panels/"+name+"')")),
  'Admin must load independent management workspaces only after the section is selected');
must(admin.includes("dbAuthRelation('silver.scope_registry')")&&admin.includes('parent_scope_id'),'Admin must read the DB Scope Registry hierarchy');
must(adminDatabasePanel.includes("silver.database_targets")&&adminDatabasePanel.includes('save_database_target')&&adminDatabasePanel.includes('SQL_ENGINE_OPTIONS.map')&&adminDatabasePanel.includes('databaseProviderChoices')&&adminDatabasePanel.includes('Link / Project'),'Admin must save and select explicit SQL type/provider/Link targets');
must(adminThemePanel.includes("silver.loc_theme")&&adminThemePanel.includes('THEME_DB_COLUMNS')&&adminThemePanel.includes('themeColumnForToken')&&adminThemePanel.includes('THEME_TOKEN_KEYS')&&adminThemePanel.includes('type="color"')&&!adminThemePanel.includes('theme_attr'),'Admin Theme editor must persist typed theme columns without JSONB');
must(dbContract.includes("schema('silver').rpc('management_write'")&&dbContract.includes('batchSize=200')&&!dbContract.includes("schema('api').rpc("),'client RPC calls must use exposed silver wrappers with bounded insert batches');
must(dbContract.includes('`silver.${scope}_keywords`')&&!dbContract.includes("api.lo3rwang_keywords_manage"),'keyword library writes must resolve the current Scope keyword table');
must(dbContract.includes('copyKeywordLibraryClass')&&keywordLibrary.includes('copyKeywordLibraryClass'),'keyword library must support copying a complete independent Class');
must(dbContract.includes('syncManageScopeRow')&&dbContract.includes("p_operation:'scope_sync'"),'Scope mapping updates must use one atomic management write');
must(dbContract.includes('affected 0 rows')&&dbContract.includes('affected!==batch.length'),'management write helpers must reject zero-row updates/deletes and incomplete inserts');
must(scopeData.includes("keywords:`silver.${id}_keywords`")&&scopeData.includes("blocks:`silver.${id}_blocks`")&&scopeData.includes('selectScopeGroupChildren')&&scopeData.includes('display_name,search_intro,search_aliases,theme,locale'),'Scope data must resolve Keywords, block tables, DB hierarchy and Scope-owned presentation');
must(scopeGroup.includes('selectScopeGroupChildren(scopeId)')&&scopeData.includes('parent_scope_id'),'Scope Group management must read DB parent/child membership');
must(keywordLibrary.includes('keywordDraftWithInput')&&keywordLibrary.includes('keywordEdit.trim()')&&
  keywordLibrary.includes('l.writing')&&
  keywordLibrary.includes('l.updatingAnalysis')&&
  keywordLibrary.includes('l.reloading')&&
  keywordLibrary.includes('preserveOnError:true')&&
  keywordLibrary.includes('role="status"'),
  'Keyword Save must persist the typed input and report write, analysis invalidation and reload independently');
must(keywordLibrary.includes('class_name')&&keywordLibrary.includes('class_group')&&keywordLibrary.includes('class_enable')&&keywordLibrary.includes('item_name')&&keywordLibrary.includes('principle')&&keywordLibrary.includes('keywords_text'),'keyword library editor must edit self-contained Class, Group, participation, item, principle and one keyword collection together');
must(keywordLibrary.includes("dynamic(()=>import('./KeywordNetworkEditor')")&&keywordLibrary.includes("workspace==='manual'")&&keywordLibrary.includes("workspace==='network'")&&keywordNetwork.includes("import('vis-network/standalone')")&&keywordNetwork.includes('manipulation:')&&keywordNetwork.includes('addNode:')&&keywordNetwork.includes('editNode:')&&keywordNetwork.includes('deleteNode:'),'keyword library must expose manual editing without mounting its lazy vis-network workspace');
must(!keywordLibrary.includes('keyword_group')&&!keywordLibrary.includes("node_type:'style'")&&!keywordLibrary.includes("node_type:'keyword'"),'keyword library editor must not recreate style/rule/node-type storage');
must(keywordLibrary.includes('scopeData=account.scopeDataFor(scopeId)')&&keywordLibrary.includes('keyword_min_chars')&&keywordLibrary.includes('keyword_min_documents'),'keyword analysis thresholds must resolve from the current Scope');
must(keywordLibrary.includes('current_keyword_class_id')&&keywordLibrary.includes('keyword_class_share_enabled')&&keywordLibrary.includes('Class UUID'),'keyword library must expose current Class UUID and Scope sharing control');
must(keywordLibrary.includes('l.reanalyse')&&keywordLibrary.includes('runRune66ClassificationBatch'),'keyword management must expose explicit batch classification instead of live recalculation');
must(dbContract.includes("rpc('apply_keyword_classification'")&&dbContract.includes('p_scope_id:scope')&&dbContract.includes('silver.keyword_classes')&&dbContract.includes('randomUUID'),'keyword classification writes and copied Classes must be Scope-aware and use the UUID registry');

must(keywordAnalysis.includes('DEFAULT_KEYWORD_MIN_CHARS=32')&&keywordAnalysis.includes('DEFAULT_KEYWORD_MIN_DOCUMENTS=100'),'keyword batch must retain >32 article and >100 statistics thresholds');
must(keywordAnalysis.includes('analysisCharacterCount(row?.content)>minChars'),'keyword classification must gate on non-whitespace body characters');
must(keywordAnalysis.includes("columns:'uid,createtime,class_id,group_lists'"),'public keyword Statistics/Culture must read stored article attrs');
must(keywordAnalysis.includes('dynamicTieCount')&&keywordAnalysis.includes('counts.get(candidate)'),'complete keyword ties must use dynamic current Class counts');

must(dbContract.includes("mode:'begin'")&&dbContract.includes("mode:'chunk'")&&dbContract.includes("mode:'finalize'")&&dbContract.includes('batchSize=1000'),'keyword attr writes must reset, write bounded chunks, then finalize staticstime');

must(keywordAnalysis.includes('classifyDocumentsIncrementally')&&keywordAnalysis.includes('onProgress:({completed,total})')&&keywordAnalysis.includes("reportBatchProgress(onProgress,'completed'")&&keywordAnalysis.includes('verified?.staticstime'),'keyword analysis must report real read/classify/write progress and verify the anchor before 100 percent');
must(keywordLibrary.includes('<progress value={batchProgress.percent}')&&keywordLibrary.includes('onProgress:setBatchProgress')&&keywordLibrary.includes("phase:'failed'"),'keyword batch UI must report visible percent and preserve failure status');
must(!keywordAnalysis.includes('PERSONAL_KEYWORD_TABLE')&&keywordAnalysis.includes('`silver.${scope}_keywords`'),'keyword classification must read the current Scope private keyword library');
must(dbContract.includes("rpc('provision_scope'")&&dbContract.includes('provisionScope'),'DB client must expose the transactional Scope provisioning RPC');

// Source and future-Scope schema parity: the Time contract is flat TEXT,
// not a growing JSONB attribute bag or a stored keyword-count snapshot.

must(dbContract.includes("rpc('manage_scope_registry'")&&dbContract.includes('manageScopeRegistry'),'DB client must expose authorized Scope Registry management');
must(admin.includes('CreateNodePanel')&&admin.includes("manageScopeRegistry('update'")&&admin.includes("manageScopeRegistry('create_group'"),'Admin tree workspace must edit Registry hierarchy and create Scope Groups');

must(scopeRuntime.includes("pathname==='/scope-shell'||pathname.startsWith('/scope-shell/')")&&scopeRuntime.includes('selectScopeRegistryEntry'),'generic Scope runtime must resolve DB registry entries through the fixed static shell');
must(scopeRegistry.includes("GENERIC_SCOPE_PATH='/scope-shell'")&&scopeRegistry.includes("params.set('scopeid',id)"),'unknown DB Scope links must route through the generic static shell');
must(importPanel.includes('function SourceRefresh')&&importPanel.includes(".in('uid',batch)")&&importPanel.includes(".eq('source_name',selected)")&&importPanel.includes("offset+=200"),'Source Refresh must use bounded source_name + UID lookups instead of full-table scans');

must(importPanel.includes('record.createtime||current.createtime||null')&&importPanel.includes('record.source_place||current.source_place||null')&&importPanel.includes('record.url||current.url||null'),'Source Refresh must preserve optional existing metadata when the payload omits it');

must(!/silver\.runes(?:_etc)?\b/.test(galaxy),'generic Galaxy/Search provider must not expose private Rune Core tables');
must(!/runeScopeIds|silver\.runes(?:_etc)?\b/.test(sharedSearch),'shared Search must stay Scope-data only');
must(sharedSearch.includes('matchesScopeAlias')&&sharedSearch.includes('scope.searchIntro')&&sharedSearch.includes("label:t('uiExtra.searchUI.memberHomeLink')")&&sharedSearch.includes('return;'),'exact Scope aliases must use Scope-owned presentation and stop the search');
must(galaxy.includes('selectStyleKeywordMatches')&&galaxy.includes('style_keyword_tag:true')&&galaxy.includes('style_description:String(row.style_description||\'\')')&&galaxy.includes("{column:'label',operator:'eq',value:String(query||'').normalize('NFKC').trim()}")&&galaxy.includes('limit:DEFAULT_LIST_BATCH_SIZE')&&!galaxy.includes('selectStyleKeywordDocumentCount'),'Exact style-tag search must load only a bounded exact-label match and its full intro, without period, count, or recommendation-stat scans');
must(sharedSearch.includes('selectStyleKeywordMatches(targetScopes,q,{signal})')&&sharedSearch.includes('[...styleTagMatches,...enrichedRows]')&&sharedSearch.includes('styleIntroText={row.styleIntroText}')&&sharedSearch.includes('prioritizeStyleTagResults(mergeSummaryResults(converted,UI_COPY))')&&sharedSearch.includes('cursor,'),'An exact style-tag match must show its full intro first and still search article providers');
must(sharedSearch.includes("scope?.aggregateChildren&&scopeId!=='loc'")&&
  sharedSearch.includes("scopeId!=='loc')return [defaultScopeData(scopeId)]")&&
  sharedSearch.includes("item.scope_kind==='scope'")&&
  sharedSearch.includes("key:identity?[scope,source,identity].join(':')")&&
  sharedSearch.includes("'galaxy:'+scope+':'+resourceId"),
  'LOC must search all managed Scopes with scope-aware result identities; other groups remain overview-only');

if(failures.length){
  console.error('[management-contract] verification failed');
  failures.forEach(item=>console.error(' - '+item));
  process.exit(1);
}
console.log('[management-contract] Settings-managed permissions, Statistics keywords, block tables, loc_theme and Admin separation verified');
