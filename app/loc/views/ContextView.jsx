'use client';

import {useEffect,useState} from 'react';
import {useSiteScope} from '../../SiteScopeProvider';
import {neonClient} from '../neon-client';

const PAGE_SIZE=20;

export default function ContextView(){
  const {current,dataView,ready}=useSiteScope();
  const view=dataView('context');
  const [rows,setRows]=useState([]);
  const [page,setPage]=useState(1);
  const [error,setError]=useState('');

  useEffect(()=>{
    let live=true;
    setRows([]);setError('');setPage(1);
    if(!ready||!view)return()=>{live=false};
    neonClient.from(view).select('*').order('updated_at',{ascending:false}).limit(1000)
      .then(({data,error})=>{
        if(!live)return;
        if(error)throw new Error(error.message||'Context read failed');
        setRows(data||[]);
      }).catch(e=>live&&setError(String(e?.message||e)));
    return()=>{live=false};
  },[ready,view]);

  const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
  const shown=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Context</p>
      <h1>脈絡</h1>
      <p className="loc-subtitle">{current.label} Scope 的脈絡資料；同一個功能模組依 registry 自動切換資料來源。</p>
    </header>
    {!ready?<p className="loc-status">載入 Scope…</p>:!view?<p className="loc-status">此 Scope 尚未啟用脈絡 projection。</p>:null}
    {error?<p className="loc-status error">{error}</p>:null}
    <div className="loc-context-list">
      {shown.map(row=><article className="loc-context-item" key={row.context_key}>
        <div className="loc-result-meta"><span>{row.scope_id||current.id}</span><span>{row.context_type}</span></div>
        <h3>{row.title}</h3>
        {row.summary?<p>{row.summary}</p>:null}
      </article>)}
    </div>
    {!rows.length&&!error&&ready&&view?<p className="loc-status">載入中…</p>:null}
    {rows.length?<div className="loc-pagination"><span>第 {page} / {pages} 頁 · 共 {rows.length} 筆</span><div><button className="loc-button" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>上一頁</button><button className="loc-button" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>下一頁</button></div></div>:null}
  </section>;
}
