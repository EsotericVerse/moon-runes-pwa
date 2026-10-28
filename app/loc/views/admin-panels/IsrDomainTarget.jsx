'use client';

import {useEffect,useRef,useState} from 'react';
import {CACHE_POLICY} from '../../cache-policy.config.mjs';
import {CACHE_MODE_OPTIONS,applyGlobalCacheConfig} from '../../cache-mode-client.mjs';
import {MAX_ISR_DOMAINS,normalizeIsrDomains} from '../../providers/isr-domains.mjs';
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
  const updateDomain=(id,field,value)=>setDraft(current=>({
    ...current,
    provider:field==='id'&&current.provider===id?value:current.provider,
    domains:current.domains.map(item=>item.id===id?{...item,[field]:value}:item)
  }));
  const addDomain=()=>setDraft(current=>{
    if(!current||current.domains.length>=MAX_ISR_DOMAINS)return current;
    const id='domain-'+crypto.randomUUID().replaceAll('-','').slice(0,12);
    return {...current,domains:[...current.domains,{id,label:'新 ISR Domain',origin:''}]};
  });
  const removeDomain=id=>setDraft(current=>{
    if(!current||current.domains.length<=1)return current;
    const domains=current.domains.filter(item=>item.id!==id);
    return {...current,domains,provider:current.provider===id?domains[0].id:current.provider};
  });
  const save=async()=>{
    if(!draft||busy)return false;
    setBusy(true);setNotice('');
    try{
      const domains=normalizeIsrDomains(draft.domains,draft.provider,{allowEmptyOrigin:true});
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
      {draft.domains.map((item,index)=><fieldset key={index} className="scope-management-wide-field">
        <legend>{item.label||'ISR Domain'}</legend>
        <div className="scope-management-fields">
          <label>Domain ID
            <input value={item.id} maxLength={32} disabled={busy}
              onChange={event=>updateDomain(item.id,'id',event.target.value)}/>
          </label>
          <label>顯示名稱
            <input value={item.label} maxLength={80} disabled={busy}
              onChange={event=>updateDomain(item.id,'label',event.target.value)}/>
          </label>
          <label>HTTPS Domain
            <input type="url" maxLength={512} disabled={busy}
              placeholder="https://isr.example.com"
              value={item.origin||''} onChange={event=>updateDomain(item.id,'origin',event.target.value)}/>
          </label>
          <button type="button" className="loc-button" disabled={busy||draft.domains.length<=1}
            onClick={()=>removeDomain(item.id)}>移除 Domain</button>
        </div>
      </fieldset>)}
      <button type="button" className="loc-button" disabled={busy||draft.domains.length>=MAX_ISR_DOMAINS}
        onClick={addDomain}>新增 ISR Domain</button>
      <p className="scope-status">修改後使用功能列「儲存」寫入設定；只儲存清單不會自動開啟 ISR。</p>
    </div>:<p className="scope-status" role="status">{notice||'正在讀取網路設定…'}</p>}
    {notice?<p className="scope-status" role={notice.includes('失敗')?'alert':'status'}>{notice}</p>:null}
  </section>;
}
