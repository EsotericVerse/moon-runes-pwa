'use client';
import {useUiLocale} from '../i18n/ui-locale';
import UiText,{useUiText} from '../i18n/UiText';

import {useEffect,useState} from 'react';
import {UI_LOCALE_OPTIONS,normalizeUiLocale} from '../i18n/ui-copy';
import {THEME_SLOTS} from '../modular/theme-registry';
import {ScopeFeatureToggles} from '../modular/ui';
import {selectScopeConfig} from './scope-data';
import {updateRows} from './db-client.mjs';
import {useAccount} from './use-account';
import {ObjectEditor} from './BlockNoteEditor';

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
  const {locale}=useUiLocale();
  const uiT=useUiText();
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
      if(active)setMessage(error?.message||uiT('uiExtra.scopeSettings.loadFailed'));
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
      if(!displayName)throw new Error(uiT('uiExtra.scopeSettings.displayRequired'));
      if(!table)throw new Error(uiT('uiExtra.scopeSettings.unavailable'));
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
      setMessage(uiT('uiExtra.scopeSettings.saved'));
    }catch(error){
      setMessage(error?.message||uiT('uiExtra.scopeSettings.saveFailed'));
    }finally{
      setBusy(false);
    }
  }

  return <section className="loc-card scope-feature-card">
    <p className="loc-eyebrow"><UiText id="uiExtra.scopeSettings.personalTitle"/></p>
    <h2><UiText id="uiExtra.scopeSettings.miscellaneous"/></h2>
    {loading?<p className="scope-status"><UiText id="common.loading"/></p>:null}
    {!loading?<form onSubmit={save}>
      <div className="scope-management-fields">
        <label>
          <span><UiText id="uiExtra.scopeSettings.displayName"/></span>
          <input className="scope-search-input" value={draft.display_name||''} onChange={event=>change('display_name',event.target.value)} required/>
        </label>
        <label>
          <span><UiText id="common.theme"/></span>
          <select className="scope-select" value={draft.theme||'system-default'} onChange={event=>change('theme',event.target.value)}>
            <option value="system-default"><UiText id="uiExtra.scopeSettings.systemDayNight"/></option>
            {THEME_SLOTS.map(theme=><option value={theme.id} key={theme.id}>{theme.label}</option>)}
          </select>
        </label>
        <label>
          <span><UiText id="uiExtra.scopeSettings.defaultLocale"/></span>
          <select className="scope-select" value={normalizeUiLocale(draft.locale)} onChange={event=>change('locale',normalizeUiLocale(event.target.value))}>
            {UI_LOCALE_OPTIONS.map(option=><option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      <ObjectEditor mode="fields" fields={[
        {key:'search_intro',kind:'rich',label:<UiText id="uiExtra.scopeSettings.searchIntro"/>,
          editorKey:'scope-intro:'+scopeId,content:draft.search_intro||'',canInsertImage:false,
          onPlainTextChange:value=>change('search_intro',value)},
        {key:'search_aliases',kind:'rich',label:<UiText id="uiExtra.scopeSettings.searchAliases"/>,
          editorKey:'scope-aliases:'+scopeId,content:aliases,canInsertImage:false,
          onPlainTextChange:setAliases}
      ]}/>

      <fieldset className="scope-management-wide-field">
        <legend><UiText id="uiExtra.scopeSettings.publicFeatures"/></legend>
        <ScopeFeatureToggles value={draft} onChange={change}/>
      </fieldset>

      {message?<p className="scope-status" role="status">{message}</p>:null}
      <div className="scope-tabs"><button type="submit" disabled={busy}><UiText id={busy?'common.saving':'uiExtra.scopeSettings.update'}/></button></div>
    </form>:null}
  </section>;
}
