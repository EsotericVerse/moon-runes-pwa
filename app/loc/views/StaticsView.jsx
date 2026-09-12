'use client';

import { useEffect, useMemo, useState } from 'react';

const TABS=[['ranking','排行榜'],['runes','符文統計'],['sources','來源管理'],['daily','每日符文'],['import','匯入']];
const json=async path=>{const r=await fetch(path,{cache:'force-cache'});if(!r.ok)throw new Error(`${path}: HTTP ${r.status}`);return r.json();};
const split=v=>String(v||'').split(/[、,，]/).map(x=>x.trim()).filter(Boolean);

export default function StaticsView(){
  const [tab,setTab]=useState('ranking');
  const [sources,setSources]=useState(null);
  const [periods,setPeriods]=useState(null);
  const [runes,setRunes]=useState(null);
  const [daily,setDaily]=useState(null);
  const [error,setError]=useState('');

  useEffect(()=>{let live=true;Promise.all([json('/data/json/generated/search/SEARCH_SOURCE_STATS.json'),json('/data/json/registries/LOC6_PERIOD_KEYWORD_ANALYSIS.json')]).then(([s,p])=>{if(live){setSources(s);setPeriods(p);}}).catch(e=>live&&setError(e.message));return()=>{live=false};},[]);
  useEffect(()=>{if((tab==='runes'||tab==='ranking')&&!runes)json('/data/json/core/runes.json').then(setRunes).catch(e=>setError(e.message));if(tab==='daily'&&!daily)json('/data/json/registries/LOC8_DAILY_RUNE_REPO_HISTORY.json').then(setDaily).catch(e=>setError(e.message));},[tab,runes,daily]);

  const groups=useMemo(()=>{const out={};for(const r of runes||[]){const g=r['所屬分組']||'特殊';out[g]=(out[g]||0)+1;}return Object.entries(out);},[runes]);
  const keywordRanks=useMemo(()=>{const count=new Map();for(const r of runes||[])for(const term of [...split(r['正向關鍵詞']),...split(r['反向關鍵詞'])])count.set(term,(count.get(term)||0)+1);return [...count.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-Hant')).slice(0,24);},[runes]);
  const latestPeriod=periods?.periods?.at(-1);
  const draws=daily?.daily_draws||[];
  const primary=draws.filter(x=>x.draw_kind==='daily_draw').length;

  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">LOC Statistics</p><h1>統計</h1><p>排行榜、符文統計、來源管理與每日符文集中於此。資料依功能載入，不再進站時一次掃描所有 corpus／音樂 shards。</p></header>
    <nav className="loc-tabs" aria-label="統計功能">{TABS.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>
    {error&&<div className="loc-status error">{error}</div>}
    {tab==='ranking'&&<div className="loc-grid two"><section className="loc-card"><p className="loc-eyebrow">Period Keywords</p><h2>跨時期關鍵字</h2>{latestPeriod?<><p>最新分析：{latestPeriod.period} · {latestPeriod.document_count?.toLocaleString()} 筆文件</p><div className="loc-ranking">{latestPeriod.keywords?.slice(0,15).map((x,i)=><div key={x.term}><b>{i+1}. {x.term}</b><span>{x.document_count} 篇 · {x.percent}%</span></div>)}</div></>:<p>載入中…</p>}</section><section className="loc-card"><p className="loc-eyebrow">Rune Keywords · No API</p><h2>符文關鍵詞</h2>{runes?<div className="loc-ranking">{keywordRanks.map(([term,n],i)=><div key={term}><b>{i+1}. {term}</b><span>{n} 次</span></div>)}</div>:<p>載入中…</p>}</section></div>}
    {tab==='runes'&&<section className="loc-card"><p className="loc-eyebrow">Rune Structure</p><h2>符文群組統計</h2>{runes?<><div className="loc-metrics"><div><small>資料符文</small><strong>{runes.length}</strong></div><div><small>1–64 基礎符文</small><strong>{runes.filter(r=>r['編號']>=1&&r['編號']<=64).length}</strong></div><div><small>特殊符文</small><strong>{runes.filter(r=>r['編號']>64).length}</strong></div></div><div className="loc-ranking">{groups.map(([g,n])=><div key={g}><b>{g}</b><span>{n}</span></div>)}</div></>:<p>載入中…</p>}</section>}
    {tab==='sources'&&<section className="loc-card"><p className="loc-eyebrow">Search Sources</p><h2>來源管理</h2>{sources?<><div className="loc-metrics"><div><small>可比對筆數</small><strong>{sources.search_summary.comparable_records.toLocaleString()}</strong></div><div><small>可比對字數</small><strong>{sources.search_summary.char_count.toLocaleString()}</strong></div><div><small>KM 文件</small><strong>{sources.knowledge_summary.knowledge_document_records}</strong></div></div><div className="loc-table-wrap"><table className="loc-table"><thead><tr><th>來源</th><th>可搜尋</th><th>字數</th><th>期間</th><th>狀態</th></tr></thead><tbody>{[...(sources.text_sources||[]),...(sources.media_sources||[])].map(x=><tr key={x.source}><td>{x.source}</td><td>{(x.searchable_records??x.public_url_records??x.records)?.toLocaleString?.()||x.records}</td><td>{x.char_count?.toLocaleString?.()||'—'}</td><td>{x.start_date}–{x.end_date}</td><td>{x.status}</td></tr>)}</tbody></table></div></>:<p>載入中…</p>}</section>}
    {tab==='daily'&&<section className="loc-card"><p className="loc-eyebrow">Daily Rune History</p><h2>每日符文</h2>{daily?<><div className="loc-metrics"><div><small>紀錄數</small><strong>{draws.length}</strong></div><div><small>主抽</small><strong>{primary}</strong></div><div><small>補抽</small><strong>{draws.length-primary}</strong></div></div><div className="loc-history">{[...draws].reverse().slice(0,20).map(x=><div key={x.id}><time>{x.date}</time><b>{x.rune}</b><span>{x.direction}</span><small>{x.draw_kind==='daily_draw'?'主抽':'補抽'}</small></div>)}</div></>:<p>載入中…</p>}</section>}
    {tab==='import'&&<section className="loc-card"><p className="loc-eyebrow">Import</p><h2>匯入</h2><p>匯入功能暫時不開放；保留功能位置，但不載入任何額外 runtime。</p></section>}
  </section>;
}
