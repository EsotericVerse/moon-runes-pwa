'use client';

import {useEffect,useMemo,useState} from 'react';
import {fetchLocJson,LOC_DATA} from '../loc/data';

const PAGE_SIZE=10;
const split=value=>String(value||'').split(/[、,，]/).map(x=>x.trim()).filter(Boolean);

export default function LunaRunesStaticsView(){
  const [tab,setTab]=useState('runes');
  const [runes,setRunes]=useState(null);
  const [daily,setDaily]=useState(null);
  const [error,setError]=useState('');
  const [page,setPage]=useState(1);
  useEffect(()=>{let live=true;setError('');const load=(path,setter)=>fetchLocJson(path).then(x=>live&&setter(x)).catch(e=>live&&setError(e.message));if(tab==='runes'&&!runes)load(LOC_DATA.RUNES,setRunes);if(tab==='daily'&&!daily)load(LOC_DATA.LOC8_DAILY_RUNE_REPO_HISTORY,setDaily);return()=>{live=false}},[tab,runes,daily]);
  useEffect(()=>setPage(1),[tab]);

  const groups=useMemo(()=>{const out={};for(const rune of runes||[]){const group=rune['所屬分組']||'特殊';out[group]=(out[group]||0)+1}return Object.entries(out)},[runes]);
  const keywords=useMemo(()=>{const count=new Map();for(const rune of runes||[])for(const term of [...split(rune['正向關鍵詞']),...split(rune['反向關鍵詞'])])count.set(term,(count.get(term)||0)+1);return [...count.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-Hant'))},[runes]);
  const draws=useMemo(()=>[...(daily?.daily_draws||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))),[daily]);
  const rows=tab==='daily'?draws:keywords;
  const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
  const shown=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">LunaRunes Scope · Statistics</p><h1>統計</h1><p className="loc-subtitle">只統計月之符文 Scope：符文結構、關鍵詞與每日抽牌紀錄；不混入作者 ERA、跨 Scope 來源或個人作品排行。</p></header>
    <nav className="loc-tabs" aria-label="月之符文統計"><button className={tab==='runes'?'active':''} onClick={()=>setTab('runes')}>符文統計</button><button className={tab==='daily'?'active':''} onClick={()=>setTab('daily')}>每日符文</button></nav>
    {error&&<div className="loc-status error">{error}</div>}
    {tab==='runes'&&<><section className="loc-card"><p className="loc-eyebrow">Rune Structure</p><h2>符文群組</h2>{runes?<><div className="loc-metrics"><div><small>資料符文</small><strong>{runes.length}</strong></div><div><small>1–64</small><strong>{runes.filter(r=>Number(r['編號'])>=1&&Number(r['編號'])<=64).length}</strong></div><div><small>特殊符文</small><strong>{runes.filter(r=>Number(r['編號'])>64).length}</strong></div></div><div className="loc-ranking">{groups.map(([g,n])=><div key={g}><b>{g}</b><span>{n}</span></div>)}</div></>:<p>載入中…</p>}</section>{runes&&<section className="loc-card"><p className="loc-eyebrow">Rune Keywords</p><h2>符文關鍵詞</h2><div className="loc-ranking">{shown.map(([term,n],i)=><div key={term}><b>{(page-1)*PAGE_SIZE+i+1}. {term}</b><span>{n} 次</span></div>)}</div></section>}</>}
    {tab==='daily'&&<section className="loc-card"><p className="loc-eyebrow">Daily Rune</p><h2>每日符文紀錄</h2>{daily?<><div className="loc-metrics"><div><small>紀錄數</small><strong>{draws.length}</strong></div><div><small>主抽</small><strong>{draws.filter(x=>x.draw_kind==='daily_draw').length}</strong></div><div><small>補抽</small><strong>{draws.filter(x=>x.draw_kind!=='daily_draw').length}</strong></div></div><div className="loc-history">{shown.map(x=><div key={x.id}><time>{x.date}</time><b>{x.rune}</b><span>{x.direction}</span><small>{x.draw_kind==='daily_draw'?'主抽':'補抽'}</small></div>)}</div></>:<p>載入中…</p>}</section>}
    {rows.length>PAGE_SIZE&&<div className="runes-pager"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>上一頁</button><span>{page} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>下一頁</button></div>}
  </section>;
}
