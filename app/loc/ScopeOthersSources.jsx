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

// This is a Scope-owned, single-level personal classification editor. It must
// never change Admin's work categories or create nested source/group taxonomies.
export default function ScopeOthersSources({scopeId,scopeData=null}){
  const account=useAccount();
  const {mutate}=useSWRConfig();
  const [selected,setSelected]=useState('');
  const [newCode,setNewCode]=useState(()=>`c${createUid8().toLowerCase()}`);
  const [newName,setNewName]=useState('');
  const [groupEdits,setGroupEdits]=useState({});
  const [aliasEdits,setAliasEdits]=useState({});
  const [showAssign,setShowAssign]=useState(false);
  const [source,setSource]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const allowed=Boolean(account.user&&!account.loading&&!account.permissionLoading
    &&account.canManageScopeSync(scopeId));
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
      groups:checked(results[0],'個人分類'),
      aliases:checked(results[1],'作品來源對應'),
      globalAliases:checked(results[2],'全站來源'),
      globalCategories:checked(results[3],'全站分類')
    };
  },{enabled:allowed&&Boolean(scopeId)});
  // The potentially expensive source-name scan is opt-in: no automatic
  // aggregation on entry to Personal Classification.
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
    {enabled:allowed&&showAssign&&Boolean(scopeData?.galaxy)}
  );
  const groups=query.data?.groups||[];
  const aliases=query.data?.aliases||[];
  const creating=selected==='new'||(!selected&&!groups.length);
  const activeCode=selected&&selected!=='new'?selected:groups[0]?.group_code||'';
  const active=creating?null:groups.find(group=>group.group_code===activeCode)||null;
  const enabledGlobal=new Set((query.data?.globalCategories||[])
    .filter(row=>row.enabled!==false).map(row=>row.category_code));
  const belongsToPersonal=key=>{
    const found=(query.data?.globalAliases||[]).find(row=>sourceKey(row.source_key)===key);
    return !found||found.category_code==='others'||!enabledGlobal.has(found.category_code);
  };
  const activeName=creating?newName:(groupEdits[activeCode]?.display_name??active?.display_name??'');
  const activeEnabled=groupEdits[activeCode]?.enabled??active?.enabled??true;
  const targetCode=creating?newCode:activeCode;
  const possibleTargets=groups.filter(row=>(groupEdits[row.group_code]?.enabled??row.enabled)!==false);
  if(creating&&newName.trim())possibleTargets.push({group_code:newCode,display_name:newName.trim(),enabled:true});
  const edits=groups.filter(row=>{
    const change=groupEdits[row.group_code];
    return change&&(change.display_name!==undefined&&change.display_name!==row.display_name
      ||change.enabled!==undefined&&change.enabled!==row.enabled);
  });
  const aliasChanges=aliases.filter(row=>aliasEdits[row.source_key]&&aliasEdits[row.source_key]!==row.group_code);
  const raw=sourceKey(source);
  const adding=Boolean(showAssign&&raw);
  const dirty=Boolean(newName.trim()||adding||edits.length||aliasChanges.length);
  const assigned=aliases.filter(row=>(aliasEdits[row.source_key]??row.group_code)===activeCode);
  const options=useMemo(()=>(existingSources.data||[]).filter(row=>
    !aliases.some(item=>sourceKey(item.source_key)===row.key)
  ),[existingSources.data,aliases]);
  const knownNames=new Set(groups.map(row=>String(row.display_name||'').trim().toLocaleLowerCase()));

  async function save(){
    if(busy||query.isPending||query.error||!allowed)return false;
    if(!dirty){setNotice('沒有待儲存的修改。');return true;}
    const creates=Boolean(newName.trim());
    if(creates&&(newName.trim().length>80||knownNames.has(newName.trim().toLocaleLowerCase()))){
      setNotice('新增的個人分類名稱不可重複，且不得超過 80 字。');return false;
    }
    const codes=new Set(possibleTargets.map(item=>item.group_code));
    const duplicateNames=new Set();
    for(const row of groups){
      const name=String(groupEdits[row.group_code]?.display_name??row.display_name).trim();
      if(!name||name.length>80){setNotice('分類名稱須為 1–80 字。');return false;}
      const norm=name.toLocaleLowerCase();
      if(duplicateNames.has(norm)||creates&&norm===newName.trim().toLocaleLowerCase()){
        setNotice('個人分類名稱不能重複。');return false;
      }
      duplicateNames.add(norm);
    }
    if(adding){
      if(raw.length>120||!belongsToPersonal(raw)){setNotice('此來源屬於全站作品分類，不可重複指定。');return false;}
      if(!codes.has(targetCode)){setNotice('請先選擇有效的個人分類。');return false;}
    }
    for(const row of aliasChanges){
      if(!codes.has(aliasEdits[row.source_key])||!belongsToPersonal(row.source_key)){
        setNotice('原始來源只能移到已啟用的個人分類。');return false;
      }
    }
    setBusy(true);setNotice('');
    try{
      if(creates){
        const result=await dbAuthRelation(GROUPS)
          .insert({scope_id:scopeId,group_code:newCode,display_name:newName.trim()})
          .select('group_code');
        if(!checked(result,'新增個人分類').length)throw Error('新增個人分類未寫入。');
      }
      for(const row of edits){
        const change=groupEdits[row.group_code];
        const result=await dbAuthRelation(GROUPS)
          .update({display_name:String(change.display_name??row.display_name).trim(),enabled:change.enabled??row.enabled})
          .eq('scope_id',scopeId).eq('group_code',row.group_code)
          .select('group_code');
        if(!checked(result,'更新個人分類').length)throw Error('分類未更新，請確認 Scope 權限。');
      }
      if(adding){
        const result=await dbAuthRelation(ALIASES)
          .upsert({scope_id:scopeId,source_key:raw,group_code:targetCode},
            {onConflict:'scope_id,source_key'}).select('source_key');
        if(!checked(result,'指定作品來源').length)throw Error('來源對應未儲存。');
      }
      for(const row of aliasChanges){
        const result=await dbAuthRelation(ALIASES).update({group_code:aliasEdits[row.source_key]})
          .eq('scope_id',scopeId).eq('source_key',row.source_key).select('source_key');
        if(!checked(result,'調整作品來源').length)throw Error('來源對應未更新。');
      }
      await query.refetch();
      await mutate(key=>Array.isArray(key)&&(
        key[0]==='scope-others-source-summary'&&key[1]===scopeId||
        key[0]==='own-scope-source-catalog'&&key[1]===scopeId
      ));
      if(creates){setSelected(newCode);setNewCode(`c${createUid8().toLowerCase()}`);}
      setNewName('');setGroupEdits({});setAliasEdits({});setSource('');
      setNotice('個人分類已儲存。');
      return true;
    }catch(error){
      await query.refetch();
      setNotice(String(error?.message||error));
      return false;
    }finally{setBusy(false);}
  }
  function discard(){
    setNewName('');setGroupEdits({});setAliasEdits({});setSource('');setNotice('');
  }
  useEditDockForm({save,isDirty:()=>dirty,isBusy:()=>busy,discard});

  if(!allowed)return <section className="loc-card scope-status scope-error" role="alert">需要此 Scope 的管理權限才能修改個人分類。</section>;
  return <section className="loc-card classification-page classification-page--personal">
    <header className="classification-page__intro">
      <p className="loc-eyebrow">Scope · {scopeId}</p>
      <h2>個人分類</h2>
      <p>只管理這個 Scope 自己的分類。選擇左側分類後再編輯；不會修改 Admin 的作品分類。</p>
    </header>
    {query.isPending?<p className="scope-status" role="status">正在讀取個人分類…</p>:null}
    {query.error?<p className="scope-status scope-error" role="alert">{String(query.error.message||query.error)}
      <button type="button" className="loc-button" onClick={query.refetch}>重新讀取</button>
    </p>:null}
    {!query.isPending&&!query.error?<div className="classification-page__layout">
      <nav className="classification-page__list" aria-label="個人分類清單">
        <h3>我的分類</h3>
        <button className="classification-page__choice classification-page__create" type="button"
          aria-pressed={creating} disabled={busy} aria-controls="personal-classification-editor"
          onClick={()=>{setSelected('new');setShowAssign(false);setSource('');setNotice('');}}>
          <strong>＋ 新增個人分類</strong>
          <small>獨立新增一個分類</small>
        </button>
        {groups.map(row=>{
          const assignedCount=aliases.filter(alias=>alias.group_code===row.group_code).length;
          const edited=Boolean(groupEdits[row.group_code]);
          return <button type="button" key={row.group_code} className="classification-page__choice"
            aria-pressed={!creating&&activeCode===row.group_code}
            aria-controls="personal-classification-editor" disabled={busy}
            onClick={()=>{setSelected(row.group_code);setShowAssign(false);setSource('');setNotice('');}}>
            <strong>{row.display_name}</strong>
            <small>{edited?'尚未儲存':(row.enabled===false?'已停用 · ':'')+assignedCount+' 個原始來源'}</small>
          </button>;
        })}
      </nav>
      <div className="classification-page__editor" id="personal-classification-editor">
        {creating?<div className="classification-page__form">
          <p className="loc-eyebrow">新增</p><h3>建立個人分類</h3>
          <label className="classification-page__field"><span>分類名稱</span>
            <input required maxLength={80} value={newName} disabled={busy} placeholder="輸入分類名稱"
              onChange={event=>{setNewName(event.target.value);setNotice('');}}/></label>
          <p className="scope-status">新分類只屬於 {scopeId}，不影響其他 Scope。</p>
        </div>:active?<div className="classification-page__form">
          <p className="loc-eyebrow">個人分類設定</p><h3>{active.display_name}</h3>
          <p className="scope-status">分類代碼：<code>{active.group_code}</code></p>
          <label className="classification-page__field"><span>分類名稱</span>
            <input maxLength={80} required value={activeName} disabled={busy}
              onChange={event=>{setGroupEdits(prev=>({...prev,[activeCode]:{...prev[activeCode],display_name:event.target.value}}));setNotice('');}}/>
          </label>
          <label className="classification-page__field"><span>分類狀態</span>
            <select className="scope-select" value={activeEnabled?'on':'off'} disabled={busy}
              onChange={event=>setGroupEdits(prev=>({...prev,[activeCode]:{...prev[activeCode],enabled:event.target.value==='on'}}))}>
              <option value="on">啟用</option><option value="off">停用</option>
            </select>
          </label>
          <div className="classification-page__assigned">
            <h4>歸入本分類的原始來源</h4>
            {assigned.length?<div className="classification-page__assigned-list">
              {assigned.map(row=><label key={row.source_key}>
                <span>{row.source_key}</span>
                <select className="scope-select" aria-label={row.source_key+' 所屬個人分類'}
                  value={aliasEdits[row.source_key]??row.group_code} disabled={busy}
                  onChange={event=>setAliasEdits(prev=>({...prev,[row.source_key]:event.target.value}))}>
                  {possibleTargets.map(item=><option key={item.group_code} value={item.group_code}>
                    {groupEdits[item.group_code]?.display_name??item.display_name}
                  </option>)}
                </select>
              </label>)}
            </div>:<p className="scope-status">目前尚未指定原始來源。</p>}
          </div>
        </div>:null}
        {!creating&&active?<div className="classification-page__assign">
          <button type="button" className="loc-button" aria-expanded={showAssign} disabled={busy}
            onClick={()=>{setShowAssign(v=>!v);setSource('');}}>
            {showAssign?'收合原始來源設定':'指定原始來源'}
          </button>
          {showAssign?<div className="classification-page__assign-fields">
            <p className="scope-status">只歸類尚未由全站作品分類管理的原始來源；不是新增一層分類。</p>
            {existingSources.isPending?<p role="status" className="scope-status">正在查詢可選來源…</p>:null}
            {existingSources.error?<p role="alert" className="scope-status scope-error">無法取得候選清單，可手動輸入原始來源。</p>:null}
            {options.length?<label className="classification-page__field"><span>已有的原始來源</span>
              <select className="scope-select" value={options.some(item=>item.key===raw)?raw:''}
                onChange={event=>setSource(event.target.value)} disabled={busy}>
                <option value="">請選擇（或直接輸入）</option>
                {options.filter(item=>belongsToPersonal(item.key)).map(item=><option key={item.key} value={item.key}>
                  {item.key} · {item.count.toLocaleString()} 篇
                </option>)}
              </select>
            </label>:null}
            <label className="classification-page__field"><span>原始來源名稱</span>
              <input maxLength={120} value={source} disabled={busy} placeholder="輸入作品現有的來源名稱"
                onChange={event=>setSource(event.target.value)}/></label>
            {raw&&!belongsToPersonal(raw)?<p className="scope-status scope-error" role="alert">此來源屬於全站作品分類，不能重複指定。</p>:null}
          </div>:null}
        </div>:null}
        <div className="classification-page__actions">
          <button type="button" className="loc-button primary" onClick={save}
            disabled={busy||!dirty}>{busy?'儲存中…':creating?'建立分類':'儲存修改'}</button>
          <button type="button" className="loc-button" onClick={discard} disabled={busy||!dirty}>放棄草稿</button>
        </div>
        {notice?<p className="scope-status" aria-live="polite" role="status">{notice}</p>:null}
      </div>
    </div>:null}
  </section>;
}
