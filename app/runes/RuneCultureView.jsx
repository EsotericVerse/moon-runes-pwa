'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLocJsonBatch, LOC_DATA } from '../loc/data';
import { useLocalStore } from '../loc/local-store';

const UI_SETTINGS_KEY='loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS={list_page_size:10};
const OPTIONS=[5,10,15,20,25,50];

export default function RuneCultureView(){
  const {value:uiSettings}=useLocalStore(UI_SETTINGS_KEY,DEFAULT_UI_SETTINGS);
  const [history,setHistory]=useState(null);const [runes,setRunes]=useState(null);const [page,setPage]=useState(1);const [error,setError]=useState('');
  const pageSize=OPTIONS.includes(Number(uiSettings?.list_page_size))?Number(uiSettings.list_page_size):10;
  useEffect(()=>{let live=true;fetchLocJsonBatch([LOC_DATA.HISTORY,LOC_DATA.RUNES],{concurrency:2}).then(([historyRows,runeRows])=>{if(live){setHistory(historyRows);setRunes(runeRows);}}).catch(e=>live&&setError(e.message));return()=>{live=false};},[]);
  useEffect(()=>setPage(1),[pageSize]);
  const rows=useMemo(()=>Array.isArray(history)?history.filter(row=>{const id=Number(row?.編號);return id>=1&&id<=66;}).sort((a,b)=>Number(a.編號)-Number(b.編號)):[],[history]);
  const canonical=useMemo(()=>Array.isArray(runes)?runes.filter(row=>{const id=Number(row?.編號);return id>=1&&id<=66;}):[],[runes]);
  const complete=rows.filter(item=>String(item?.符文變化歷史||'').trim()&&String(item?.神話故事||'').trim()).length;
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));const shown=rows.slice((page-1)*pageSize,page*pageSize);
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">LunaRunes Culture · 符文軌跡</p><h1>符文軌跡（文化）</h1><p>只呈現月之符文自身的歷史、語意變化與逐符軌跡；LOC 的 ERA、作品、音樂與跨 corpus 文化分析仍留在全域文化。</p></header>
    {error&&<div className="loc-status error">{error}</div>}
    {!history||!runes?<div className="loc-loading">載入符文文化資料…</div>:<>
      <div className="loc-metrics"><div><small>現行符文</small><strong>{canonical.length}/66</strong></div><div><small>歷程資料</small><strong>{rows.length}/66</strong></div><div><small>歷程完整</small><strong>{complete}/66</strong></div></div>
      <section className="loc-card"><p className="loc-eyebrow">Rune Trajectory</p><h2>逐符演化歷程</h2><div className="loc-context-list">{shown.map(item=><article className="loc-context-item" key={item.編號}><div className="loc-result-meta"><span>#{String(item.編號).padStart(2,'0')}</span><span>{item.名稱||item.符文名稱}</span></div><h3>{item.名稱||item.符文名稱}之符文</h3><p><strong>演化：</strong>{item.符文變化歷史||'—'}</p><p><strong>神話：</strong>{item.神話故事||'—'}</p></article>)}</div>{rows.length>pageSize&&<div className="loc-pagination"><span>第 {page} / {pages} 頁 · 共 {rows.length} 筆 · 每頁 {pageSize}</span><div><button className="loc-button" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>上一頁</button><button className="loc-button" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>下一頁</button></div></div>}</section>
    </>}
  </section>;
}
