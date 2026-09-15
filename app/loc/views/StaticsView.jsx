'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLocJson, LOC_DATA } from '../data';
import { useLocalStore } from '../local-store';

const TABS=[['ranking','排行榜'],['runes','符文統計'],['sources','來源管理'],['daily','每日符文']];
const UI_SETTINGS_KEY='loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS={draw_response:'ritual',list_page_size:10};
const LIST_PAGE_OPTIONS=[5,10,15,20,25,50];
const split=value=>String(value||'').split(/[、,，]/).map(x=>x.trim()).filter(Boolean);

function Pager({page,pages,pageSize,setPage}){
  if(pages<=1)return null;
  return <div className="loc-pagination"><span>第 {page} / {pages} 頁 · 每頁 {pageSize}</span><div><button className="loc-button" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>上一頁</button><button className="loc-button" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>下一頁</button></div></div>;
}

export default function StaticsView(){
  const {value:uiSettings}=useLocalStore(UI_SETTINGS_KEY,DEFAULT_UI_SETTINGS);
  const [tab,setTab]=useState('ranking');
  const [sources,setSources]=useState(null);
  const [periods,setPeriods]=useState(null);
  const [runes,setRunes]=useState(null);
  const [daily,setDaily]=useState(null);
  const [periodPage,setPeriodPage]=useState(1);
  const [keywordPage,setKeywordPage]=useState(1);
  const [dailyPage,setDailyPage]=useState(1);
  const [sourcePage,setSourcePage]=useState(1);
  const [error,setError]=useState('');
  const pageSize=LIST_PAGE_OPTIONS.includes(Number(uiSettings?.list_page_size))?Number(uiSettings.list_page_size):10;

  useEffect(()=>{
    let live=true;
    const load=(path,setter)=>fetchLocJson(path).then(data=>live&&setter(data)).catch(e=>live&&setError(e.message));
    if(tab==='ranking'){
      if(!periods)load(LOC_DATA.LOC6_PERIOD_KEYWORD_ANALYSIS,setPeriods);
      if(!runes)load(LOC_DATA.RUNES,setRunes);
    }
    if(tab==='runes'&&!runes)load(LOC_DATA.RUNES,setRunes);
    if(tab==='sources'&&!sources)load(LOC_DATA.SEARCH_SOURCE_STATS,setSources);
    if(tab==='daily'&&!daily)load(LOC_DATA.LOC8_DAILY_RUNE_REPO_HISTORY,setDaily);
    return()=>{live=false};
  },[tab,periods,runes,sources,daily]);
  useEffect(()=>{setPeriodPage(1);setKeywordPage(1);setDailyPage(1);setSourcePage(1)},[pageSize]);

  const groups=useMemo(()=>{const out={};for(const rune of runes||[]){const group=rune['所屬分組']||'特殊';out[group]=(out[group]||0)+1;}return Object.entries(out);},[runes]);
  const keywordRanks=useMemo(()=>{const count=new Map();for(const rune of runes||[])for(const term of [...split(rune['正向關鍵詞']),...split(rune['反向關鍵詞'])])count.set(term,(count.get(term)||0)+1);return [...count.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-Hant'));},[runes]);
  const latestPeriod=periods?.periods?.at(-1);
  const periodKeywords=latestPeriod?.keywords||[];
  const periodPages=Math.max(1,Math.ceil(periodKeywords.length/pageSize));
  const keywordPages=Math.max(1,Math.ceil(keywordRanks.length/pageSize));
  const shownPeriodKeywords=periodKeywords.slice((periodPage-1)*pageSize,periodPage*pageSize);
  const shownKeywordRanks=keywordRanks.slice((keywordPage-1)*pageSize,keywordPage*pageSize);
  const draws=useMemo(()=>[...(daily?.daily_draws||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.id||'').localeCompare(String(a.id||''))),[daily]);
  const primary=draws.filter(x=>x.draw_kind==='daily_draw').length;
  const dailyPages=Math.max(1,Math.ceil(draws.length/pageSize));
  const sourceRows=useMemo(()=>[...(sources?.text_sources||[]),...(sources?.media_sources||[])],[sources]);
  const sourcePages=Math.max(1,Math.ceil(sourceRows.length/pageSize));
  const shownSources=sourceRows.slice((sourcePage-1)*pageSize,sourcePage*pageSize);

  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">LOC Statistics</p><h1>統計</h1><p>排行榜、符文統計、來源狀態與每日符文集中於此。公開頁只讀取與呈現資料；各分頁只在使用時載入自己的資料。</p></header>
    <nav className="loc-tabs" aria-label="統計功能">{TABS.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>
    {error&&<div className="loc-status error">{error}</div>}

    {tab==='ranking'&&<div className="loc-grid two">
      <section className="loc-card"><p className="loc-eyebrow">Period Keywords</p><h2>跨時期關鍵字</h2>{latestPeriod?<><p>最新分析：{latestPeriod.period} · {latestPeriod.document_count?.toLocaleString()} 筆文件</p><div className="loc-ranking">{shownPeriodKeywords.map((x,i)=><div key={x.term}><b>{(periodPage-1)*pageSize+i+1}. {x.term}</b><span>{x.document_count} 篇 · {x.percent}%</span></div>)}</div><Pager page={periodPage} pages={periodPages} pageSize={pageSize} setPage={setPeriodPage}/></>:<p>載入中…</p>}</section>
      <section className="loc-card"><p className="loc-eyebrow">Rune Keywords · No API</p><h2>符文關鍵詞</h2>{runes?<><div className="loc-ranking">{shownKeywordRanks.map(([term,n],i)=><div key={term}><b>{(keywordPage-1)*pageSize+i+1}. {term}</b><span>{n} 次</span></div>)}</div><Pager page={keywordPage} pages={keywordPages} pageSize={pageSize} setPage={setKeywordPage}/></>:<p>載入中…</p>}</section>
    </div>}

    {tab==='runes'&&<section className="loc-card"><p className="loc-eyebrow">Rune Structure</p><h2>符文群組統計</h2>{runes?<><div className="loc-metrics"><div><small>資料符文</small><strong>{runes.length}</strong></div><div><small>1–64 基礎符文</small><strong>{runes.filter(r=>r['編號']>=1&&r['編號']<=64).length}</strong></div><div><small>特殊符文</small><strong>{runes.filter(r=>r['編號']>64).length}</strong></div></div><div className="loc-ranking">{groups.map(([g,n])=><div key={g}><b>{g}</b><span>{n}</span></div>)}</div></>:<p>載入中…</p>}</section>}

    {tab==='sources'&&<section className="loc-card"><p className="loc-eyebrow">Search Sources</p><h2>來源狀態</h2>{sources?<><div className="loc-metrics"><div><small>可比對筆數</small><strong>{sources.search_summary.comparable_records.toLocaleString()}</strong></div><div><small>可比對字數</small><strong>{sources.search_summary.char_count.toLocaleString()}</strong></div><div><small>KM 文件</small><strong>{sources.knowledge_summary.knowledge_document_records}</strong></div></div><div className="loc-table-wrap"><table className="loc-table"><thead><tr><th>來源</th><th>可搜尋</th><th>字數</th><th>期間</th><th>狀態</th></tr></thead><tbody>{shownSources.map(x=><tr key={x.source}><td>{x.source}</td><td>{(x.searchable_records??x.public_url_records??x.records)?.toLocaleString?.()||x.records}</td><td>{x.char_count?.toLocaleString?.()||'—'}</td><td>{x.start_date}–{x.end_date}</td><td>{x.status}</td></tr>)}</tbody></table></div><Pager page={sourcePage} pages={sourcePages} pageSize={pageSize} setPage={setSourcePage}/></>:<p>載入中…</p>}</section>}

    {tab==='daily'&&<section className="loc-card"><p className="loc-eyebrow">Daily Rune History · Read Only</p><h2>每日符文趨勢</h2><p>公開統計頁只顯示正式每日符文紀錄，不提供新增、修改、刪除或下載後回填母資料的控制項。</p>{daily?<><div className="loc-metrics"><div><small>紀錄數</small><strong>{draws.length}</strong></div><div><small>主抽</small><strong>{primary}</strong></div><div><small>補抽</small><strong>{draws.length-primary}</strong></div></div><div className="loc-history">{draws.slice((dailyPage-1)*pageSize,dailyPage*pageSize).map(x=><div key={x.id}><time>{x.date}</time><b>{x.rune}</b><span>{x.direction}</span><small>{x.draw_kind==='daily_draw'?'主抽':'補抽'}</small></div>)}</div><Pager page={dailyPage} pages={dailyPages} pageSize={pageSize} setPage={setDailyPage}/></>:<p>載入中…</p>}</section>}
  </section>;
}
