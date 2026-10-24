'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useAsyncResource} from './use-async-resource';
import {useSWRConfig} from 'swr';
import {dbAuthRelation} from './db-client.mjs';
import {useEditDock} from '../modular/edit-dock';

const GROUPS='silver.statistics_scope_others_groups';
const ALIASES='silver.statistics_scope_others_aliases';
const GLOBAL_CATEGORIES='silver.statistics_source_categories';
const GLOBAL_ALIASES='silver.statistics_source_aliases';
const CODE=/^[a-z][a-z0-9_-]{0,63}$/;
const sourceKey=value=>String(value||'').trim().toLowerCase();
const errorOf=(result,label)=>{
  if(result.error)throw new Error(label+'：'+result.error.message);
  return result.data||[];
};

export default function ScopeOthersSources({scopeId,scopeData=null}){
  const {mutate}=useSWRConfig();
  const dock=useEditDock();
  const currentSave=useRef(null);
  const [groupCode,setGroupCode]=useState('');
  const [groupName,setGroupName]=useState('');
  const [source,setSource]=useState('');
  const [sourceGroup,setSourceGroup]=useState('');
  const [groupEdits,setGroupEdits]=useState({});
  const [aliasEdits,setAliasEdits]=useState({});
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const query=useAsyncResource(['scope-others-source-configuration',scopeId],async()=>{
      const results=await Promise.all([
        dbAuthRelation(GROUPS).select('scope_id,group_code,display_name,sort_order,enabled')
          .eq('scope_id',scopeId).order('sort_order').order('group_code'),
        dbAuthRelation(ALIASES).select('scope_id,source_key,group_code')
          .eq('scope_id',scopeId).order('source_key'),
        dbAuthRelation(GLOBAL_ALIASES).select('source_key,category_code'),
        dbAuthRelation(GLOBAL_CATEGORIES).select('category_code,enabled')
      ]);
      return {
        groups:errorOf(results[0],'小分類'),
        aliases:errorOf(results[1],'來源對應'),
        globalAliases:errorOf(results[2],'全域來源'),
        globalCategories:errorOf(results[3],'全域分類')
      };
  },{enabled:Boolean(scopeId)});
  // Reuse the existing database-side daily aggregate rather than downloading
  // Galaxy articles simply to discover the raw Others source names.
  const existingSources=useAsyncResource(['scope-others-existing-sources',scopeId,scopeData?.galaxy],async()=>{
      const {selectScopeDailyCounts}=await import('./galaxy-query');
      const {text}=await selectScopeDailyCounts(scopeData,{includeUndated:true});
      const totals=new Map();
      for(const row of text||[]){
        const key=sourceKey(row.category);
        if(key)totals.set(key,(totals.get(key)||0)+(Number(row.item_count)||0));
      }
      return [...totals].map(([key,count])=>({key,count}))
        .sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key));
  },{enabled:Boolean(scopeId&&scopeData?.galaxy)});
  const groups=query.data?.groups||[];
  const aliases=query.data?.aliases||[];
  const enabledGlobal=new Set((query.data?.globalCategories||[])
    .filter(row=>row.enabled!==false).map(row=>row.category_code));
  const belongsToOthers=key=>{
    const found=(query.data?.globalAliases||[]).find(row=>sourceKey(row.source_key)===key);
    return !found||found.category_code==='others'||!enabledGlobal.has(found.category_code);
  };
  const othersSourceOptions=useMemo(()=>(existingSources.data||[])
    .filter(item=>belongsToOthers(item.key))
    .filter(item=>!aliases.some(row=>sourceKey(row.source_key)===item.key)),
  [existingSources.data,query.data,aliases]);
  const newGroupKey=sourceKey(groupCode);
  const stagedGroup=CODE.test(newGroupKey)&&groupName.trim()&&!groups.some(row=>row.group_code===newGroupKey)
    ?[{group_code:newGroupKey,display_name:groupName.trim(),enabled:true}]:[];
  const availableGroups=[...groups.filter(row=>(groupEdits[row.group_code]?.enabled??row.enabled)!==false),...stagedGroup];
  const changedGroups=groups.filter(row=>{
    const changes=groupEdits[row.group_code];
    return changes&&(changes.display_name!==undefined&&changes.display_name!==row.display_name
      ||changes.enabled!==undefined&&changes.enabled!==row.enabled);
  });
  const changedAliases=aliases.filter(row=>aliasEdits[row.source_key]&&aliasEdits[row.source_key]!==row.group_code);
  const key=sourceKey(source);
  const canAddGroup=Boolean(groupCode.trim()||groupName.trim());
  const canMap=Boolean(key);
  const hasChanges=canAddGroup||canMap||changedGroups.length>0||changedAliases.length>0;

  async function save(){
    if(busy||query.isPending||query.error)return false;
    if(!hasChanges){setNotice('目前沒有待儲存的變更。');return false;}
    setBusy(true);
    setNotice('');
    try{
      // Validate the complete draft before sending any writes, so a bad
      // alias cannot leave a newly created category behind on failure.
      const allowedKeys=new Set(availableGroups.map(row=>row.group_code));
      for(const row of changedGroups){
        const name=String(groupEdits[row.group_code].display_name??row.display_name).trim();
        if(!name||name.length>80)throw Error('小分類名稱不可空白或超過 80 字。');
      }
      if(canMap){
        if(key.length>120||!belongsToOthers(key))throw Error('來源名稱無效或已由 Admin 指定其他大分類。');
        if(!allowedKeys.has(sourceGroup))throw Error('請先選擇要歸入的小分類。');
      }
      for(const row of changedAliases){
        if(!allowedKeys.has(aliasEdits[row.source_key])||!belongsToOthers(row.source_key))
          throw Error('來源對應包含已停用的小分類或 Admin 已指定的來源。');
      }
      if(canAddGroup){
        if(!CODE.test(newGroupKey)||!groupName.trim()||groupName.trim().length>80)
          throw Error('小分類代碼須為 1–64 字小寫英數，名稱不可空白或超過 80 字。');
        if(groups.some(row=>row.group_code===newGroupKey))throw Error('小分類代碼已存在。');
        const result=await dbAuthRelation(GROUPS)
          .insert({scope_id:scopeId,group_code:newGroupKey,display_name:groupName.trim()});
        errorOf(result,'新增小分類');
      }
      for(const row of changedGroups){
        const change=groupEdits[row.group_code];
        const name=String(change.display_name??row.display_name).trim();
        if(!name||name.length>80)throw Error('小分類名稱不可空白或超過 80 字。');
        const update=await dbAuthRelation(GROUPS)
          .update({display_name:name,enabled:change.enabled??row.enabled})
          .eq('scope_id',scopeId).eq('group_code',row.group_code).select('group_code');
        if(!errorOf(update,'更新小分類').length)throw Error('更新小分類未寫入任何資料。');
      }
      if(canMap){
        if(key.length>120)throw Error('來源名稱不可超過 120 字。');
        if(!belongsToOthers(key))throw Error('這個來源已由 Admin 指定到其他大分類，不能在 Others 重新歸類。');
        if(!allowedKeys.has(sourceGroup))throw Error('請先選擇要歸入的小分類。');
        const result=await dbAuthRelation(ALIASES)
          .upsert({scope_id:scopeId,source_key:key,group_code:sourceGroup},
            {onConflict:'scope_id,source_key'}).select('source_key');
        if(!errorOf(result,'指定來源').length)throw Error('來源對應未寫入任何資料。');
      }
      for(const row of changedAliases){
        const target=aliasEdits[row.source_key];
        if(!allowedKeys.has(target))throw Error('小分類已停用，不能指定來源。');
        if(!belongsToOthers(row.source_key))throw Error('全域大分類已有指定，不能變更該來源。');
        const updated=await dbAuthRelation(ALIASES).update({group_code:target})
          .eq('scope_id',scopeId).eq('source_key',row.source_key).select('source_key');
        if(!errorOf(updated,'更新來源對應').length)throw Error('更新來源對應未寫入任何資料。');
      }
      await mutate(key=>Array.isArray(key)&&key[0]==='scope-others-source-configuration'&&key[1]===scopeId);
      await mutate(key=>Array.isArray(key)&&key[0]==='scope-others-source-summary'&&key[1]===scopeId);
      setGroupCode('');setGroupName('');setSource('');setSourceGroup('');
      setGroupEdits({});setAliasEdits({});
      setNotice('來源分類已儲存。');
      return true;
    }catch(error){
      const message=String(error?.message||error||'儲存失敗');
      setNotice(message);
      dock?.setNotice(message);
      return false;
    }finally{setBusy(false);}
  }

  currentSave.current={save,isDirty:()=>hasChanges,isBusy:()=>busy};
  useEffect(()=>{
    if(!dock?.active||dock.scopeId!==scopeId)return undefined;
    return dock.register({
      save:()=>currentSave.current.save(),
      isDirty:()=>currentSave.current.isDirty(),
      isBusy:()=>currentSave.current.isBusy()
    });
  },[dock?.active,dock?.scopeId,dock?.register,scopeId]);

  return <section className="loc-card scope-feature-card">
    <h2>其他作品來源分類</h2>
    <p className="scope-status">將尚未歸入主要來源的作品整理成自己的分類；不影響其他資料空間或全站主要分類。</p>
    {query.isPending?<p className="scope-status" role="status">載入小分類設定…</p>:null}
    {query.error?<p className="scope-status scope-error" role="alert">{String(query.error.message||query.error)}</p>:null}
    {!query.isPending&&!query.error?<>
      <div className="scope-management-fields">
        <label><span>新增小分類代碼</span>
          <input value={groupCode} maxLength={64} placeholder="例如：blog"
            onChange={event=>setGroupCode(event.target.value)}/></label>
        <label><span>小分類名稱</span>
          <input value={groupName} maxLength={80} placeholder="例如：部落格"
            onChange={event=>setGroupName(event.target.value)}/></label>
      </div>
      <h3>已建立的分類</h3>
      {groups.length?<div className="admin-source-category-grid">
        {groups.map(row=><article className="admin-source-category-card" key={row.group_code}>
          <strong>{row.group_code}</strong>
          <label><span>名稱</span><input maxLength={80}
            value={groupEdits[row.group_code]?.display_name??row.display_name}
            onChange={event=>setGroupEdits(v=>({...v,[row.group_code]:{...v[row.group_code],display_name:event.target.value}}))}/></label>
          <label><span>狀態</span><select className="scope-select"
            value={(groupEdits[row.group_code]?.enabled??row.enabled)?'enabled':'disabled'}
            onChange={event=>setGroupEdits(v=>({...v,[row.group_code]:{...v[row.group_code],enabled:event.target.value==='enabled'}}))}>
            <option value="enabled">啟用</option><option value="disabled">停用</option>
          </select></label>
        </article>)}
      </div>:<p className="scope-status">尚未建立分類。</p>}
      <h3>將來源加入分類</h3>
      {existingSources.isPending?<p className="scope-status" role="status">正在讀取此 Scope 既有來源…</p>:null}
      {existingSources.error?<p className="scope-status scope-error" role="alert">既有來源清單讀取失敗：{String(existingSources.error.message||existingSources.error)}；仍可手動輸入來源。</p>:null}
      <div className="scope-management-fields">
        <label><span>從現有其他來源選取</span>
          <select className="scope-select" value="" disabled={!othersSourceOptions.length}
            onChange={event=>setSource(event.target.value)}>
            <option value="">選擇來源（或手動輸入）</option>
            {othersSourceOptions.map(item=><option key={item.key} value={item.key}>
              {item.key} · {item.count.toLocaleString()} 篇
            </option>)}
          </select></label>
        <label><span>原始來源</span>
          <input value={source} maxLength={120} placeholder="輸入作品的來源名稱"
            onChange={event=>setSource(event.target.value)}/></label>
        <label><span>歸入小分類</span><select className="scope-select" value={sourceGroup}
          onChange={event=>setSourceGroup(event.target.value)}>
          <option value="">選擇小分類</option>
          {availableGroups.map(row=><option key={row.group_code} value={row.group_code}>{row.display_name}</option>)}
        </select></label>
      </div>
      {canMap&&!belongsToOthers(key)?<p className="scope-status scope-error">此來源已由 Admin 歸到其他大分類，不能在這裡細分。</p>:null}
      {aliases.length?<div className="admin-source-alias-grid">
        {aliases.map(row=><article className="admin-source-alias-card" key={row.source_key}>
          <strong>{row.source_key}</strong>
          <label><span>所屬分類</span><select className="scope-select"
            value={aliasEdits[row.source_key]??row.group_code}
            disabled={!belongsToOthers(row.source_key)}
            onChange={event=>setAliasEdits(v=>({...v,[row.source_key]:event.target.value}))}>
            {groups.map(group=><option key={group.group_code} value={group.group_code}>{group.display_name}</option>)}
          </select></label>
          {!belongsToOthers(row.source_key)?<span className="scope-status">Admin 已將此來源調整到其他大分類</span>:null}
        </article>)}
      </div>:<p className="scope-status">尚未設定來源對應；未指定者維持 Others。</p>}
      {notice?<p className="scope-status" role="status">{notice}</p>:null}
      {busy?<p className="scope-status" role="status">正在儲存…</p>:null}
    </>:null}
  </section>;
}
