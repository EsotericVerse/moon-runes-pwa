'use client';

import {useMemo} from 'react';
import {useNeonSetting} from '../../loc/use-neon-setting';
import {
  DEFAULT_ROTATION_SCHEDULE,
  DEFAULT_SCOPE_THEME_SETTINGS,
  SCOPE_THEME_SETTINGS_KEY,
  SIMPLE_SCOPE_OVERRIDE_KEYS,
  THEME_REGISTRY_SETTING_KEY,
  mergeThemeSlots,
  scopeThemeSettings
} from '../../theme-registry';

const CUSTOM_LABELS={
  '--loc-bg':'背景',
  '--loc-panel':'面板',
  '--loc-heading':'標題',
  '--loc-accent':'強調色'
};
const SCOPES=['loc','runes','lo3rwang','admin'];

export default function ThemeRegistryManager(){
  const {value:overrides,setValue:setOverrides,reset:resetOverrides,status:registryStatus,account}=useNeonSetting(THEME_REGISTRY_SETTING_KEY,{});
  const {value:scopeSettings,setValue:setScopeSettings,reset:resetScopeSettings,status:scopeStatus}=useNeonSetting(SCOPE_THEME_SETTINGS_KEY,DEFAULT_SCOPE_THEME_SETTINGS);
  const slots=useMemo(()=>mergeThemeSlots(overrides||{}),[overrides]);

  function patchSlot(id,patch){
    setOverrides(current=>({...((current&&typeof current==='object')?current:{}),[id]:{...((current||{})[id]||{}),...patch}}));
  }
  function patchToken(id,key,value){
    setOverrides(current=>{
      const root=(current&&typeof current==='object')?current:{};
      const prev=root[id]||{};
      return {...root,[id]:{...prev,tokens:{...(prev.tokens||{}),[key]:value}}};
    });
  }
  function patchScope(scope,patch){
    setScopeSettings(current=>{
      const root=(current&&typeof current==='object')?current:{};
      const now=scopeThemeSettings(scope,root);
      return {...root,[scope]:{...now,...patch}};
    });
  }
  function patchScopeCustom(scope,key,value){
    setScopeSettings(current=>{
      const root=(current&&typeof current==='object')?current:{};
      const now=scopeThemeSettings(scope,root);
      return {...root,[scope]:{...now,custom:{...(now.custom||{}),[key]:value}}};
    });
  }

  return <div className="loc-view">
    <section className="loc-card">
      <p className="loc-eyebrow">Theme Registry</p>
      <h2>8 種固定主題</h2>
      <p className="loc-subtitle">八組為共用視覺主題；靈魂固定代表永夜、秩序固定代表永日。管理者可以調整顯示名稱與色彩，但不改變八組身分。</p>
      <div className="loc-table-wrap">
        <table className="loc-table">
          <thead><tr><th>組別</th><th>顯示名稱</th><th>模式</th><th>背景</th><th>面板</th><th>強調色</th></tr></thead>
          <tbody>{slots.map(slot=><tr key={slot.id}>
            <td>{slot.group}</td>
            <td><input value={slot.label} onChange={e=>patchSlot(slot.id,{label:e.target.value})}/></td>
            <td><select value={slot.scheme} onChange={e=>patchSlot(slot.id,{scheme:e.target.value})}><option value="light">light</option><option value="dark">dark</option></select></td>
            <td><input value={slot.tokens['--loc-bg']||''} onChange={e=>patchToken(slot.id,'--loc-bg',e.target.value)}/></td>
            <td><input value={slot.tokens['--loc-panel']||''} onChange={e=>patchToken(slot.id,'--loc-panel',e.target.value)}/></td>
            <td><input value={slot.tokens['--loc-accent']||''} onChange={e=>patchToken(slot.id,'--loc-accent',e.target.value)}/></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Scope Theme</p>
      <h2>隨時間／固定／第九種自訂</h2>
      <p className="loc-subtitle">系統預設為隨時間。固定模式可選八種之一；自訂為第九種，以指定固定 Theme 為 base 再覆寫 Scope 色彩。</p>
      {SCOPES.map(scope=>{
        const settings=scopeThemeSettings(scope,scopeSettings||{});
        return <div className="loc-card" key={scope}>
          <h3>{scope}</h3>
          <div className="loc-grid two">
            <label>模式
              <select value={settings.mode} onChange={e=>patchScope(scope,{mode:e.target.value})}>
                <option value="time">隨時間</option>
                <option value="fixed">固定主題</option>
                <option value="custom">自訂</option>
              </select>
            </label>
            <label>基礎主題
              <select value={settings.theme} onChange={e=>patchScope(scope,{theme:e.target.value})}>
                {slots.filter(slot=>slot.enabled).map(slot=><option key={slot.id} value={slot.id}>{slot.label}</option>)}
              </select>
            </label>
          </div>
          {settings.mode==='custom'&&<div className="loc-grid two">
            {SIMPLE_SCOPE_OVERRIDE_KEYS.map(key=><label key={key}>{CUSTOM_LABELS[key]||key}
              <input value={(settings.custom||{})[key]||''} onChange={e=>patchScopeCustom(scope,key,e.target.value)} placeholder="#rrggbb"/>
            </label>)}
          </div>}
          {settings.mode==='time'&&<p className="loc-subtitle">目前使用既有 Current 輪替表：{(settings.schedule||DEFAULT_ROTATION_SCHEDULE).map(row=>`${String(row.start).padStart(2,'0')}:00 → ${slots.find(slot=>slot.id===row.theme)?.label||row.theme}`).join('；')}</p>}
        </div>;
      })}
    </section>

    <section className="loc-card">
      <h2>同步</h2>
      <p>{registryStatus||scopeStatus||'Theme 設定由 Neon user settings 保存。'}</p>
      {!account.user&&<p>登入 Neon 後，管理者修改才會持久保存。</p>}
      <div className="loc-actions">
        <button type="button" onClick={resetOverrides}>恢復 8 組預設色彩</button>
        <button type="button" onClick={resetScopeSettings}>恢復系統隨時間預設</button>
      </div>
    </section>
  </div>;
}
