'use client';

import { useEffect, useMemo, useState } from 'react';
import { deleteNeonRecord, listNeonRecords } from '../../loc/neon-user-storage';
import { useNeonAccount } from '../../loc/use-neon-account';

const PAGE_SIZE=20;
const newest=(a,b)=>String(b?.created_at||'').localeCompare(String(a?.created_at||''));

export default function HistoryClient(){
  const account=useNeonAccount();
  const [records,setRecords]=useState([]);
  const [kind,setKind]=useState('all');
  const [page,setPage]=useState(1);
  const [status,setStatus]=useState('');

  async function reload(){
    if(!account.user){setRecords([]);return;}
    const rows=await listNeonRecords('rune-draw');
    setRecords(rows.sort(newest));
  }

  useEffect(()=>{reload().catch(error=>setStatus(String(error?.message||error)))},[account.user?.id]);
  useEffect(()=>setPage(1),[kind]);

  const filtered=useMemo(()=>kind==='all'?records:records.filter(row=>row.record_kind===kind),[records,kind]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const shown=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  async function remove(id){
    await deleteNeonRecord(id);
    await reload();
    setStatus('已刪除 Neon 抽牌紀錄。');
  }

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Neon History · 抽籤紀錄</p>
      <h1>抽籤紀錄</h1>
      <p>選擇儲存的抽牌紀錄統一保存在 Neon，並由登入帳號的 RLS 隔離。</p>
    </header>
    <section className="loc-card">
      {!account.user&&<div className="loc-actions"><button className="loc-button primary" type="button" onClick={account.signIn}>使用 Google 登入 Neon</button></div>}
      {account.user&&<div className="loc-result-meta"><span>{account.user.email||account.user.name}</span><button className="loc-button" type="button" onClick={account.signOut}>登出</button></div>}
      <div className="loc-filter-row">
        <select value={kind} onChange={e=>setKind(e.target.value)}>
          <option value="all">全部</option>
          <option value="daily">每日</option>
          <option value="general">一般抽牌</option>
        </select>
        <span>{filtered.length} 筆</span>
      </div>
      {status&&<p className="loc-status">{status}</p>}
    </section>
    <div className="loc-context-list">
      {!account.user&&<section className="loc-card"><p className="loc-status">登入後顯示自己的 Neon 抽牌歷史。</p></section>}
      {account.user&&!shown.length&&<section className="loc-card"><p className="loc-status">目前沒有抽牌紀錄。</p></section>}
      {shown.map(record=><article className="loc-card" key={record.id}>
        <div className="loc-result-meta"><span>{record.mode_label||record.mode||record.record_kind}</span><span>{String(record.created_at||'').replace('T',' ').slice(0,16)}</span></div>
        <h2>{(record.cards||[]).map(card=>`${card.position}・${card.name}・${card.direction}`).join(' ｜ ')}</h2>
        <p>真實月相：{record.moon_phase||'—'} · 趨勢：{record.trend||'—'}{Number.isFinite(Number(record.score))?` · 分數：${Number(record.score).toFixed(3)}`:''}</p>
        {record.guidance&&<p>{record.guidance}</p>}
        <div className="loc-actions"><button className="loc-button" type="button" onClick={()=>remove(record.id)}>刪除</button></div>
      </article>)}
    </div>
    {!!filtered.length&&<div className="runes-pager"><button type="button" disabled={page<=1} onClick={()=>setPage(v=>Math.max(1,v-1))}>上一頁</button><span>{page} / {pageCount}</span><button type="button" disabled={page>=pageCount} onClick={()=>setPage(v=>Math.min(pageCount,v+1))}>下一頁</button></div>}
  </section>;
}
