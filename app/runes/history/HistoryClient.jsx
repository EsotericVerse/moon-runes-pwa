'use client';

import { useEffect, useMemo, useState } from 'react';
import { deleteNeonRecord, listNeonRecords } from '../../loc/neon-user-storage';
import { useNeonAccount } from '../../loc/use-neon-account';
import DAILY_HISTORY_ARCHIVE from '../../../data/json/registries/LOC8_DAILY_RUNE_REPO_HISTORY.json';

const PAGE_SIZE=20;
const newest=(a,b)=>String(b?.created_at||'').localeCompare(String(a?.created_at||''));
const ARCHIVE_RECORDS=(DAILY_HISTORY_ARCHIVE.daily_draws||[]).map(row=>({
  id:'archive-'+row.id,type:'rune-draw',record_kind:'daily',date:row.date,record_date:row.date,
  created_at:row.date+'T12:00:00.000Z',
  mode_label:row.draw_kind==='daily_draw_supplement'?'歷史補抽':'歷史主抽',
  cards:[{position:row.draw_kind==='daily_draw_supplement'?'補抽':'今日',name:row.rune,direction:row.direction}],
  source:row.source||'RC3 archive',archived:true
}));
function recordFingerprint(record){
  const date=String(record?.record_date||record?.date||record?.created_at||'').slice(0,10);
  const card=(record?.cards||[]).map(item=>String(item?.name||'')+'|'+String(item?.direction||'')).sort().join(',');
  return date+'|'+card;
}
function mergeArchiveRecords(records){
  const seen=new Set((records||[]).map(recordFingerprint));
  return [...(records||[]),...ARCHIVE_RECORDS.filter(record=>!seen.has(recordFingerprint(record)))].sort(newest);
}

export default function HistoryClient({defaultKind='all'}){
  const account=useNeonAccount();
  const [records,setRecords]=useState([]);
  const [kind,setKind]=useState(defaultKind);
  const [page,setPage]=useState(1);
  const [status,setStatus]=useState('');

  async function reload(){
    if(!account.user){setRecords(mergeArchiveRecords([]));return;}
    const rows=await listNeonRecords('rune-draw');
    setRecords(mergeArchiveRecords(rows));
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
      <p>歷史日誌包含 RC3 已確認的每日符文紀錄；登入後會合併顯示帳戶自己的 Neon 抽牌紀錄。Neon 私人紀錄仍由 RLS 隔離。</p>
    </header>
    <section className="loc-card">
      {!account.user&&<div className="loc-actions"><span>目前先顯示 RC3 歷史紀錄。</span><button className="loc-button primary" type="button" onClick={account.signIn}>登入載入自己的 Neon 紀錄</button></div>}
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
        {record.archived?<p className="loc-meta">來源：{record.source} · 唯讀歷史紀錄</p>:<div className="loc-actions"><button className="loc-button" type="button" onClick={()=>remove(record.id)}>刪除</button></div>}
      </article>)}
    </div>
    {!!filtered.length&&<div className="runes-pager"><button type="button" disabled={page<=1} onClick={()=>setPage(v=>Math.max(1,v-1))}>上一頁</button><span>{page} / {pageCount}</span><button type="button" disabled={page>=pageCount} onClick={()=>setPage(v=>Math.min(pageCount,v+1))}>下一頁</button></div>}
  </section>;
}
