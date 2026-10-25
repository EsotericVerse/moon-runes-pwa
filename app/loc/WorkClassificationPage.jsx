'use client';

import {useState} from 'react';
import {useSWRConfig} from 'swr';
import {useAsyncResource} from './use-async-resource';
import {dbAuthRelation} from './db-client.mjs';
import {useAccount} from './use-account';
import {useEditDockForm} from '../modular/edit-dock';

const CATEGORIES='silver.statistics_source_categories';
const PRIMARY_CODES=Object.freeze(['facebook','threads','instagram','others']);

// Admin owns the site-wide classification vocabulary. A Scope's personal
// classifications live in ScopeOthersSources and are never edited here.
export default function WorkClassificationPage(){
  const account=useAccount();
  const {mutate}=useSWRConfig();
  const [selected,setSelected]=useState(PRIMARY_CODES[0]);
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
  const active=rows.find(row=>row.category_code===selected)||null;
  const original=String(active?.display_name||'');
  const draft=String(drafts[selected]??original);
  const changed=rows.filter(row=>Object.hasOwn(drafts,row.category_code)
    &&String(drafts[row.category_code]).trim()!==String(row.display_name||'').trim());
  const isDirty=changed.some(row=>row.category_code===selected);
  const duplicateName=(code,name)=>rows.some(row=>row.category_code!==code
    &&String(drafts[row.category_code]??row.display_name||'').trim().toLocaleLowerCase()===name.toLocaleLowerCase());

  async function persist(codes){
    if(busy||!allowed||query.isPending||query.error)return false;
    const chosen=rows.filter(row=>codes.includes(row.category_code)
      &&Object.hasOwn(drafts,row.category_code)
      &&String(drafts[row.category_code]).trim()!==String(row.display_name||'').trim());
    if(!chosen.length)return true;
    for(const row of chosen){
      const name=String(drafts[row.category_code]||'').trim();
      if(name.length<1||name.length>80){setNotice('分類名稱須為 1–80 字。');return false;}
      if(duplicateName(row.category_code,name)){setNotice('作品分類名稱不能重複。');return false;}
    }
    setBusy(true);setNotice('');
    try{
      const completed=[];
      for(const row of chosen){
        const name=String(drafts[row.category_code]).trim();
        const {data,error}=await dbAuthRelation(CATEGORIES)
          .update({display_name:name}).eq('category_code',row.category_code)
          .select('category_code');
        if(error||!data?.length)throw Error(error?.message||'作品分類未寫入，請確認 Admin 權限。');
        completed.push(row.category_code);
      }
      // Preserve other category drafts while refreshing the saved row.
      setDrafts(previous=>{
        const next={...previous};
        for(const code of completed)delete next[code];
        return next;
      });
      await query.refetch();
      await mutate(key=>Array.isArray(key)&&
        ['statistics-source-taxonomy','own-scope-source-catalog','loc-source-categories'].includes(key[0]));
      setNotice('作品分類已寫入資料庫。公開 JS 分類快照須於發布時同步。');
      return true;
    }catch(error){
      await query.refetch();
      setNotice(String(error?.message||error));
      return false;
    }finally{setBusy(false);}
  }

  useEditDockForm({
    save:()=>persist(changed.map(row=>row.category_code)),
    discard:()=>setDrafts({}),
    isDirty:()=>changed.length>0,
    isBusy:()=>busy
  });

  if(!allowed)return <section className="loc-card scope-status scope-error" role="alert">只有 Admin 可以編輯作品分類。</section>;
  return <section className="loc-card classification-page classification-page--global">
    <header className="classification-page__intro">
      <p className="loc-eyebrow">Admin · 全站設定</p>
      <h2>作品分類</h2>
      <p>請先選擇分類，再修改右側名稱。每次只編輯一個分類，不建立來源群組或下層分類。</p>
    </header>
    {query.isPending?<p className="scope-status" role="status">正在讀取作品分類…</p>:null}
    {query.error?<p className="scope-status scope-error" role="alert">{String(query.error.message||query.error)} <button className="loc-button" type="button" onClick={query.refetch}>重新讀取</button></p>:null}
    {!query.isPending&&!query.error&&!rows.length?<p className="scope-status" role="status">目前沒有可編輯的作品分類。</p>:null}
    {!query.isPending&&!query.error&&rows.length?<div className="classification-page__layout">
      <nav className="classification-page__list" aria-label="全站作品分類">
        <h3>選擇分類</h3>
        {rows.map(row=>{
          const dirty=changed.some(item=>item.category_code===row.category_code);
          return <button type="button" key={row.category_code}
            className="classification-page__choice" aria-pressed={selected===row.category_code}
            aria-controls="work-classification-editor" disabled={busy}
            onClick={()=>{setSelected(row.category_code);setNotice('');}}>
            <strong>{row.display_name}</strong>
            <small>{dirty?'尚未儲存':row.category_code}</small>
          </button>;
        })}
      </nav>
      <div className="classification-page__editor" id="work-classification-editor">
        {active?<form onSubmit={event=>{event.preventDefault();void persist([active.category_code]);}}>
          <p className="loc-eyebrow">作品分類設定</p>
          <h3>{original}</h3>
          <p className="scope-status">分類代碼：<code>{active.category_code}</code>（固定，不會更動既有作品資料）</p>
          <label className="classification-page__field">
            <span>分類顯示名稱</span>
            <input type="text" required maxLength={80} value={draft} disabled={busy}
              onChange={event=>{setDrafts(prev=>({...prev,[selected]:event.target.value}));setNotice('');}}/>
          </label>
          <div className="classification-page__actions">
            <button className="loc-button primary" type="submit" disabled={busy||!isDirty}>
              {busy?'儲存中…':'儲存此分類'}
            </button>
            <button className="loc-button" type="button" disabled={busy||!isDirty}
              onClick={()=>{setDrafts(prev=>{const next={...prev};delete next[selected];return next;});setNotice('');}}>
              還原
            </button>
          </div>
        </form>:<p role="status" className="scope-status">請先選擇一個分類。</p>}
        {changed.length>1?<p className="scope-status">尚有 {changed.length} 項修改未儲存；切換項目會保留草稿。</p>:null}
        {notice?<p className="scope-status" role="status" aria-live="polite">{notice}</p>:null}
      </div>
    </div>:null}
  </section>;
}
