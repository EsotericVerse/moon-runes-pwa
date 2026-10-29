'use client';

import {useEffect,useRef,useState} from 'react';
import {CACHE_POLICY} from '../../cache-policy.config.mjs';
import {applyGlobalCacheConfig} from '../../cache-mode-client.mjs';
import {MAX_ISR_DOMAINS,normalizeIsrDomains} from '../../providers/isr-domains.mjs';
import {readLocRuntimeConfig,saveLocRuntimeConfig} from '../../runtime-config.mjs';
import {useEditDockForm} from '../../../modular/edit-dock';

const indexFromChoice=choice=>choice.startsWith('isr:')?Number(choice.slice(4)):-1;
function draftOf(row){
  const source=Array.isArray(row?.isr_domains)?row.isr_domains:CACHE_POLICY.domains;
  const domains=source.map(item=>({label:item.label||'',origin:item.origin||''}));
  const index=source.findIndex(item=>item.origin&&
    (item.origin===row?.cache_provider||item.id===row?.cache_provider));
  return {
    choice:row?.cache_mode==='isr'&&index>=0?'isr:'+index:
      row?.cache_mode==='off'?'off':'cache',
    domains
  };
}
export default function IsrDomainTarget(){
  const [draft,setDraft]=useState(null);
  const [editing,setEditing]=useState(false);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const initial=useRef('');
  useEffect(()=>{
    let active=true;
    readLocRuntimeConfig().then(row=>{
      if(!active)return;
      const next=draftOf(row);
      initial.current=JSON.stringify(next);
      setDraft(next);
    }).catch(error=>{if(active)setNotice(String(error?.message||error));});
    return()=>{active=false;};
  },[]);
  const dirty=Boolean(draft&&JSON.stringify(draft)!==initial.current);
  const updateDomain=(index,key,value)=>setDraft(current=>({
    ...current,domains:current.domains.map((row,i)=>i===index?{...row,[key]:value}:row)
  }));
  const addDomain=()=>setDraft(current=>{
    if(!current||current.domains.length>=MAX_ISR_DOMAINS)return current;
    return {...current,domains:[...current.domains,{label:'',origin:''}]};
  });
  const removeDomain=index=>setDraft(current=>{
    if(!current)return current;
    const selected=indexFromChoice(current.choice);
    const choice=selected===index?'cache':
      selected>index?'isr:'+(selected-1):current.choice;
    return {...current,choice,domains:current.domains.filter((_,i)=>i!==index)};
  });
  const save=async()=>{
    if(!draft||busy)return false;
    setBusy(true);setNotice('');
    try{
      const domains=normalizeIsrDomains(draft.domains);
      const index=indexFromChoice(draft.choice);
      const selected=index>=0?domains[index]:null;
      if(index>=0&&!selected?.origin)throw Error('請先填寫所選 ISR 的完整 Domain。');
      const result=await saveLocRuntimeConfig({
        cache_mode:index>=0?'isr':draft.choice==='off'?'off':'cache',
        cache_provider:selected?.origin||'',
        isr_domains:domains
      });
      const next=draftOf(result);
      applyGlobalCacheConfig(result);
      initial.current=JSON.stringify(next);
      setDraft(next);
      setEditing(false);
      setNotice('已儲存。');
      return true;
    }catch(error){setNotice(String(error?.message||error));return false;}
    finally{setBusy(false);}
  };
  useEditDockForm({save,isDirty:()=>dirty,isBusy:()=>busy||draft===null});
  return <section className="loc-card admin-workspace loc-isr-settings">
    <h2>快取設定</h2>
    {draft?<div className="loc-isr-bar">
      <label htmlFor="loc-isr-choice">使用方式
        <select id="loc-isr-choice" className="scope-select" value={draft.choice}
          disabled={busy} onChange={event=>setDraft(current=>({...current,choice:event.target.value}))}>
          {draft.domains.map((item,index)=>
            <option key={index} value={'isr:'+index}>ISR {index+1} · {item.label||'未命名'}</option>)}
          <option value="cache">Service Worker</option>
          <option value="off">No Cache</option>
        </select>
      </label>
      <button type="button" className="loc-button loc-isr-edit-toggle"
        aria-expanded={editing} aria-controls="loc-isr-editor"
        disabled={busy} onClick={()=>setEditing(value=>!value)}>
        {editing?'收起':'編輯'}
      </button>
    </div>:null}
    {draft&&editing?<div id="loc-isr-editor" className="loc-isr-editor">
      <div className="loc-isr-editor-heading" aria-hidden="true">
        <span>名稱</span><span>Domain</span><span/>
      </div>
      {draft.domains.map((item,index)=><div className="loc-isr-domain-row" key={index}>
        <input aria-label={'ISR '+(index+1)+' 名稱'} maxLength={80}
          placeholder="名稱" value={item.label} disabled={busy}
          onChange={event=>updateDomain(index,'label',event.target.value)}/>
        <input type="url" aria-label={'ISR '+(index+1)+' Domain'} maxLength={512}
          placeholder="https://example.com" value={item.origin} disabled={busy}
          onChange={event=>updateDomain(index,'origin',event.target.value)}/>
        <button type="button" className="loc-button loc-isr-remove"
          aria-label={'移除 '+(item.label||'ISR '+(index+1))}
          title="移除" disabled={busy} onClick={()=>removeDomain(index)}>−</button>
      </div>)}
      <button type="button" className="loc-button loc-isr-add" onClick={addDomain}
        disabled={busy||draft.domains.length>=MAX_ISR_DOMAINS}>＋ 新增</button>
    </div>:null}
    {notice?<p className="scope-status" role="status">{notice}</p>:null}
    {!draft&&!notice?<p className="scope-status" role="status">正在讀取設定…</p>:null}
  </section>;
}
