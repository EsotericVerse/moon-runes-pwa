'use client';

import { useEffect, useState } from 'react';
import { deleteNeonRecord, listNeonRecords } from '../../loc/neon-user-storage';
import { useNeonAccount } from '../../loc/use-neon-account';

const PAGE_SIZE=20;

export default function HistoryClient({defaultKind='all'}){
  const account=useNeonAccount();
  const [records,setRecords]=useState([]);
  const [total,setTotal]=useState(0);
  const [kind,setKind]=useState(defaultKind);
  const [page,setPage]=useState(1);
  const [status,setStatus]=useState('');

  async function reload(targetPage=page,targetKind=kind){
    if(!account.user||!account.canManageScopeSync('lrunes')){setRecords([]);setTotal(0);return;}
    const result=await listNeonRecords('rune-draw',{
      recordKind:targetKind==='all'?'':targetKind,
      offset:(targetPage-1)*PAGE_SIZE,
      limit:PAGE_SIZE,
      count:true
    });
    setRecords(result.rows);
    setTotal(result.totalCount);
  }

  useEffect(()=>{reload(1,kind).catch(error=>setStatus(String(error?.message||error)))},[account.user?.email,account.canManageScopeSync('lrunes'),kind]);
  const pageCount=Math.max(1,Math.ceil(total/PAGE_SIZE));
  const shown=records;

  async function remove(id){
    await deleteNeonRecord(id);
    await reload();
    setStatus('已刪除 Neon 抽牌紀錄。');
  }

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">每日抽籤紀錄</p>
      <h1>每日符文抽籤紀錄</h1>
      <p>每日抽籤紀錄。藉由此來查趨勢。</p>
    </header>
    <section className="loc-card">
      {account.canManageScopeSync('lrunes')&&<div className="loc-result-meta"><span>{account.user?.email||account.user?.name}</span></div>}
      <div className="loc-filter-row">
        <select value={kind} onChange={e=>{setKind(e.target.value);setPage(1)}}>
          <option value="all">全部</option>
          <option value="daily">每日</option>
          <option value="general">一般抽牌</option>
        </select>
        <span>{total} 筆</span>
      </div>
      {status&&<p className="loc-status">{status}</p>}
    </section>
    <div className="loc-context-list">
      {!account.canManageScopeSync('lrunes')&&<section className="loc-card"><p className="loc-status">管理模式未開啟。</p></section>}
      {account.canManageScopeSync('lrunes')&&!shown.length&&<section className="loc-card"><p className="loc-status">目前沒有抽牌紀錄。</p></section>}
      {shown.map(record=><article className="loc-card" key={record.id}>
        <div className="loc-result-meta"><span>{record.mode_label||record.mode||record.record_kind}</span><span>{String(record.created_at||'').replace('T',' ').slice(0,16)}</span></div>
        <h2>{(record.cards||[]).map(card=>`${card.position}・${card.name}・${card.direction}`).join(' ｜ ')}</h2>
        <p>真實月相：{record.moon_phase||'—'} · 趨勢：{record.trend||'未知'} · 結果：{record.result||'未知'}</p>
        {record.guidance&&<p>{record.guidance}</p>}
        {record.archived?<p className="loc-meta">來源：{record.source} · 唯讀歷史紀錄</p>:<div className="loc-actions"><button className="loc-button" type="button" onClick={()=>remove(record.id)}>刪除</button></div>}
      </article>)}
    </div>
    {!!total&&<div className="runes-pager"><button type="button" disabled={page<=1} onClick={async()=>{const next=Math.max(1,page-1);setPage(next);await reload(next,kind)}}>上一頁</button><span>{page} / {pageCount}</span><button type="button" disabled={page>=pageCount} onClick={async()=>{const next=Math.min(pageCount,page+1);setPage(next);await reload(next,kind)}}>下一頁</button></div>}
  </section>;
}
