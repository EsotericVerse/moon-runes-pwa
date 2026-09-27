'use client';

import {useEffect,useState} from 'react';
import {getScopeThemeDefault,updateScopeThemeDefault} from './scope-public-settings';
import {THEME_SLOTS_V2} from '../modular-v2/theme-registry.v2';

export default function ScopeDefaultThemeSetting({scopeId}){
  const [themeId,setThemeId]=useState('theme-7');
  const [status,setStatus]=useState('');
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let live=true;
    getScopeThemeDefault(scopeId)
      .then(row=>{
        if(!live)return;
        setThemeId(/^theme-[1-8]$/.test(String(row?.default_theme_id||''))?row.default_theme_id:'theme-7');
      })
      .catch(error=>{if(live)setStatus(String(error?.message||error||'讀取主題失敗。'));})
      .finally(()=>{if(live)setLoading(false);});
    return()=>{live=false};
  },[scopeId]);

  async function change(event){
    const next=event.target.value;
    setThemeId(next);
    setStatus('更新中…');
    try{
      await updateScopeThemeDefault(scopeId,next);
      setStatus('已更新');
    }catch(error){
      setStatus(String(error?.message||error||'更新失敗。'));
    }
  }

  return <section className="scope-v2-inline-card">
    <h3>預設頁面主題</h3>
    <p>這是此 Scope 的預設 Theme；個人瀏覽器暫時切換主題不會改變這個設定。</p>
    {loading?<p className="scope-v2-status">正在讀取主題設定…</p>:<label>
      <span>預設 Theme</span>
      <select className="scope-v2-select" value={themeId} onChange={change}>
        {THEME_SLOTS_V2.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>}
    {status?<p className="scope-v2-status">{status}</p>:null}
  </section>;
}
