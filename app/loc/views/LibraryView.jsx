'use client';

import { useEffect, useMemo, useState } from 'react';
import { deleteNeonRecord, listNeonRecords, putNeonRecord } from '../neon-user-storage';
import { useNeonSetting } from '../use-neon-setting';
import { useLocalStore } from '../local-store';
import { classifyRecords } from '../model/style-classifier';
import { createLibraryRecord, INITIAL_STYLE_PROFILE, LIBRARY_RECORD_TYPE, STYLE_STORAGE_KEY } from '../model/style-profile';

const UI_SETTINGS_KEY='loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS={draw_response:'ritual',list_page_size:10};
const LIST_PAGE_OPTIONS=[5,10,15,20,25,50];
const byNewest=(a,b)=>String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''));

export default function LibraryView(){
  const {value:profile,account}=useNeonSetting(STYLE_STORAGE_KEY,INITIAL_STYLE_PROFILE);
  const {value:uiSettings}=useLocalStore(UI_SETTINGS_KEY,DEFAULT_UI_SETTINGS);
  const [records,setRecords]=useState([]);
  const [query,setQuery]=useState('');
  const [group,setGroup]=useState('');
  const [message,setMessage]=useState('');
  const [progress,setProgress]=useState(null);
  const [page,setPage]=useState(1);
  const pageSize=LIST_PAGE_OPTIONS.includes(Number(uiSettings?.list_page_size))?Number(uiSettings.list_page_size):10;

  async function reload(){
    if(!account.user){setRecords([]);return;}
    const rows=await listNeonRecords(LIBRARY_RECORD_TYPE);
    setRecords(rows.sort(byNewest));
  }
  useEffect(()=>{reload().catch(error=>setMessage(`Neon 讀取失敗：${error.message}`))},[account.user?.id]);

  const groups=useMemo(()=>{
    const names=new Set();
    records.forEach(record=>record.classification?.matches?.forEach(match=>names.add(match.name)));
    return [...names].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
  },[records]);

  const filtered=useMemo(()=>records.filter(record=>{
    const q=query.trim().toLowerCase();
    const textMatch=!q||`${record.title||''}\n${record.text||''}\n${record.source||''}`.toLowerCase().includes(q);
    const groupMatch=!group||record.classification?.matches?.some(match=>match.name===group);
    return textMatch&&groupMatch;
  }),[records,query,group]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize));
  const shownRecords=filtered.slice((page-1)*pageSize,page*pageSize);
  useEffect(()=>setPage(1),[query,group,pageSize]);
  useEffect(()=>{if(page>pageCount)setPage(pageCount)},[page,pageCount]);

  async function remove(id){
    await deleteNeonRecord(id);
    await reload();
    setMessage('已從 Neon Library 刪除。');
  }

  async function reclassify(mode='all'){
    const targets=mode==='missing'?records.filter(record=>!record.classification):records;
    setProgress({processed:0,total:targets.length,percent:targets.length?0:100});
    const classified=await classifyRecords(targets,profile,{getText:item=>item.text,onProgress:setProgress});
    for(const item of classified)await putNeonRecord({...item,updated_at:new Date().toISOString()});
    await reload();
    setMessage(`重新分類完成：${classified.length} 筆。`);
  }



  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Neon Library</p>
      <h1>Library</h1>
      <p>原始文字與分類結果統一儲存在 Neon。修改群組規則後，可重新分類而不改寫原始文字；舊瀏覽器資料在首次登入後會自動遷移。</p>
    </header>

    <section className="loc-card">
      <div className="loc-actions">
        {!account.user&&<button className="loc-button primary" type="button" onClick={account.signIn}>使用 Google 登入 Neon</button>}{account.user&&<a className="loc-button primary" href="/classify">＋新增／分類文字</a>}
        <button className="loc-button" onClick={()=>reclassify('missing')} disabled={!records.length}>分類未分類資料</button>
        <button className="loc-button" onClick={()=>reclassify('all')} disabled={!records.length}>重新分類全部</button>
      </div>
      <div className="loc-metrics"><div><small>Library</small><strong>{records.length}</strong></div><div><small>目前顯示</small><strong>{filtered.length}</strong></div><div><small>已分類</small><strong>{records.filter(r=>r.classification).length}</strong></div></div>
      {progress&&<div className="loc-progress"><progress value={progress.processed} max={Math.max(progress.total,1)}/><span>{progress.processed} / {progress.total} · {progress.percent}%</span></div>}
      <p className="loc-status">{account.loading?'正在確認 Neon 帳號…':account.user?`Neon 已登入：${account.user.email||account.user.name||'使用者'}`:'尚未登入；登入後才能讀寫個人 Library。'} 每頁 {pageSize} 筆。</p>
      {message&&<p className="loc-status">{message}</p>}
    </section>

    <section className="loc-card">
      <div className="loc-filter-row">
        <select value={group} onChange={e=>setGroup(e.target.value)}><option value="">全部群組</option>{groups.map(name=><option key={name} value={name}>{name}</option>)}</select>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋標題、內容或來源"/>
      </div>
    </section>

    <div className="loc-context-list">
      {!filtered.length&&<section className="loc-card"><p className="loc-status">Library 目前沒有符合條件的資料。</p></section>}
      {shownRecords.map(record=><article className="loc-card loc-library-record" key={record.id}>
        <div className="loc-result-meta"><span>{record.source||'manual'} · {record.created_at?.slice(0,10)||''}</span><button className="loc-button" onClick={()=>remove(record.id)}>刪除</button></div>
        <h2>{record.title}</h2>
        <p className="loc-library-snippet">{record.text?.slice(0,500)}{record.text?.length>500?'…':''}</p>
        <div className="loc-chip-list">{record.classification?.matches?.map(match=><span key={`${record.id}-${match.id}`}>{match.name}{match.hits?.length?` · ${match.hits.join('、')}`:' · fallback'}</span>)||<span>尚未分類</span>}</div>
      </article>)}
    </div>
    {!!filtered.length&&<div className="runes-pager"><button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button><span>{page} / {pageCount}</span><button type="button" disabled={page>=pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>下一頁</button></div>}
  </section>;
}
