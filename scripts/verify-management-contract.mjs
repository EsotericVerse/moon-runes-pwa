import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const failures=[];
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const must=(condition,message)=>{if(!condition)failures.push(message);};

const galaxy=read('app/loc/galaxy-query.js');
const culture=read('app/loc/culture-query.js');
const editor=read('app/modular/features/CultureTimelineEditor.jsx');
const management=read('app/loc/GovernanceManagement.jsx');
const governance=read('app/modular/features/Governance.jsx');
const data=read('app/loc/ManagementDataPanel.jsx');
const admin=read('app/loc/views/AdminHomeView.jsx');
const dbContract=read('app/loc/db-contract.mjs');
const keywordLibrary=read('app/loc/KeywordLibraryPanel.jsx');
const keywordAnalysis=read('app/loc/rune66-keyword-analysis.js');
const portableSchema=read('docs/sql/portable-current-schema.sql');

must(!galaxy.includes('include_in_time'),'generic search must not query nonexistent include_in_time');
must(galaxy.includes("'style_tags'")&&galaxy.includes("searchFields:['label','note','status','style_tags']"),'generic Time search must include style_tags');
must(culture.includes('visibility,style_tags'),'Culture shared Time contract must include style_tags');
must(editor.includes("style_tags:''")&&editor.includes('風格標籤'),'shared Time editor must edit style_tags');
must(editor.includes('style_tag_descriptions')&&editor.includes('風格關鍵詞說明')&&editor.includes('搜尋精確命中風格詞時'),'Time editor must require per-style-keyword search descriptions');
must(galaxy.includes('selectStyleKeywordIntroductions')&&!galaxy.includes('scopeCards('),'Search must prepend exact style-keyword introductions and must not use partial Scope-ID cards');
must(management.includes("section==='group'&&scopeId==='loc'"),'LOC Scope Group must have its own Manage');
must(management.includes('ScopeGroupManagement'),'Manage must compose the Scope Group module');
must(management.includes('KeywordLibraryPanel')&&management.includes("value:'keywords'"),'lo3rwang Manage must expose the generic keyword library');
must(management.includes("canManage=scopeId==='loc'?account.canManageGlobalSync():account.canManageScopeSync(scopeId)"),'LOC Scope Group Manage must use global authority without becoming Admin');
must(governance.includes("scopeHref(scopeId,'governance/manage')"),'Governance must link to Scope Manage');
must(data.includes('updateRows')&&data.includes('deleteRows')&&data.includes('ContentEditor'),'canonical data management must expose shared CRUD');
must(data.includes('detailRequestRef')&&data.includes('requestId!==detailRequestRef.current'),'record detail UI must ignore stale async responses');
must(data.includes("toUpperCase()")&&data.includes("galaxy_link 必須是 8 字 UID"),'media edit must normalize and validate galaxy_link');
must(admin.includes("insertRows('silver.manage'")&&admin.includes("deleteRows('silver.manage'"),'Admin must support mapping add/remove through shared management write');
must(admin.includes('selectDraftScope')&&admin.includes('同一 Scope 的 Galaxy / Time mapping 必須一致'),'Admin permission rows must inherit and preserve one Scope mapping');
must(dbContract.includes("rpc('management_write'")&&dbContract.includes('batchSize=200'),'management writes must use the authorized RPC with bounded insert batches');
must(dbContract.includes("api.lo3rwang_keywords_manage"),'keyword library writes must use the scoped management view');
must(dbContract.includes('copyKeywordLibraryClass')&&keywordLibrary.includes('copyKeywordLibraryClass'),'keyword library must support copying a complete independent Class');
must(dbContract.includes('syncManageScopeRow')&&dbContract.includes("p_operation:'scope_sync'"),'Scope mapping updates must use one atomic management write');
must(dbContract.includes('affected 0 rows')&&dbContract.includes('affected!==batch.length'),'management write helpers must reject zero-row updates/deletes and incomplete inserts');
must(admin.includes('syncManageScopeRow('),'Admin must update one Scope mapping atomically');
must(admin.includes("role:'scope'")&&!admin.includes("change(index,'role'")&&!admin.includes('value={draft.role}'),'Scope permission creation must fix role=scope and keep existing roles immutable');
must(admin.includes('部分 Scope 設定讀取失敗')&&!admin.includes('}catch{}'),'Admin Scope config failures must be surfaced, not swallowed');
must(data.includes("來源為必填欄位。")&&data.includes('source_name:sourceName'),'Galaxy edits must preserve a nonempty source');
must(data.includes("setSelectedId(id);setDraft(null);setEditorMessage('');")&&!data.includes('if(!scopeData)return;'),'record selection must clear stale drafts and Scope resolution failures must not be silent');
must(data.includes('!draft&&editorMessage'),'record-detail failures and successful deletes must remain visible without an editor draft');
must(admin.includes("setMappings([]);setStatus(error?.message||'Mapping 讀取失敗。');"),'Admin mapping read rejections must surface in the UI');
must(keywordLibrary.includes('class_name')&&keywordLibrary.includes('class_group')&&keywordLibrary.includes('class_enable')&&keywordLibrary.includes('item_name')&&keywordLibrary.includes('principle')&&keywordLibrary.includes('keywords_text'),'keyword library editor must edit self-contained Class, Group, participation, item, principle and one keyword collection together');
must(!keywordLibrary.includes('keyword_group')&&!keywordLibrary.includes("node_type:'style'")&&!keywordLibrary.includes("node_type:'keyword'"),'keyword library editor must not recreate style/rule/node-type storage');
must(keywordLibrary.includes("CONFIG_TABLE='silver.lo3rwang'")&&keywordLibrary.includes('keyword_min_chars')&&keywordLibrary.includes('keyword_min_documents'),'keyword analysis thresholds must be Scope-owned');
must(keywordLibrary.includes('current_keyword_class_id')&&keywordLibrary.includes('keyword_class_share_enabled')&&keywordLibrary.includes('Class UUID'),'keyword library must expose current Class UUID and Scope sharing control');
must(keywordLibrary.includes('重新分析並寫入文章 Attr')&&keywordLibrary.includes('runRune66ClassificationBatch'),'keyword management must expose explicit batch classification instead of live recalculation');
must(dbContract.includes("rpc('apply_keyword_classification'")&&dbContract.includes('silver.keyword_classes')&&dbContract.includes('randomUUID'),'keyword classification writes and copied Classes must use the UUID registry');
must(dbContract.includes("rpc('read_keyword_class'")&&portableSchema.includes('api.read_keyword_class')&&portableSchema.includes('keyword_class_share_enabled'),'shared Keyword Class resolution must require scope + UUID and obey Scope sharing authorization');
must(!portableSchema.includes('GRANT SELECT ON "silver"."lo3rwang_keywords" TO "anonymous"'),'private keyword contents must not be anonymously enumerable');
must(keywordAnalysis.includes('DEFAULT_KEYWORD_MIN_CHARS=32')&&keywordAnalysis.includes('DEFAULT_KEYWORD_MIN_DOCUMENTS=100'),'keyword batch must retain >32 article and >100 statistics thresholds');
must(keywordAnalysis.includes('analysisCharacterCount(row?.content)>minChars'),'keyword classification must gate on non-whitespace body characters');
must(keywordAnalysis.includes("columns:'uid,createtime,class_id,group_lists'"),'public keyword Statistics/Culture must read stored article attrs');
must(keywordAnalysis.includes('dynamicTieCount')&&keywordAnalysis.includes('counts.get(candidate)'),'complete keyword ties must use dynamic current Class counts');
must(portableSchema.includes("group_lists='false'::jsonb")&&keywordAnalysis.includes('group_lists:result?.group_lists||{}'),'keyword attrs must reset excluded rows to false and store eligible no-hit rows as objects');
must(portableSchema.includes('"lrunes_galaxy_class_id_check"')&&portableSchema.includes('"lrunes_galaxy_group_lists_shape_check"'),'all managed Galaxy schemas must keep class_id/group_lists parity');
must(dbContract.includes("mode:'begin'")&&dbContract.includes("mode:'chunk'")&&dbContract.includes("mode:'finalize'")&&dbContract.includes('batchSize=500'),'keyword attr writes must reset, write bounded chunks, then finalize staticstime');
must(!keywordAnalysis.includes("selectAllRows(PERSONAL_KEYWORD_TABLE"),'public keyword classification must not read the private keyword library');

must(!/silver\.runes(?:_etc)?\b/.test(galaxy),'generic Galaxy/Search provider must not expose private Rune Core tables');
const sharedSearch=read('app/modular/features/Search.jsx');
must(!/runeScopeIds|silver\.runes(?:_etc)?\b/.test(sharedSearch),'shared Search must stay Scope-data only');
must(sharedSearch.includes('resolveScopeSearchAlias')&&sharedSearch.includes("label:'前往 Scope 首頁'")&&sharedSearch.includes('return;'),'exact Scope aliases must return one homepage shortcut and stop the search');
must(sharedSearch.includes('selectStyleKeywordIntroductions')&&sharedSearch.includes('[...styleIntroductions,...enrichedRows]'),'style keyword descriptions must precede ordinary related results');

if(failures.length){
  console.error('[management-contract] verification failed');
  failures.forEach(item=>console.error(' - '+item));
  process.exit(1);
}
console.log('[management-contract] shared CRUD, Style Tag, Scope Group Manage and Admin separation verified');
