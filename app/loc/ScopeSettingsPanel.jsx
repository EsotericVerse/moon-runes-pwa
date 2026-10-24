'use client';
import {useUiSection} from '../i18n/ui-locale';
import UiText,{useUiText} from '../i18n/UiText';

import {useEffect,useRef,useState} from 'react';
import {registerDefaultSection} from '../i18n/ui-copy';
import {THEME_SLOTS} from '../modular/theme-registry';
import {invalidatePublicScopeMetadata,selectScopeConfig} from './scope-data';
import {updateRows} from './db-client.mjs';
import {useAccount} from './use-account';
import {useEditDock} from '../modular/edit-dock';
import scopeSettingsZh from '../i18n/sections/uiExtra.scopeSettings.zh_tw.js';
registerDefaultSection('uiExtra.scopeSettings',scopeSettingsZh);

const EMPTY={theme:'system-default'};

export default function ScopeSettingsPanel({scopeId}){
  useUiSection('uiExtra.scopeSettings');
  const uiT=useUiText();
  const account=useAccount();
  const editDock=useEditDock();
  const dockActions=useRef(null);
  const [savedTheme,setSavedTheme]=useState('system-default');
  const [draft,setDraft]=useState(EMPTY);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    let active=true;
    setLoading(true);setMessage('');
    selectScopeConfig(scopeId).then(row=>{
      if(!active)return;
      const theme=row?.theme||'system-default';
      setSavedTheme(theme);
      setDraft({theme});
    }).catch(error=>{
      if(active)setMessage(error?.message||uiT('uiExtra.scopeSettings.loadFailed'));
    }).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false};
  },[scopeId]);

  useEffect(()=>{
    if(!editDock?.active||editDock.scopeId!==scopeId||!account.canManageScopeSync(scopeId))return undefined;
    return editDock.register({
      save:()=>dockActions.current.save(),
      isDirty:()=>dockActions.current.isDirty(),
      isBusy:()=>dockActions.current.isBusy()
    });
  },[editDock?.active,editDock?.scopeId,editDock?.register,scopeId,account.role]);
  if(!account.canManageScopeSync(scopeId))return null;
  const table=account.scopeDataFor(scopeId)?.config;
  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));

  async function save(event){
    event?.preventDefault?.();
    if(busy||loading)return false;
    setBusy(true);setMessage('');
    try{
      if(!table)throw new Error(uiT('uiExtra.scopeSettings.unavailable'));
      await updateRows(table,{
        theme:String(draft.theme||'system-default'),
        updated_at:new Date().toISOString()
      },{filters:[{column:'id',operator:'eq',value:scopeId}]});
      invalidatePublicScopeMetadata();
      setSavedTheme(String(draft.theme||'system-default'));
      setMessage(uiT('uiExtra.scopeSettings.saved'));
      return true;
    }catch(error){
      setMessage(error?.message||uiT('uiExtra.scopeSettings.saveFailed'));
      return false;
    }finally{
      setBusy(false);
    }
  }

  dockActions.current={save:()=>save(),isDirty:()=>draft.theme!==savedTheme,isBusy:()=>busy||loading};
  return <section className="loc-card scope-feature-card">
    <p className="loc-eyebrow"><UiText id="uiExtra.scopeSettings.personalTitle"/></p>
    <h2><UiText id="uiExtra.scopeSettings.miscellaneous"/></h2>
    {loading?<p className="scope-status"><UiText id="common.loading"/></p>:null}
    {!loading?<form onSubmit={save}>
      <div className="scope-management-fields">
        <label>
          <span><UiText id="common.theme"/></span>
          <select className="scope-select" value={draft.theme||'system-default'} onChange={event=>change('theme',event.target.value)}>
            <option value="system-default"><UiText id="uiExtra.scopeSettings.systemDayNight"/></option>
            {THEME_SLOTS.map(theme=><option value={theme.id} key={theme.id}>{theme.label}</option>)}
          </select>
        </label>
      </div>

      {message?<p className="scope-status" role="status">{message}</p>:null}
      <div className="scope-tabs"><button type="submit" disabled={busy}><UiText id={busy?'common.saving':'uiExtra.scopeSettings.update'}/></button></div>
    </form>:null}
  </section>;
}
