'use client';

import {useEffect,useMemo,useState} from 'react';
import {DEFAULT_SCOPE_THEME,DEFAULT_THEME_SLOTS,SCOPE_THEME_DEFAULTS_KEY,THEME_REGISTRY_OVERRIDE_KEY,mergeThemeSlots} from '../../theme-registry';

function readJson(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}}

export default function ThemeRegistryManager(){
  const [overrides,setOverrides]=useState({});
  const [scopeDefaults,setScopeDefaults]=useState(DEFAULT_SCOPE_THEME);

  useEffect(()=>{
    setOverrides(readJson(THEME_REGISTRY_OVERRIDE_KEY,{}));
    setScopeDefaults(readJson(SCOPE_THEME_DEFAULTS_KEY,DEFAULT_SCOPE_THEME));
  },[]);

  const slots=useMemo(()=>mergeThemeSlots(overrides),[overrides]);

  function patchSlot(id,patch){
    setOverrides(current=>{
      const next={...current,[id]:{...(current[id]||{}),...patch}};
      localStorage.setItem(THEME_REGISTRY_OVERRIDE_KEY,JSON.stringify(next));
      window.dispatchEvent(new Event('loc-theme-registry-change'));
      return next;
    });
  }

  function patchToken(id,key,value){
    setOverrides(current=>{
      const prev=current[id]||{};
      const next={...current,[id]:{...prev,tokens:{...(prev.tokens||{}),[key]:value}}};
      localStorage.setItem(THEME_REGISTRY_OVERRIDE_KEY,JSON.stringify(next));
      window.dispatchEvent(new Event('loc-theme-registry-change'));
      return next;
    });
  }

  function setScopeDefault(scope,value){
    setScopeDefaults(current=>{
      const next={...current,[scope]:value};
      localStorage.setItem(SCOPE_THEME_DEFAULTS_KEY,JSON.stringify(next));
      return next;
    });
  }

  function resetAll(){
    localStorage.removeItem(THEME_REGISTRY_OVERRIDE_KEY);
    localStorage.removeItem(SCOPE_THEME_DEFAULTS_KEY);
    setOverrides({});
    setScopeDefaults(DEFAULT_SCOPE_THEME);
    window.dispatchEvent(new Event('loc-theme-registry-change'));
  }

  return <div className="loc-view">
    <section className="loc-card">
      <h2>Scope 預設主題</h2>
      <div className="loc-grid three">
        {Object.keys(DEFAULT_SCOPE_THEME).map(scope=><label key={scope}>{scope}<select value={scopeDefaults[scope]||DEFAULT_SCOPE_THEME[scope]} onChange={e=>setScopeDefault(scope,e.target.value)}>{slots.filter(slot=>slot.enabled).map(slot=><option key={slot.id} value={slot.id}>{slot.label}</option>)}</select></label>)}
      </div>
    </section>
    <section className="loc-card">
      <h2>8 個主題槽位</h2>
      <p className="loc-subtitle">槽位固定為 8 個；管理者可以改名稱、明暗模式、啟用狀態與主要色彩。前台只讀這份 registry。</p>
      <div className="loc-table-wrap">
        <table className="loc-table">
          <thead><tr><th>槽位</th><th>名稱</th><th>模式</th><th>啟用</th><th>Accent</th><th>Gold</th></tr></thead>
          <tbody>{slots.map(slot=><tr key={slot.id}>
            <td>{slot.id}</td>
            <td><input value={slot.label} onChange={e=>patchSlot(slot.id,{label:e.target.value})}/></td>
            <td><select value={slot.scheme} onChange={e=>patchSlot(slot.id,{scheme:e.target.value})}><option value="light">light</option><option value="dark">dark</option></select></td>
            <td><input type="checkbox" checked={slot.enabled} onChange={e=>patchSlot(slot.id,{enabled:e.target.checked})}/></td>
            <td><input value={slot.tokens['--loc-accent']||''} placeholder="inherit" onChange={e=>patchToken(slot.id,'--loc-accent',e.target.value)}/></td>
            <td><input value={slot.tokens['--loc-gold']||''} placeholder="inherit" onChange={e=>patchToken(slot.id,'--loc-gold',e.target.value)}/></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="loc-actions"><button type="button" onClick={resetAll}>恢復 8 個預設槽位</button></div>
    </section>
  </div>;
}
