'use client';

import {useCallback,useEffect,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import PrivateLocalFiles from './PrivateLocalFiles';

export default function MyPhoneHome(){
  const [native,setNative]=useState(false);
  const [files,setFiles]=useState([]);
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState('');
  const [term,setTerm]=useState('');
  const reload=useCallback(async()=>{
    if(!Capacitor.isNativePlatform()||Capacitor.getPlatform()!=='ios')return;
    try{
      const [{Filesystem,Directory},{createPrivateLocalStore}]=await Promise.all([
        import('@capacitor/filesystem'),import('./private-local-files.mjs')
      ]);
      const local=createPrivateLocalStore(Filesystem,Directory.LibraryNoCloud);
      setFiles(await local.list());
      setError('');
    }catch(e){setError('無法讀取私人本機檔案清單：'+String(e?.message||e));}
    finally{setLoaded(true);}
  },[]);
  useEffect(()=>{
    if(!Capacitor.isNativePlatform()||Capacitor.getPlatform()!=='ios')return;
    setNative(true);
    reload();
    const reloadLocal=()=>reload();
    window.addEventListener('loc-private-file-changed',reloadLocal);
    return()=>window.removeEventListener('loc-private-file-changed',reloadLocal);
  },[reload]);
  if(!native)return <main className="scope-main"><section className="scope-page">
    <section className="loc-card"><h1>我的手機</h1><p>這是 LOC iOS App 專屬的本機首頁，不提供網站版或雲端資料存取。</p></section>
  </section></main>;
  const visible=term.trim()?files.filter(x=>x.name.toLocaleLowerCase().includes(term.trim().toLocaleLowerCase())):files;
  return <main className="scope-main"><section className="scope-page">
    <header className="loc-hero">
      <p className="loc-eyebrow">My Phone · Local Only</p>
      <h1>我的手機</h1>
      <p>只管理這支 iPhone 的 Local File。沒有完成匯入前不顯示任何作品、搜尋結果或統計。</p>
    </header>
    <div className="scope-content scope-settings-options">
      <section className="loc-card">
        <h2>我的本機檔案</h2>
        <p className="scope-settings-note">已保存的原始檔案：{files.length} 份。檔名搜尋不等於全文搜尋，尚未解析的內容不會算進作品統計。</p>
        <form onSubmit={event=>event.preventDefault()} className="scope-stat-controls">
          <label><span>搜尋已匯入檔案名稱</span>
            <input type="search" value={term} onChange={event=>setTerm(event.target.value)} placeholder="輸入檔名或作品名稱"/></label>
          <button type="button" className="loc-button" onClick={reload}>重新整理</button>
        </form>
        {error?<p role="alert" className="scope-status scope-error">{error}</p>:null}
        {!loaded?<p role="status">正在讀取本機檔案…</p>:null}
        {loaded&&!files.length?<p role="status">尚未匯入作品。請從下方選取檔案；匯入成功後才會出現在這裡。</p>:null}
        {loaded&&files.length&&!visible.length?<p role="status">沒有符合檔名的已匯入檔案。</p>:null}
        {visible.map(entry=><div className="scope-inline-card" key={entry.id}>
          <strong>{entry.name}</strong>
          <p className="scope-settings-note">原始檔已保存 · {Number(entry.size||0).toLocaleString('zh-TW')} bytes · 尚未建立全文索引</p>
        </div>)}
      </section>
      <PrivateLocalFiles/>
      <section className="loc-card">
        <h2>文化統計與作品全文搜尋</h2>
        <p className="scope-settings-note">此處只計入成功解析並確認寫入本機索引的作品。尚未完成解析時，不顯示虛構的作品數量或統計圖。</p>
        <p>目前尚未建立可用的本機作品全文索引。</p>
      </section>
    </div>
  </section></main>;
}
