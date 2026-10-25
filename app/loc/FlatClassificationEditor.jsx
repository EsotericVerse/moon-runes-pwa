'use client';

import {useState} from 'react';
import {useSWRConfig} from 'swr';
import {useAsyncResource} from './use-async-resource';
import {dbAuthRelation} from './db-client.mjs';
import {useAccount} from './use-account';
import {useEditDockForm} from '../modular/edit-dock';

// Each editable entry is a string; one text[] per Scope, without an item ID.
export default function FlatClassificationEditor({scopeId='loc'}){
  const account=useAccount();
  const {mutate}=useSWRConfig();
  const global=scopeId==='loc';
  const valid=/^[a-z][a-z0-9]{0,14}$/.test(scopeId);
  const allowed=valid&&Boolean(account.user&&!account.loading&&!account.permissionLoading&&
    (global?account.canManageGlobalSync():account.canManageScopeSync(scopeId)));
  const [draft,setDraft]=useState(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const query=useAsyncResource(['txt-class-list',scopeId],async()=>{
    const {data,error}=await dbAuthRelation('silver.'+scopeId).select('txt_class').eq('id',scopeId).maybeSingle();
    if(error)throw new Error(error.message||'分類讀取失敗');
    if(!data)throw new Error('找不到 Scope 設定');
    return Array.isArray(data.txt_class)?data.txt_class:[];
  },{enabled:allowed});
  const original=query.data||[];
  const rows=draft===null?original:draft;
  const changed=draft!==null&&JSON.stringify(draft)!==JSON.stringify(original);
  const title=global?'作品群組分類':'作品自訂分類';
  const change=(index,value)=>{setDraft(prev=>{
    const next=[...(prev===null?original:prev)];next[index]=value;return next;
  });setNotice('');};
  async function save(){
    if(!allowed||busy||query.isPending||query.error)return false;
    if(!changed){setNotice('沒有待儲存的修改。');return true;}
    const names=rows.map(name=>String(name).trim());
    if(names.some(name=>!name||name.length>80)){setNotice('每個分類名稱須為 1–80 字。');return false;}
    const normalized=names.map(name=>name.toLocaleLowerCase());
    if(new Set(normalized).size!==normalized.length){setNotice('分類名稱不能重複。');return false;}
    setBusy(true);setNotice('');
    try{
      const {data,error}=await dbAuthRelation('silver.'+scopeId).update({txt_class:names})
        .eq('id',scopeId).select('id');
      if(error||!data?.length)throw new Error(error?.message||'沒有寫入權限，分類未儲存。');
      await query.refetch();
      setDraft(null);
      await mutate(key=>Array.isArray(key)&&(
        ['scope-others-source-summary','own-scope-source-catalog','culture-source-classification','scope-overview','statistics-source-taxonomy'].includes(key[0])));
      setNotice(title+'已儲存。公開頁面的分類快照會在下一次手動發布後同步。');
      return true;
    }catch(error){setNotice(String(error?.message||error));return false;}
    finally{setBusy(false);}
  }
  useEditDockForm({save,isDirty:()=>changed,isBusy:()=>busy,
    discard:()=>{setDraft(null);setNotice('');}});
  if(!allowed)return <section className="loc-card scope-status scope-error" role="alert">沒有{title}編輯權限。</section>;
  return <section className="loc-card classification-inline">
    <h2>{title}</h2>
    <p>僅儲存名稱字串，沒有代碼、ID、群組或目錄。每一項就是作品來源的完整名稱。</p>
    {query.isPending?<p role="status" className="scope-status">正在讀取{title}…</p>:null}
    {query.error?<p role="alert" className="scope-status scope-error">{String(query.error.message||query.error)}
      <button type="button" className="loc-button" onClick={()=>query.refetch()}>重新讀取</button>
    </p>:null}
    {!query.isPending&&!query.error?<form onSubmit={event=>{event.preventDefault();void save();}}>
      <div className="classification-inline__list">
        {rows.map((name,index)=><div className="classification-inline__row" key={index}>
          <label className="classification-inline__field">
            <span>分類 {index+1}</span>
            <input type="text" maxLength={80} required disabled={busy}
              value={name} onChange={event=>change(index,event.target.value)}/>
          </label>
          <button type="button" className="loc-button" disabled={busy}
            onClick={()=>{setDraft(rows.filter((_,i)=>i!==index));setNotice('');}}>刪除</button>
        </div>)}
      </div>
      <div className="classification-inline__actions">
        <button type="button" className="loc-button" disabled={busy}
          onClick={()=>{setDraft([...rows,'']);setNotice('');}}>新增分類</button>
        <button className="loc-button primary" type="submit" disabled={busy||!changed}>{busy?'儲存中…':'儲存'+title}</button>
        <button type="button" className="loc-button" disabled={busy||!changed}
          onClick={()=>{setDraft(null);setNotice('');}}>還原</button>
      </div>
    </form>:null}
    {notice?<p className="scope-status" role="status">{notice}</p>:null}
  </section>;
}
