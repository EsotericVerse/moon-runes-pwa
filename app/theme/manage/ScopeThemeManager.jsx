'use client';

import {useEffect,useMemo,useState} from 'react';
import {DEFAULT_ROTATION_SCHEDULE,SCOPE_THEME_SETTINGS_KEY,SIMPLE_SCOPE_OVERRIDE_KEYS,THEME_REGISTRY_OVERRIDE_KEY,detectThemeScope,mergeThemeSlots,scopeThemeSettings} from '../../theme-registry';

const LABELS={'--loc-bg':'首頁背景','--loc-panel':'文字框背景','--loc-text':'文字框文字','--loc-accent':'強調色'};
function readJson(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}}

export default function ScopeThemeManager(){
  const [scope,setScope]=useState('loc');
  const [settings,setSettings]=useState(null);
  const slots=useMemo(()=>typeof window==='undefined'?mergeThemeSlots({}):mergeThemeSlots(readJson(THEME_REGISTRY_OVERRIDE_KEY,{})),[]);

  useEffect(()=>{
    const currentScope=detectThemeScope(window.location.pathname,window.location.hostname);
    setScope(currentScope);
    setSettings(scopeThemeSettings(currentScope,readJson(SCOPE_THEME_SETTINGS_KEY,{})));
  },[]);

  function save(next){
    setSettings(next);
    const stored=readJson(SCOPE_THEME_SETTINGS_KEY,{});
    localStorage.setItem(SCOPE_THEME_SETTINGS_KEY,JSON.stringify({...stored,[scope]:next}));
    window.dispatchEvent(new Event('loc-scope-theme-change'));
  }
  function patch(patchValue){save({...settings,...patchValue});}
  function patchCustom(key,value){save({...settings,custom:{...(settings.custom||{}),[key]:value}});}
  function patchSchedule(index,patchValue){
    const schedule=[...(settings.schedule||DEFAULT_ROTATION_SCHEDULE)];
    schedule[index]={...schedule[index],...patchValue};
    save({...settings,schedule});
  }
  if(!settings)return null;
  const enabled=slots.filter(slot=>slot.enabled);

  return <div className="loc-view">
    <section className="loc-card">
      <p className="loc-eyebrow">Scope Theme</p>
      <h2>{scope} 主題設定</h2>
      <p className="loc-subtitle">只修改目前 Scope；八組 preset 由 Admin 維護。</p>
      <div className="loc-grid two">
        <label>模式
          <select value={settings.mode} onChange={e=>patch({mode:e.target.value})}>
            <option value="fixed">固定主題</option>
            <option value="time">隨時間輪調</option>
            <option value="custom">簡單自訂</option>
          </select>
        </label>
        <label>基礎主題
          <select value={settings.theme} onChange={e=>patch({theme:e.target.value})}>{enabled.map(slot=><option key={slot.id} value={slot.id}>{slot.label}</option>)}</select>
        </label>
      </div>
    </section>

    {settings.mode==='time'&&<section className="loc-card">
      <h2>時間輪調</h2>
      <p className="loc-subtitle">依本機時間切換。每個 Scope 有自己的輪調表。</p>
      <div className="loc-table-wrap"><table className="loc-table"><thead><tr><th>開始小時</th><th>主題</th></tr></thead><tbody>
        {(settings.schedule||DEFAULT_ROTATION_SCHEDULE).map((row,index)=><tr key={index}>
          <td><input type="number" min="0" max="23" value={row.start} onChange={e=>patchSchedule(index,{start:Number(e.target.value)})}/></td>
          <td><select value={row.theme} onChange={e=>patchSchedule(index,{theme:e.target.value})}>{enabled.map(slot=><option key={slot.id} value={slot.id}>{slot.label}</option>)}</select></td>
        </tr>)}
      </tbody></table></div>
    </section>}

    {settings.mode==='custom'&&<section className="loc-card">
      <h2>特殊組／簡單自訂</h2>
      <p className="loc-subtitle">不是第九個固定主題；以選定 preset 為 base，只覆寫少量網站色彩。</p>
      <div className="loc-grid two">
        {SIMPLE_SCOPE_OVERRIDE_KEYS.map(key=><label key={key}>{LABELS[key]||key}<input value={(settings.custom||{})[key]||''} placeholder="例如 #ffffff" onChange={e=>patchCustom(key,e.target.value)}/></label>)}
      </div>
    </section>}
  </div>;
}
