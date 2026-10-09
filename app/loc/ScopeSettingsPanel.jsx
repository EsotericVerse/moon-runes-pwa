'use client';

import {useEffect,useState} from 'react';
import {UI_LOCALE_OPTIONS,normalizeUiLocale} from '../i18n/ui-copy';
import {THEME_SLOTS} from '../modular/theme-registry';
import {selectScopeConfig} from './scope-data';
import {updateRows} from './db-client.mjs';
import {useAccount} from './use-account';

const EMPTY={
  display_name:'',
  search_intro:'',
  search_aliases:[],
  theme:'system-default',
  locale:'zh-Hant',
  search_able:true,
  statistics_able:true,
  culture_able:true
};

function aliasText(value){
  return (Array.isArray(value)?value:[]).join('\n');
}
function aliasList(value){
  return [...new Set(String(value||'').split(/[\n,，]/g).map(item=>item.trim()).filter(Boolean))];
}

export default function ScopeSettingsPanel({scopeId}){
  const account=useAccount();
  const [draft,setDraft]=useState(EMPTY);
  const [aliases,setAliases]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    let active=true;
    setLoading(true);setMessage('');
    selectScopeConfig(scopeId).then(row=>{
      if(!active)return;
      const next={...EMPTY,...row};
      setDraft(next);
      setAliases(aliasText(next.search_aliases));
    }).catch(error=>{
      if(active)setMessage(error?.message||'Scope 設定讀取失敗。');
    }).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false};
  },[scopeId]);

  if(!account.canManageScopeSync(scopeId))return null;
  const table=account.scopeDataFor(scopeId)?.config;
  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));

  async function save(event){
    event.preventDefault();
    setBusy(true);setMessage('');
    try{
      const displayName=String(draft.display_name||'').trim();
      if(!displayName)throw new Error('顯示名稱不可為空。');
      if(!table)throw new Error('Scope config table 未解析。');
      const searchAliases=aliasList(aliases);
      await updateRows(table,{
        display_name:displayName,
        search_intro:String(draft.search_intro||'').trim(),
        search_aliases:searchAliases,
        theme:String(draft.theme||'system-default'),
        locale:normalizeUiLocale(draft.locale),
        search_able:draft.search_able!==false,
        statistics_able:draft.statistics_able!==false,
        culture_able:draft.culture_able!==false,
        updated_at:new Date().toISOString()
      },{filters:[{column:'id',operator:'eq',value:scopeId}]});
      setDraft(current=>({...current,display_name:displayName,search_aliases:searchAliases}));
      setAliases(aliasText(searchAliases));
      setMessage('已更新 Scope 基本設定。重新整理公開頁後即會使用新設定。');
    }catch(error){
      setMessage(error?.message||'Scope 設定儲存失敗。');
    }finally{
      setBusy(false);
    }
  }

  return <section className="loc-card scope-feature-card">
    <p className="loc-eyebrow">Scope Settings</p>
    <h2>基本與雜項設定</h2>
    {loading?<p className="scope-status">讀取中…</p>:null}
    {!loading?<form onSubmit={save}>
      <div className="scope-management-fields">
        <label>
          <span>顯示名稱</span>
          <input className="scope-search-input" value={draft.display_name||''} onChange={event=>change('display_name',event.target.value)} required/>
        </label>
        <label>
          <span>主題</span>
          <select className="scope-select" value={draft.theme||'system-default'} onChange={event=>change('theme',event.target.value)}>
            <option value="system-default">系統預設（日／夜自動）</option>
            {THEME_SLOTS.map(theme=><option value={theme.id} key={theme.id}>{theme.label}</option>)}
          </select>
        </label>
        <label>
          <span>預設語系</span>
          <select className="scope-select" value={normalizeUiLocale(draft.locale)} onChange={event=>change('locale',normalizeUiLocale(event.target.value))}>
            {UI_LOCALE_OPTIONS.map(option=><option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      <label className="scope-management-wide-field">
        <span>搜尋頁 Scope 介紹</span>
        <textarea className="scope-search-input" rows={4} value={draft.search_intro||''} onChange={event=>change('search_intro',event.target.value)} placeholder="精確搜尋 Scope 名稱或別名時顯示的介紹文字。"/>
      </label>

      <label className="scope-management-wide-field">
        <span>搜尋別名</span>
        <textarea className="scope-search-input" rows={5} value={aliases} onChange={event=>setAliases(event.target.value)} placeholder={'每行一個，例如：\nlo3rwang\nLucas Oscar Wang\n政德'}/>
      </label>

      <fieldset className="scope-management-wide-field">
        <legend>公開功能</legend>
        <div className="scope-editor-options">
          <label><input type="checkbox" checked={draft.search_able!==false} onChange={event=>change('search_able',event.target.checked)}/>搜尋</label>
          <label><input type="checkbox" checked={draft.statistics_able!==false} onChange={event=>change('statistics_able',event.target.checked)}/>統計</label>
          <label><input type="checkbox" checked={draft.culture_able!==false} onChange={event=>change('culture_able',event.target.checked)}/>文化</label>
        </div>
      </fieldset>

      {message?<p className="scope-status" role="status">{message}</p>:null}
      <div className="scope-tabs"><button type="submit" disabled={busy}>{busy?'儲存中…':'更新設定'}</button></div>
    </form>:null}
  </section>;
}
