'use client';

import {useEffect,useRef,useState} from 'react';
import {dbAuthRelation} from '../../db-client.mjs';
import {useEditDockForm} from '../../../modular/edit-dock';
import {MAX_ISR_DOMAINS,normalizeIsrDomains} from '../../providers/isr-domains.mjs';

// ISR is a deploy target, not a database route. Manual selection updates the
// admin registry only; it never silently redirects users or alters DNS.
const TABLE='silver.loc_cache_settings';

export default function IsrDomainTarget(){
  const [domains,setDomains]=useState([]);
  const [selected,setSelected]=useState('');
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const original=useRef({domains:[],provider:'',updated_at:null});
  const dirty=loaded&&(
    selected!==original.current.provider||
    JSON.stringify(domains)!==JSON.stringify(original.current.domains)
  );

  useEffect(()=>{
    let active=true;
    (async()=>{
      const {data,error}=await dbAuthRelation(TABLE)
        .select('id,provider,domains,updated_at').eq('id',1).maybeSingle();
      if(!active)return;
      if(error)throw new Error(error.message||'無法讀取 ISR Domain。');
      if(!data)throw new Error('ISR 設定不存在，請檢查資料庫。');
      const rows=Array.isArray(data.domains)?data.domains:[];
      original.current={domains:rows,provider:data.provider,updated_at:data.updated_at};
      setDomains(rows.map(item=>({...item})));
      setSelected(data.provider||'');
      setLoaded(true);
    })().catch(error=>{if(active)setStatus(String(error?.message||error));});
    return()=>{active=false;};
  },[]);

  function patch(id,key,value){
    setDomains(current=>current.map(item=>item.id===id?{...item,[key]:value}:item));
    setStatus('');
  }
  function add(){
    if(domains.length>=MAX_ISR_DOMAINS)return;
    const ids=new Set(domains.map(item=>item.id));
    let n=1;
    while(ids.has('isr-'+n))n++;
    setDomains(current=>[...current,{id:'isr-'+n,label:'',origin:''}]);
    setStatus('');
  }
  function remove(id){
    if(id===selected){setStatus('請先手動選擇其他 ISR 並儲存，才能刪除目前選用的項目。');return;}
    if(domains.length<=1){setStatus('ISR Domain 至少保留一筆。');return;}
    setDomains(current=>current.filter(item=>item.id!==id));
    setStatus('');
  }
  async function save(){
    if(!loaded||busy)return false;
    if(!dirty)return true;
    setBusy(true);setStatus('');
    try{
      const rows=normalizeIsrDomains(domains,selected);
      const timestamp=new Date().toISOString();
      // Optimistic concurrency: an older Admin tab must not overwrite edits.
      const {data,error}=await dbAuthRelation(TABLE)
        .update({domains:rows,provider:selected,updated_at:timestamp})
        .eq('id',1).eq('updated_at',original.current.updated_at)
        .select('id,provider,domains,updated_at');
      if(error)throw new Error(error.message||'ISR 設定儲存失敗。');
      if(!data?.length)throw new Error('設定已在其他頁面變更，請重新整理後再編輯。');
      const saved=data[0];
      const savedRows=Array.isArray(saved.domains)?saved.domains:rows;
      original.current={domains:savedRows,provider:saved.provider,updated_at:saved.updated_at};
      setDomains(savedRows.map(item=>({...item})));
      setSelected(saved.provider);
      setStatus('ISR Domain 已儲存。僅手動選用；沒有自動故障轉移或 DNS 變更。');
      return true;
    }catch(error){
      setStatus(String(error?.message||error||'ISR 設定儲存失敗。'));
      return false;
    }finally{setBusy(false);}
  }
  function openSelected(){
    if(dirty){setStatus('請先儲存 ISR Domain，再開啟已選用的測試站。');return;}
    const target=original.current.domains.find(item=>item.id===selected);
    if(!target)return;
    try{
      const [normalized]=normalizeIsrDomains([target],selected);
      window.open(normalized.origin+'/','_blank','noopener,noreferrer');
    }catch(error){setStatus(String(error?.message||error));}
  }

  useEditDockForm({
    isBusy:()=>busy,
    isDirty:()=>dirty,
    save
  });

  return <section className="loc-card admin-workspace">
    <h2>ISR Domain 管理</h2>
    <p className="scope-status">保存 ISR 部署網站的名稱與 HTTPS 網址。選用完全手動，不會自動切換、重新部署、改動 DNS 或資料庫來源。</p>
    {!loaded?<p role="status" className="scope-status">{status||'正在載入 ISR Domain…'}</p>:<>
      <div className="scope-management-fields">
        <label><span>手動選用的 ISR</span>
          <select className="admin-native-select" value={selected}
            disabled={busy} onChange={event=>{setSelected(event.target.value);setStatus('');}}>
            {domains.map(item=><option key={item.id} value={item.id}>
              {item.label||item.id}
            </option>)}
          </select>
        </label>
      </div>
      <h3>已儲存的 ISR Domain（{domains.length} / {MAX_ISR_DOMAINS}）</h3>
      {domains.map(item=><div className="scope-management-fields" key={item.id}>
        <label><span>識別 ID</span><input value={item.id} maxLength={32}
          disabled={busy} onChange={event=>patch(item.id,'id',event.target.value)}/></label>
        <label><span>平台／名稱</span><input value={item.label} maxLength={80}
          disabled={busy} onChange={event=>patch(item.id,'label',event.target.value)}/></label>
        <label><span>ISR Domain</span><input type="url" value={item.origin} maxLength={512}
          placeholder="https://isr.example.com" disabled={busy}
          onChange={event=>patch(item.id,'origin',event.target.value)}/></label>
        <div className="scope-management-wide-field">
          <button type="button" className="loc-button" disabled={busy||item.id===selected||domains.length<=1}
            onClick={()=>remove(item.id)}>移除此網址</button>
        </div>
      </div>)}
      <div className="scope-management-wide-field">
        <button type="button" className="loc-button" disabled={busy||domains.length>=MAX_ISR_DOMAINS} onClick={add}>新增 ISR Domain</button>
        <button type="button" className="loc-button primary" disabled={busy||!dirty} onClick={save}>
          {busy?'儲存中…':'儲存 ISR 設定'}
        </button>
        <button type="button" className="loc-button" disabled={busy||dirty} onClick={openSelected}>開啟所選 ISR 測試站</button>
      </div>
      <p className="scope-status">這裡保存手動選用的目標；正式網站流量入口仍由 DNS／網域路由獨立控制。</p>
      {status?<p role="status" className="scope-status">{status}</p>:null}
    </>}
  </section>;
}
