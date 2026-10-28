'use client';

import {useEffect,useRef,useState} from 'react';
import {CACHE_POLICY} from '../../cache-policy.config.mjs';
import {CACHE_MODE_OPTIONS,applyGlobalCacheConfig} from '../../cache-mode-client.mjs';
import {normalizeIsrDomain} from '../../providers/isr-domains.mjs';
import {readLocRuntimeConfig,saveLocRuntimeConfig} from '../../runtime-config.mjs';
import {useEditDockForm} from '../../../modular/edit-dock';

const draftOf=row=>({
  mode:row.cache_mode||'cache',
  provider:row.cache_provider||'cloudflare',
  domains:Array.isArray(row.isr_domains)?row.isr_domains:CACHE_POLICY.domains
});
export default function IsrDomainTarget(){
  const [draft,setDraft]=useState(null);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const initial=useRef('');
  useEffect(()=>{
    let active=true;
    readLocRuntimeConfig().then(row=>{
      if(!active)return;
      const next=draftOf(row);initial.current=JSON.stringify(next);setDraft(next);
    }).catch(error=>{if(active)setNotice(String(error?.message||error));});
    return()=>{active=false;};
  },[]);
  const dirty=Boolean(draft&&JSON.stringify(draft)!==initial.current);
  const update=(field,value)=>setDraft(current=>({...current,[field]:value}));
  const updateDomain=(id,origin)=>setDraft(current=>({
    ...current,domains:current.domains.map(item=>item.id===id?{...item,origin}:item)
  }));
  const save=async()=>{
    if(!draft||busy)return false;
    setBusy(true);setNotice('');
    try{
      const domains=draft.domains.map(row=>row.origin?.trim()
        ?normalizeIsrDomain(row)
        :{id:row.id,label:row.label,origin:''});
      if(!domains.some(row=>row.id===draft.provider))throw Error('請選擇有效的 ISR 網域');
      if(draft.mode==='isr'&&!domains.find(row=>row.id===draft.provider)?.origin)
        throw Error('開啟 ISR 前，必須輸入選定網域的 HTTPS Domain');
      const result=await saveLocRuntimeConfig({
        cache_mode:draft.mode,cache_provider:draft.provider,isr_domains:domains
      });
      const next=draftOf(result);
      applyGlobalCacheConfig(result);
      initial.current=JSON.stringify(next);setDraft(next);
      setNotice('網路與 ISR 設定已儲存並讀回確認。');
      return true;
    }catch(error){setNotice(String(error?.message||error));return false;}
    finally{setBusy(false);}
  };
  useEditDockForm({save,isDirty:()=>dirty,isBusy:()=>busy||draft===null});
  return <section className="loc-card admin-workspace">
    <h2>快取／ISR</h2>
    {draft?<div className="scope-management-fields">
      <label>快取模式
        <select className="scope-select" value={draft.mode}
          disabled={busy} onChange={event=>update('mode',event.target.value)}>
          {CACHE_MODE_OPTIONS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label>目前 ISR 網域
        <select className="scope-select" value={draft.provider}
          disabled={busy} onChange={event=>update('provider',event.target.value)}>
          {draft.domains.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      {draft.domains.map(item=><label key={item.id}>{item.label} Domain
        <input type="url" maxLength={512} disabled={busy}
          placeholder="https://isr.example.com"
          value={item.origin||''} onChange={event=>updateDomain(item.id,event.target.value)}/>
      </label>)}
    </div>:<p className="scope-status" role="status">正在讀取網路設定…</p>}
    {notice?<p className="scope-status" role={notice.includes('失敗')?'alert':'status'}>{notice}</p>:null}
  </section>;
}
