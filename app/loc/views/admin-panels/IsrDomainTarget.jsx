'use client';

import {useEffect,useRef,useState} from 'react';
import Select from 'react-select';
import {dbAuthRelation} from '../../db-client.mjs';
import {useEditDockForm} from '../../../modular/edit-dock';
import {MAX_ISR_DOMAINS,normalizeIsrDomains} from '../../providers/isr-domains.mjs';
import {CACHE_MODE_OPTIONS,applyCachePolicy} from '../../cache-mode-client.mjs';

// ISR is a deploy target, not a database route. Manual selection updates the
// admin registry only; it never silently redirects users or alters DNS.
const TABLE='silver.loc_cache_settings';

export default function IsrDomainTarget(){
  const [domains,setDomains]=useState([]);
  const [selected,setSelected]=useState('');
  const [cacheMode,setCacheMode]=useState('cache');
  const [runtimeLoaded,setRuntimeLoaded]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const original=useRef({domains:[],provider:'',updated_at:null,
    mode:'cache',origin:'',modeUpdatedAt:null});
  const selectedOrigin=domains.find(item=>item.id===selected)?.origin||'';
  const desiredOrigin=cacheMode==='isr'?selectedOrigin:'';
  const domainsDirty=loaded&&(selected!==original.current.provider||
    JSON.stringify(domains)!==JSON.stringify(original.current.domains));
  const runtimeDirty=runtimeLoaded&&(cacheMode!==original.current.mode||
    desiredOrigin!==original.current.origin);
  const dirty=domainsDirty||runtimeDirty;

  useEffect(()=>{
    let active=true;
    (async()=>{
      const [domainsResult,runtimeResult]=await Promise.all([
        dbAuthRelation(TABLE).select('id,provider,domains,updated_at').eq('id',1).maybeSingle(),
        dbAuthRelation('silver.loc_cache_runtime').select('mode,origin,updated_at').eq('id',1).maybeSingle()
      ]);
      if(!active)return;
      if(domainsResult.error)throw new Error(domainsResult.error.message||'無法讀取 ISR Domain。');
      if(runtimeResult.error)throw new Error(runtimeResult.error.message||'無法讀取快取模式。');
      if(!domainsResult.data||!runtimeResult.data)
        throw new Error('ISR 設定不存在，請先完成資料庫遷移。');
      const data=domainsResult.data, runtime=runtimeResult.data;
      const rows=Array.isArray(data.domains)?data.domains:[];
      original.current={domains:rows,provider:data.provider,updated_at:data.updated_at,
        mode:runtime.mode,origin:runtime.origin||'',modeUpdatedAt:runtime.updated_at};
      setDomains(rows.map(item=>({...item})));
      setSelected(data.provider||'');
      setCacheMode(runtime.mode);
      setRuntimeLoaded(true);
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
    if(!loaded||!runtimeLoaded||busy)return false;
    if(!dirty)return true;
    setBusy(true);setStatus('');
    try{
      if(!CACHE_MODE_OPTIONS.some(item=>item.value===cacheMode))
        throw new Error('無效快取模式');
      // A broken or half-edited ISR domain list must never prevent an
      // emergency switch back to 'off' or ordinary local cache.
      let rows=null,domainValidationError=null;
      try{rows=normalizeIsrDomains(domains,selected);}
      catch(error){
        domainValidationError=error;
        if(cacheMode==='isr'||!runtimeDirty)throw error;
      }
      const origin=cacheMode==='isr'?rows?.find(item=>item.id===selected)?.origin||'':'';
      if(cacheMode==='isr'&&!origin)throw new Error('請先選擇有效 ISR Domain。');
      const timestamp=new Date().toISOString();
      // Update mode first; no explicit permission to deploy a Worker or change DNS.
      if(runtimeDirty){
        const {data,error}=await dbAuthRelation('silver.loc_cache_runtime')
          .update({mode:cacheMode,origin,updated_at:timestamp})
          .eq('id',1).eq('updated_at',original.current.modeUpdatedAt)
          .select('mode,origin,updated_at');
        if(error)throw new Error(error.message||'快取模式儲存失敗');
        if(!data?.length)throw new Error('快取模式已被其他管理者修改，請重新整理。');
        const saved=data[0];
        original.current.mode=saved.mode;
        original.current.origin=saved.origin||'';
        original.current.modeUpdatedAt=saved.updated_at;
        setCacheMode(saved.mode);
        applyCachePolicy(saved);
      }
      if(domainsDirty&&rows){
        const {data,error}=await dbAuthRelation(TABLE)
          .update({domains:rows,provider:selected,updated_at:timestamp})
          .eq('id',1).eq('updated_at',original.current.updated_at)
          .select('id,provider,domains,updated_at');
        if(error)throw new Error(error.message||'ISR 網域儲存失敗');
        if(!data?.length)throw new Error('ISR 網域已被其他管理者修改，請重新整理。');
        const saved=data[0];
        const savedRows=Array.isArray(saved.domains)?saved.domains:rows;
        original.current.domains=savedRows;
        original.current.provider=saved.provider;
        original.current.updated_at=saved.updated_at;
        setDomains(savedRows.map(item=>({...item})));
        setSelected(saved.provider);
      }
      setStatus(domainValidationError
        ?'快取模式已切換並儲存；ISR Domain 資料無效，尚未儲存。請修正網域清單。'
        :'全站快取模式與 ISR Domain 已儲存。沒有執行部署或修改 DNS。');
      return true;
    }catch(error){
      setStatus(String(error?.message||error||'設定儲存失敗，請核對狀態後再試。'));
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
    <h2>快取</h2>
    <p className="scope-status">全站三段模式由 Admin 手動指定。切換不會部署、改動 DNS，且不移除 Service Worker／既有 JS 架構。</p>
    {!loaded?<p role="status" className="scope-status">{status||'正在載入 ISR Domain…'}</p>:<>
      <div className="scope-management-fields">
        <label htmlFor="admin-cache-mode"><span>全站快取策略</span></label>
        <select id="admin-cache-mode" className="admin-native-select" value={cacheMode}
          disabled={busy} onChange={event=>{setCacheMode(event.target.value);setStatus('');}}>
          {CACHE_MODE_OPTIONS.map(option=><option value={option.value} key={option.value}>{option.label}</option>)}
        </select>
        <p className="scope-status">不開快取：停用 LOC 可控制的快取（瀏覽器自身 HTTP 快取不受影響）；打開快取：公開圖片／靜態資源使用 Service Worker；打開 ISR：另外啟用共用資料快取，失敗回退到資料庫。</p>
      </div>
      <div className="scope-management-fields">
        <label htmlFor="admin-isr-domain-select"><span>手動選用的 ISR</span></label>
        <Select
          inputId="admin-isr-domain-select"
          instanceId="admin-isr-domain-select"
          className="loc-settings-select"
          classNamePrefix="loc-settings-select"
          unstyled
          isSearchable={domains.length>5}
          isClearable={false}
          isDisabled={busy}
          options={domains.map(item=>({value:item.id,label:item.label||item.id}))}
          value={domains.map(item=>({value:item.id,label:item.label||item.id})).find(option=>option.value===selected)||null}
          onChange={option=>{if(option){setSelected(option.value);setStatus('');}}}
          aria-label="手動選用 ISR 平台"
        />
      </div>
      <h3>已儲存的 ISR Domain（{domains.length} / {MAX_ISR_DOMAINS}）</h3>
      {domains.map(item=><div className="scope-management-fields" key={item.id}>
        <p className="scope-status">ISR ID：{item.id}{item.id===selected?'（目前選用）':''}</p>
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
<button type="button" className="loc-button" disabled={busy||dirty} onClick={openSelected}>開啟所選 ISR 測試站</button>
      </div>
      <p className="scope-status">修改後請按六大功能列既有的「儲存」。僅保存手動選用的目標；正式網站流量入口仍由 DNS／網域路由獨立控制。</p>
      {status?<p role="status" className="scope-status">{status}</p>:null}
    </>}
  </section>;
}
