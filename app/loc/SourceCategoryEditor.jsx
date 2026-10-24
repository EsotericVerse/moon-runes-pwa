'use client';

import {useState} from 'react';
import Select from 'react-select';
import {useAsyncResource} from './use-async-resource';
import {useSWRConfig} from 'swr';
import {dbAuthRelation} from './db-client.mjs';
import {useAccount} from './use-account';
import {useEditDockForm} from '../modular/edit-dock';

const CATEGORIES='silver.statistics_source_categories';
const ALIASES='silver.statistics_source_aliases';
const BASE_CODES=Object.freeze(['facebook','threads','instagram','others']);

// Catalog readers elsewhere still use existing first-level mappings. The
// management UI intentionally has ONE tier: four source categories only.
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
  const [selected,setSelected]=useState(BASE_CODES[0]);
  const [drafts,setDrafts]=useState({});
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const allowed=account.canManageGlobalSync();
  const query=useAsyncResource(['loc-source-primary-categories'],async()=>{
    const {data,error}=await dbAuthRelation(CATEGORIES)
      .select('category_code,display_name,sort_order,enabled')
      .in('category_code',BASE_CODES).order('sort_order');
    if(error)throw new Error(error.message||'來源管理讀取失敗。');
    return data||[];
  },{enabled:allowed});
  const rows=query.data||[];
  const choices=BASE_CODES.map(code=>{
    const row=rows.find(item=>item.category_code===code);
    return {value:code,label:row?.display_name||code};
  });
  const current=rows.find(item=>item.category_code===selected);
  const dirtyRows=rows.filter(row=>
    Object.hasOwn(drafts,row.category_code)&&
    drafts[row.category_code].trim()!==String(row.display_name||'').trim()
  );
  async function save(){
    if(busy||query.isPending||query.error||!allowed)return false;
    if(!dirtyRows.length)return true;
    setBusy(true);setNotice('');
    try{
      for(const row of dirtyRows){
        const label=String(drafts[row.category_code]||'').trim();
        if(!label||label.length>80)throw new Error('來源名稱須為 1–80 字。');
        const {data,error}=await dbAuthRelation(CATEGORIES)
          .update({display_name:label}).eq('category_code',row.category_code)
          .select('category_code');
        if(error||!data?.length)throw new Error(error?.message||'來源名稱未儲存。');
      }
      await query.refetch();
      await mutate(key=>Array.isArray(key)&&
        ['statistics-source-taxonomy','own-scope-source-catalog','loc-source-categories'].includes(key[0]));
      setDrafts({});
      setNotice('來源設定已儲存。');
      return true;
    }catch(error){setNotice(String(error?.message||error));return false;}
    finally{setBusy(false);}
  }
  useEditDockForm({
    save,
    isDirty:()=>dirtyRows.length>0,
    isBusy:()=>busy,
    discard:()=>setDrafts({})
  });
  if(!allowed)return <section className="loc-card scope-status scope-error" role="alert">只有 Admin 可以管理來源。</section>;
  return <section className="loc-card admin-workspace">
    <h2>來源管理</h2>
    <p className="scope-status">僅保留 Facebook、Threads、Instagram、其他四個頂層來源。沒有第二層群組或額外來源對應編輯。</p>
    {query.isPending?<p role="status" className="scope-status">正在讀取來源…</p>:null}
    {query.error?<p role="alert" className="scope-status scope-error">{String(query.error.message||query.error)}</p>:null}
    <label htmlFor="loc-source-primary-select">選擇來源</label>
    <Select
      inputId="loc-source-primary-select" instanceId="loc-source-primary-select"
      className="loc-settings-select" classNamePrefix="loc-settings-select"
      unstyled isSearchable={false} isClearable={false}
      options={choices} value={choices.find(item=>item.value===selected)||null}
      onChange={option=>{if(option)setSelected(option.value);}}
    />
    {current?<div className="scope-management-fields">
      <p className="scope-status">來源識別碼：{current.category_code}</p>
      <label><span>顯示名稱</span><input maxLength={80} disabled={busy}
        value={drafts[selected]??current.display_name}
        onChange={event=>setDrafts(draft=>({...draft,[selected]:event.target.value}))}
      /></label>
    </div>:null}
    <p className="scope-status">修改後使用六大功能列的「儲存」。原始文章來源資料與既有統計對應均不刪除。</p>
    {notice?<p role="status" className="scope-status">{notice}</p>:null}
  </section>;
}
