'use client';

import { useEffect, useMemo, useState } from 'react';
import { deleteLocalRecord, getLocalRecords } from '../../loc/local-db';

function formatTime(value){
  try{return new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}
  catch{return String(value||'—');}
}

export default function HistoryClient(){
  const [records,setRecords]=useState([]);
  const [status,setStatus]=useState('載入本機抽籤紀錄中…');
  const [filter,setFilter]=useState('all');

  async function reload(){
    try{
      const rows=await getLocalRecords('rune-draw');
      setRecords([...rows].sort((a,b)=>String(b?.created_at||'').localeCompare(String(a?.created_at||''))));
      setStatus(rows.length?'':'目前沒有本機抽籤紀錄。');
    }catch(err){setStatus(`本機抽籤紀錄讀取失敗：${err?.message||'未知錯誤'}`);}
  }

  useEffect(()=>{reload();},[]);

  const visible=useMemo(()=>records.filter(record=>filter==='all'||record.record_kind===filter),[records,filter]);

  async function remove(id){
    try{await deleteLocalRecord(id);await reload();}
    catch(err){setStatus(`刪除失敗：${err?.message||'未知錯誤'}`);}
  }

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">History · 抽籤紀錄</p>
      <h1>抽籤紀錄</h1>
      <p>一般抽牌與每日抽牌分開標記，紀錄只保存在目前瀏覽器的本機資料庫。</p>
    </header>
    <section className="loc-card">
      <div className="loc-actions" aria-label="抽籤紀錄篩選">
        <button type="button" className={`loc-button ${filter==='all'?'primary':''}`} onClick={()=>setFilter('all')}>全部</button>
        <button type="button" className={`loc-button ${filter==='daily'?'primary':''}`} onClick={()=>setFilter('daily')}>每日</button>
        <button type="button" className={`loc-button ${filter==='general'?'primary':''}`} onClick={()=>setFilter('general')}>一般抽牌</button>
      </div>
      {status&&<p className="loc-status">{status}</p>}
      <div className="loc-context-list">
        {visible.map(record=><article className="loc-context-item" key={record.id}>
          <div className="loc-result-meta"><span>{record.mode_label||record.mode||'抽牌'}</span><span>{formatTime(record.created_at)}</span></div>
          <strong>{(record.cards||[]).map(card=>`${card.position}・${card.name}・${card.direction}`).join(' ｜ ')||'無卡片資料'}</strong>
          <span>真實月相：{record.moon_phase||'—'} · 整體趨勢：{record.trend||'—'} · 分數：{Number(record.score||0).toFixed(3)}</span>
          {record.guidance?<span>{record.guidance}</span>:null}
          <div className="loc-actions"><button type="button" className="loc-button" onClick={()=>remove(record.id)}>刪除這筆</button></div>
        </article>)}
      </div>
      {!status&&!visible.length?<p className="loc-note">這個分類目前沒有紀錄。</p>:null}
    </section>
  </section>;
}
