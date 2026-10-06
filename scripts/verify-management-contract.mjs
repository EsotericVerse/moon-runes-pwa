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

must(!galaxy.includes('include_in_time'),'generic search must not query nonexistent include_in_time');
must(galaxy.includes("'style_tags'")&&galaxy.includes("searchFields:['label','note','status','style_tags']"),'generic Time search must include style_tags');
must(culture.includes('visibility,style_tags'),'Culture shared Time contract must include style_tags');
must(editor.includes("style_tags:''")&&editor.includes('風格標籤'),'shared Time editor must edit style_tags');
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
must(keywordLibrary.includes('useQueryClient')&&keywordLibrary.includes("statistics-rune66-classification")&&keywordLibrary.includes("refetchType:'all'"),'keyword edits must invalidate and immediately refetch Rune66 classification');

must(!/silver\.runes(?:_etc)?\b/.test(galaxy),'generic Galaxy/Search provider must not expose private Rune Core tables');
const sharedSearch=read('app/modular/features/Search.jsx');
must(!/runeScopeIds|silver\.runes(?:_etc)?\b/.test(sharedSearch),'shared Search must stay Scope-data only');

if(failures.length){
  console.error('[management-contract] verification failed');
  failures.forEach(item=>console.error(' - '+item));
  process.exit(1);
}
console.log('[management-contract] shared CRUD, Style Tag, Scope Group Manage and Admin separation verified');
