'use client';

import {useMemo,useState} from 'react';
import {useSWRConfig} from 'swr';
import {useAsyncResource} from './use-async-resource';
import {dbAuthRelation} from './db-client.mjs';
import {useEditDockForm} from '../modular/edit-dock';
import {useAccount} from './use-account';
import {createUid8} from './uid';

const GROUPS='silver.statistics_scope_others_groups';
const ALIASES='silver.statistics_scope_others_aliases';
const GLOBAL_CATEGORIES='silver.statistics_source_categories';
const GLOBAL_ALIASES='silver.statistics_source_aliases';
const sourceKey=value=>String(value||'').trim().toLowerCase();
const checked=(result,label)=>{
  if(result.error)throw new Error(label+'：'+result.error.message);
  return result.data||[];
};

// One flat, Scope-owned classification list. Existing source-name assignments
// are mappings, not a second classification hierarchy.
export default function ScopeOthersSources({scopeId,scopeData=null}){
  const account=useAccount();
  const {mutate}=useSWRConfig();
  const [newCode,setNewCode]=useState(()=>`c${createUid8().toLowerCase()}`);
  const [newName,setNewName]=useState('');
  const [groupEdits,setGroupEdits]=useState({});
  const [aliasEdits,setAliasEdits]=useState({});
  const [showAssignments,setShowAssignments]=useState(false);
  const [source,setSource]=useState('');
  const [sourceGroup,setSourceGroup]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const allowed=Boolean(account.user&&!account.loading&&!account.permissionLoading
    &&account.canManageScopeSync(scopeId));

  const query=useAsyncResource(['scope-others-source-configuration',scopeId],async()=>{
    const [groups,aliases,globalAliases,globalCategories]=await Promise.all([
      dbAuthRelation(GROUPS).select('scope_id,group_code,display_name,sort_order,enabled')
        .eq('scope_id',scopeId).order('sort_order').order('group_code'),
      dbAuthRelation(ALIASES).select('scope_id,source_key,group_code')
        .eq('scope_id',scopeId).order('source_key'),
      dbAuthRelation(GLOBAL_ALIASES).select('source_key,category_code'),
      dbAuthRelation(GLOBAL_CATEGORIES).select('category_code,enabled')
    ]);
    return {
      groups:checked(groups,'個人分類'),
      aliases:checked(aliases,'作品來源對應'),
      globalAliases:checked(globalAliases,'全站來源'),
      globalCategories:checked(globalCategories,'全站分類')
    };
  },{enabled:allowed&&Boolean(scopeId)});

  // Opening the original-source tool is the only trigger for the potentially
  // large daily aggregate. Ordinary inline name editing performs no such scan.
  const existingSources=useAsyncResource(
    ['scope-others-existing-sources',scopeId,scopeData?.galaxy],
    async()=>{
      const {selectScopeDailyCounts}=await import('./galaxy-query');
      const {text}=await selectScopeDailyCounts(scopeData,{includeUndated:true});
      const totals=new Map();
      for(const row of text||[]){
        const key=sourceKey(row.category);
        if(key)totals.set(key,(totals.get(key)||0)+(Number(row.item_count)||0));
      }
      return [...totals].map(([key,count])=>({key,count}))
        .sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key));
    },
    {enabled:allowed&&showAssignments&&Boolean(scopeData?.galaxy)}
  );

  const groups=query.data?.groups||[];
  const aliases=query.data?.aliases||[];
  const globalEnabled=new Set((query.data?.globalCategories||[])
    .filter(row=>row.enabled!==false).map(row=>row.category_code));
  const belongsToPersonal=key=>{
    const global=(query.data?.globalAliases||[])
      .find(row=>sourceKey(row.source_key)===key);
    return !global||global.category_code==='others'||!globalEnabled.has(global.category_code);
  };
  const edits=groups.filter(row=>{
    const change=groupEdits[row.group_code];
    return change&&(change.display_name!==undefined
        &&String(change.display_name).trim()!==String(row.display_name||'').trim()
      ||change.enabled!==undefined&&change.enabled!==row.enabled);
  });
  const aliasChanges=aliases.filter(row=>aliasEdits[row.source_key]
    &&aliasEdits[row.source_key]!==row.group_code);
  const raw=sourceKey(source);
  const creating=Boolean(newName.trim());
  const adding=Boolean(showAssignments&&raw);
  const dirty=Boolean(creating||adding||edits.length||aliasChanges.length);
  const enabledGroups=groups.filter(row=>
    (groupEdits[row.group_code]?.enabled??row.enabled)!==false);
  const targetGroups=[
    ...enabledGroups.map(row=>({
      code:row.group_code,label:String(groupEdits[row.group_code]?.display_name??row.display_name)
    })),
    ...(creating?[{code:newCode,label:newName.trim()}]:[])
  ];
  const options=useMemo(()=>(existingSources.data||[]).filter(row=>
    !aliases.some(alias=>sourceKey(alias.source_key)===row.key)
  ),[existingSources.data,aliases]);
  const reset=()=>{
    setNewName('');setGroupEdits({});setAliasEdits({});
    setSource('');setSourceGroup('');setNotice('');
  };

  async function save(){
    if(busy||query.isPending||query.error||!allowed)return false;
    if(!dirty){setNotice('目前沒有待儲存的修改。');return true;}
    const names=new Set();
    for(const row of groups){
      const name=String(groupEdits[row.group_code]?.display_name??row.display_name).trim();
      const norm=name.toLocaleLowerCase();
      if(!name||name.length>80){setNotice('分類名稱須為 1–80 字。');return false;}
      if(names.has(norm)){setNotice('個人分類名稱不能重複。');return false;}
      names.add(norm);
    }
    if(creating){
      const label=newName.trim();
      if(label.length>80||names.has(label.toLocaleLowerCase())){
        setNotice('新增分類名稱不得重複或超過 80 字。');return false;
      }
      if(groups.some(row=>row.group_code===newCode)){
        setNotice('新分類代碼重複，請重試。');return false;
      }
    }
    const codes=new Set(targetGroups.map(row=>row.code));
    if(adding){
      if(raw.length>120||!belongsToPersonal(raw)){
        setNotice('此原始來源已屬於全站作品分類，無法指定為個人分類。');return false;
      }
      if(!codes.has(sourceGroup)){
        setNotice('請選擇原始來源的個人分類。');return false;
      }
    }
    for(const row of aliasChanges){
      if(!codes.has(aliasEdits[row.source_key])||!belongsToPersonal(row.source_key)){
        setNotice('原始來源只能移到已啟用的個人分類。');return false;
      }
    }
    setBusy(true);setNotice('');
    try{
      if(creating){
        const result=await dbAuthRelation(GROUPS)
          .insert({scope_id:scopeId,group_code:newCode,display_name:newName.trim()})
          .select('group_code');
        if(!checked(result,'新增個人分類').length)throw Error('新增個人分類未寫入。');
      }
      for(const row of edits){
        const change=groupEdits[row.group_code];
        const result=await dbAuthRelation(GROUPS)
          .update({display_name:String(change.display_name??row.display_name).trim(),
            enabled:change.enabled??row.enabled})
          .eq('scope_id',scopeId).eq('group_code',row.group_code)
          .select('group_code');
        if(!checked(result,'更新個人分類').length)throw Error('分類未更新，請確認 Scope 權限。');
      }
      if(adding){
        const result=await dbAuthRelation(ALIASES)
          .upsert({scope_id:scopeId,source_key:raw,group_code:sourceGroup},
            {onConflict:'scope_id,source_key'}).select('source_key');
        if(!checked(result,'指定作品來源').length)throw Error('來源對應未儲存。');
      }
      for(const row of aliasChanges){
        const result=await dbAuthRelation(ALIASES)
          .update({group_code:aliasEdits[row.source_key]})
          .eq('scope_id',scopeId).eq('source_key',row.source_key)
          .select('source_key');
        if(!checked(result,'調整作品來源').length)throw Error('來源對應未更新。');
      }
      await query.refetch();
      await mutate(key=>Array.isArray(key)&&(
        key[0]==='scope-others-source-summary'&&key[1]===scopeId||
        key[0]==='own-scope-source-catalog'&&key[1]===scopeId
      ));
      if(creating)setNewCode(`c${createUid8().toLowerCase()}`);
      reset();
      setNotice('個人分類已儲存。');
      return true;
    }catch(error){
      setNotice(String(error?.message||error));
      return false;
    }finally{setBusy(false);}
  }

  useEditDockForm({save,isDirty:()=>dirty,isBusy:()=>busy,discard:reset});
  if(!allowed)return <section className="loc-card scope-status scope-error" role="alert">
    需要此 Scope 的管理權限才能修改個人分類。
  </section>;
  return <section className="loc-card classification-inline classification-inline--personal">
    <header className="classification-inline__header">
      <h2>個人分類</h2>
      <p>直接編輯此 Scope 的分類名稱及狀態，再按儲存。這裡不修改 Admin 的作品分類。</p>
    </header>
    {query.isPending?<p className="scope-status" role="status">正在讀取個人分類…</p>:null}
    {query.error?<p className="scope-status scope-error" role="alert">
      {String(query.error.message||query.error)}
      <button type="button" className="loc-button" onClick={()=>query.refetch()}>重新讀取</button>
    </p>:null}
    {!query.isPending&&!query.error?<form onSubmit={event=>{event.preventDefault();void save();}}>
      <div className="classification-inline__list">
        {groups.map(row=>{
          const name=String(groupEdits[row.group_code]?.display_name??row.display_name);
          const enabled=groupEdits[row.group_code]?.enabled??row.enabled;
          return <div className="classification-inline__row classification-inline__row--personal" key={row.group_code}>
            <label className="classification-inline__field">
              <span>分類名稱</span>
              <input type="text" required maxLength={80} disabled={busy}
                aria-label={'分類名稱：'+row.display_name} value={name}
                onChange={event=>{
                  setGroupEdits(prev=>({...prev,[row.group_code]:{
                    ...prev[row.group_code],display_name:event.target.value
                  }}));setNotice('');
                }}/>
            </label>
            <label className="classification-inline__field classification-inline__field--state">
              <span>狀態</span>
              <select className="scope-select" disabled={busy} value={enabled?'enabled':'disabled'}
                aria-label={'分類狀態：'+row.display_name}
                onChange={event=>{
                  setGroupEdits(prev=>({...prev,[row.group_code]:{
                    ...prev[row.group_code],enabled:event.target.value==='enabled'
                  }}));setNotice('');
                }}>
                <option value="enabled">啟用</option>
                <option value="disabled">停用</option>
              </select>
            </label>
            <span className="classification-inline__code">{row.group_code}</span>
          </div>;
        })}
        <div className="classification-inline__row classification-inline__row--new">
          <label className="classification-inline__field">
            <span>新增個人分類</span>
            <input type="text" maxLength={80} disabled={busy}
              placeholder="輸入新分類名稱" value={newName}
              onChange={event=>{setNewName(event.target.value);setNotice('');}}/>
          </label>
        </div>
      </div>
      <details className="classification-inline__details"
        onToggle={event=>setShowAssignments(event.currentTarget.open)}>
        <summary>原始來源歸屬（需要時再開啟）</summary>
        <div className="classification-inline__details-body">
          <p className="scope-status">原始來源只是對應到個人分類，並不是下一層群組。</p>
          {aliases.length?<div className="classification-inline__assignments">
            {aliases.map(row=><label key={row.source_key} className="classification-inline__assignment">
              <span>{row.source_key}</span>
              <select className="scope-select" disabled={busy}
                aria-label={row.source_key+' 所屬個人分類'}
                value={aliasEdits[row.source_key]??row.group_code}
                onChange={event=>{setAliasEdits(prev=>({...prev,[row.source_key]:event.target.value}));setNotice('');}}>
                {groups.map(group=><option key={group.group_code} value={group.group_code}
                  disabled={(groupEdits[group.group_code]?.enabled??group.enabled)===false
                    &&group.group_code!==(aliasEdits[row.source_key]??row.group_code)}>
                  {groupEdits[group.group_code]?.display_name??group.display_name}
                </option>)}
              </select>
            </label>)}
          </div>:<p className="scope-status">目前沒有已指定的原始來源。</p>}
          {existingSources.isPending?<p role="status" className="scope-status">正在查詢可選來源…</p>:null}
          {existingSources.error?<p role="alert" className="scope-status scope-error">來源清單無法載入，可手動輸入。</p>:null}
          <div className="classification-inline__assignment">
            <div className="classification-inline__field">
              {options.some(item=>belongsToPersonal(item.key))?<label className="classification-inline__field">
                <span>選擇現有來源</span>
                <select className="scope-select"
                  disabled={busy} value={options.some(item=>item.key===raw)?raw:''}
                  onChange={event=>{setSource(event.target.value);setNotice('');}}>
                  <option value="">選擇現有來源（或手動輸入）</option>
                  {options.filter(item=>belongsToPersonal(item.key)).map(item=>
                    <option key={item.key} value={item.key}>{item.key} · {item.count.toLocaleString()} 篇</option>)}
                </select>
              </label>:null}
              <label className="classification-inline__field">
                <span>原始來源名稱</span>
                <input type="text" maxLength={120} value={source} disabled={busy}
                  placeholder="輸入原始來源名稱" onChange={event=>{setSource(event.target.value);setNotice('');}}/>
              </label>
            </div>
            <label className="classification-inline__field">
              <span>對應至個人分類</span>
              <select className="scope-select" value={sourceGroup} disabled={busy||!targetGroups.length}
                onChange={event=>{setSourceGroup(event.target.value);setNotice('');}}>
                <option value="">選擇個人分類</option>
                {targetGroups.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}
              </select>
            </label>
          </div>
          {raw&&!belongsToPersonal(raw)?<p className="scope-status scope-error" role="alert">
            此來源由全站作品分類管理，不能在個人分類重新指定。
          </p>:null}
        </div>
      </details>
      <div className="classification-inline__actions">
        <button type="submit" className="loc-button primary" disabled={busy||!dirty}>
          {busy?'儲存中…':'儲存修改'}
        </button>
        <button type="button" className="loc-button" disabled={busy||!dirty} onClick={reset}>還原</button>
        {dirty?<span className="scope-status">尚有未儲存的修改</span>:null}
      </div>
    </form>:null}
    {notice?<p className="scope-status" role="status" aria-live="polite">{notice}</p>:null}
  </section>;
}
