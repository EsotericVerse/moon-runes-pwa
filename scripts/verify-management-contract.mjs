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

must(!galaxy.includes('include_in_time'),'generic search must not query nonexistent include_in_time');
must(galaxy.includes("'style_tags'")&&galaxy.includes("searchFields:['label','note','status','style_tags']"),'generic Time search must include style_tags');
must(culture.includes('visibility,style_tags'),'Culture shared Time contract must include style_tags');
must(editor.includes("style_tags:''")&&editor.includes('風格標籤'),'shared Time editor must edit style_tags');
must(management.includes("section==='group'&&scopeId==='loc'"),'LOC Scope Group must have its own Manage');
must(management.includes('ScopeGroupManagement'),'Manage must compose the Scope Group module');
must(management.includes("canManage=scopeId==='loc'?account.canManageGlobalSync():account.canManageScopeSync(scopeId)"),'LOC Scope Group Manage must use global authority without becoming Admin');
must(governance.includes("scopeHref(scopeId,'governance/manage')"),'Governance must link to Scope Manage');
must(data.includes('updateNeonRows')&&data.includes('deleteNeonRows')&&data.includes('ContentEditor'),'canonical data management must expose shared CRUD');
must(data.includes('detailRequestRef')&&data.includes('requestId!==detailRequestRef.current'),'record detail UI must ignore stale async responses');
must(data.includes("toUpperCase()")&&data.includes("galaxy_link 必須是 8 字 UID"),'media edit must normalize and validate galaxy_link');
must(admin.includes("neonAuthRelation('silver.manage').insert")&&admin.includes(".delete().eq('id'"),'Admin must support mapping add/remove');
must(admin.includes('selectDraftScope')&&admin.includes('同一 Scope 的 Galaxy / Time mapping 必須一致'),'Admin permission rows must inherit and preserve one Scope mapping');

must(!/silver\.runes(?:_etc)?\b/.test(galaxy),'generic Galaxy/Search provider must not expose private Rune Core tables');
const sharedSearch=read('app/modular/features/Search.jsx');
must(!/runeScopeIds|silver\.runes(?:_etc)?\b/.test(sharedSearch),'shared Search must stay Scope-data only');

if(failures.length){
  console.error('[management-contract] verification failed');
  failures.forEach(item=>console.error(' - '+item));
  process.exit(1);
}
console.log('[management-contract] shared CRUD, Style Tag, Scope Group Manage and Admin separation verified');
