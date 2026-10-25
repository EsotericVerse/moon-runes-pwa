'use client';

import {useState} from 'react';
import {useSWRConfig} from 'swr';
import {useAsyncResource} from './use-async-resource';
import {dbAuthRelation} from './db-client.mjs';
import {useAccount} from './use-account';
import {useEditDockForm} from '../modular/edit-dock';

const CATEGORIES='silver.statistics_source_categories';
const PRIMARY_CODES=Object.freeze(['facebook','threads','instagram','others']);

// Admin edits the first-level work categories in place.
// Personal categories are edited separately by each Scope.
export default function WorkClassificationPage(){
  const account=useAccount();
  const {mutate}=useSWRConfig();
  const [drafts,setDrafts]=useState({});
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const allowed=Boolean(account.user&&!account.loading&&!account.permissionLoading&&account.canManageGlobalSync());
  const query=useAsyncResource(['loc-source-primary-categories'],async()=>{
    const {data,error}=await dbAuthRelation(CATEGORIES)
      .select('category_code,display_name,sort_order,enabled')
      .in('category_code',PRIMARY_CODES).order('sort_order');
    if(error)throw new Error(error.message||'作品分類讀取失敗。');
    return data||[];
  },{enabled:allowed});
  const rows=query.data||[];
  const valueFor=row=>String(drafts[row.category_code]??row.display_name??'');
  const changed=rows.filter(row=>Object.hasOwn(drafts,row.category_code)
    &&valueFor(row).trim()!==String(row.display_name||'').trim());

  async function save(){
    if(busy||!allowed||query.isPending||query.error)return false;
    if(!changed.length){setNotice('目前沒有待儲存的修改。');return true;}
    const names=new Set();
    for(const row of rows){
      const name=valueFor(row).trim();
      if(!name||name.length>80){setNotice('分類名稱須為 1–80 字。');return false;}
      const normalized=name.toLocaleLowerCase();
      if(names.has(normalized)){setNotice('分類名稱不能重複。');return false;}
      names.add(normalized);
    }
    setBusy(true);setNotice('');
    const saved=[];
    try{
      for(const row of changed){
        const {data,error}=await dbAuthRelation(CATEGORIES)
          .update({display_name:valueFor(row).trim()})
          .eq('category_code',row.category_code).select('category_code');
        if(error||!data?.length)throw new Error(error?.message||'作品分類未寫入，請確認 Admin 權限。');
        saved.push(row.category_code);
      }
      await query.refetch();
      setDrafts(previous=>{
        const next={...previous};
        for(const code of saved)delete next[code];
        return next;
      });
      await mutate(key=>Array.isArray(key)&&
        ['statistics-source-taxonomy','own-scope-source-catalog','loc-source-categories'].includes(key[0]));
      setNotice('作品分類已儲存。公開 JS 分類設定須隨發布同步。');
      return true;
    }catch(error){
      // Retain unsaved input. Completed rows may be retried idempotently.
      setNotice(String(error?.message||error));
      return false;
    }finally{setBusy(false);}
  }

  useEditDockForm({
    save,isDirty:()=>changed.length>0,isBusy:()=>busy,
    discard:()=>{setDrafts({});setNotice('');}
  });

  if(!allowed)return <section className="loc-card scope-status scope-error" role="alert">
    只有 Admin 可以編輯作品分類。
  </section>;
  return <section className="loc-card classification-inline classification-inline--admin">
    <header className="classification-inline__header">
      <h2>作品分類</h2>
      <p>直接修改各分類的顯示名稱，再按儲存。全站作品分類與 Scope 個人分類各自獨立。</p>
    </header>
    {query.isPending?<p role="status" className="scope-status">正在讀取作品分類…</p>:null}
    {query.error?<p role="alert" className="scope-status scope-error">
      {String(query.error.message||query.error)}
      <button type="button" className="loc-button" onClick={()=>query.refetch()}>重新讀取</button>
    </p>:null}
    {!query.isPending&&!query.error&&!rows.length?<p className="scope-status">目前沒有可編輯的作品分類。</p>:null}
    {!query.isPending&&!query.error&&rows.length?<form onSubmit={event=>{event.preventDefault();void save();}}>
      <div className="classification-inline__list">
        {rows.map(row=><div className="classification-inline__row" key={row.category_code}>
          <label className="classification-inline__field">
            <span>{row.display_name}</span>
            <input type="text" required maxLength={80} disabled={busy}
              value={valueFor(row)}
              onChange={event=>{
                setDrafts(previous=>({...previous,[row.category_code]:event.target.value}));
                setNotice('');
              }}/>
          </label>
          <span className="classification-inline__code">{row.category_code}</span>
        </div>)}
      </div>
      <div className="classification-inline__actions">
        <button className="loc-button primary" type="submit" disabled={busy||!changed.length}>
          {busy?'儲存中…':'儲存修改'}
        </button>
        <button className="loc-button" type="button" disabled={busy||!changed.length}
          onClick={()=>{setDrafts({});setNotice('');}}>還原</button>
        {changed.length?<span className="scope-status">{changed.length} 項尚未儲存</span>:null}
      </div>
    </form>:null}
    {notice?<p className="scope-status" role="status" aria-live="polite">{notice}</p>:null}
  </section>;
}
