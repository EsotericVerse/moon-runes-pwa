'use client';

import {useState} from 'react';
import {useAsyncResource} from './use-async-resource';
import {useSWRConfig} from 'swr';
import {dbAuthRelation} from './db-client.mjs';
import {useAccount} from './use-account';
import {useEditDockForm} from '../modular/edit-dock';

const CATEGORIES='silver.statistics_source_categories';
const ALIASES='silver.statistics_source_aliases';
const BASE_CODES=Object.freeze(['facebook','threads','instagram','others']);

// The published system taxonomy has one classification tier. Raw source keys
// are existing metadata; this editor never invents additional source groups.
export function useSourceCategories(){
  return useAsyncResource(['statistics-source-categories'],async()=>{
    const [categories,aliases]=await Promise.all([
      dbAuthRelation(CATEGORIES).select('category_code,display_name,sort_order,enabled').order('sort_order'),
      dbAuthRelation(ALIASES).select('source_key,category_code').order('source_key')
    ]);
    if(categories.error||aliases.error)throw new Error(categories.error?.message||aliases.error?.message);
    return {categories:categories.data||[],aliases:aliases.data||[]};
  });
}

export function AdminSourceCategories(){
  const account=useAccount();
  const {mutate}=useSWRConfig();
  const [drafts,setDrafts]=useState({});
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const allowed=Boolean(account.user&&!account.loading&&!account.permissionLoading&&account.canManageGlobalSync());
  const query=useAsyncResource(['loc-source-primary-categories'],async()=>{
    const {data,error}=await dbAuthRelation(CATEGORIES)
      .select('category_code,display_name,sort_order,enabled')
      .in('category_code',BASE_CODES).order('sort_order');
    if(error)throw new Error(error.message||'作品分類讀取失敗。');
    return data||[];
  },{enabled:allowed});
  const rows=query.data||[];
  const changedRows=rows.filter(row=>Object.hasOwn(drafts,row.category_code)
    &&drafts[row.category_code].trim()!==String(row.display_name||'').trim());
  async function save(){
    if(busy||query.isPending||query.error||!allowed)return false;
    if(!changedRows.length){setNotice('沒有待儲存的修改。');return true;}
    const labels=new Set();
    for(const row of rows){
      const name=String(drafts[row.category_code]??row.display_name??'').trim();
      const normalized=name.toLocaleLowerCase();
      if(!name||name.length>80){setNotice('分類名稱須為 1–80 字。');return false;}
      if(labels.has(normalized)){setNotice('分類名稱不能重複。');return false;}
      labels.add(normalized);
    }
    setBusy(true);setNotice('');
    try{
      for(const row of changedRows){
        const label=String(drafts[row.category_code]).trim();
        const {data,error}=await dbAuthRelation(CATEGORIES)
          .update({display_name:label}).eq('category_code',row.category_code)
          .select('category_code');
        if(error||!data?.length)throw new Error(error?.message||'分類名稱未儲存；請確認管理權限。');
      }
      await query.refetch();
      await mutate(key=>Array.isArray(key)&&
        ['statistics-source-taxonomy','own-scope-source-catalog','loc-source-categories'].includes(key[0]));
      setDrafts({});
      setNotice('作品分類已儲存。公開靜態分類請依發布流程同步。');
      return true;
    }catch(error){setNotice(String(error?.message||error));return false;}
    finally{setBusy(false);}
  }
  useEditDockForm({
    save,
    isDirty:()=>changedRows.length>0,
    isBusy:()=>busy,
    discard:()=>setDrafts({})
  });
  if(!allowed)return <section className="loc-card scope-status scope-error" role="alert">只有 Admin 可以修改作品分類。</section>;
  return <section className="loc-card admin-workspace">
    <h2>作品分類</h2>
    <p className="scope-status">只有一層系統分類，直接修改分類名稱；不另外建立來源群組或分類群組。既有分類代碼及原始文章來源不變。</p>
    {query.isPending?<p role="status" className="scope-status">正在載入作品分類…</p>:null}
    {query.error?<p role="alert" className="scope-status scope-error">{String(query.error.message||query.error)}</p>:null}
    {!query.isPending&&!query.error?<div className="admin-source-category-grid">
      {rows.map(row=><label className="admin-source-category-card" key={row.category_code}>
        <strong className="admin-source-category-card__code">{row.category_code}</strong>
        <span>分類名稱</span>
        <input maxLength={80} disabled={busy} value={drafts[row.category_code]??row.display_name??''}
          onChange={event=>{setNotice('');setDrafts(previous=>({...previous,[row.category_code]:event.target.value}));}}/>
      </label>)}
    </div>:null}
    <div className="scope-preview-links">
      <button type="button" className="loc-button primary" disabled={busy||query.isPending||Boolean(query.error)||!changedRows.length}
        onClick={save}>{busy?'儲存中…':'儲存作品分類'}</button>
      {changedRows.length?<button type="button" className="loc-button" disabled={busy}
        onClick={()=>{setDrafts({});setNotice('');}}>取消修改</button>:null}
    </div>
    {notice?<p className="scope-status" role="status">{notice}</p>:null}
  </section>;
}
