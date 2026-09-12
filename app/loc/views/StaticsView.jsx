'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLocJson, LOC_DATA } from '../data';

const TABS=[['ranking','排行榜'],['runes','符文統計'],['sources','來源管理'],['daily','每日符文'],['import','匯入']];
const PERIODS='/data/json/registries/LOC6_PERIOD_KEYWORD_ANALYSIS.json';
const SOURCE_STATS='/data/json/generated/search/SEARCH_SOURCE_STATS.json';
const DAILY_HISTORY='/data/json/registries/LOC8_DAILY_RUNE_REPO_HISTORY.json';
const DAILY_PAGE_SIZE=10;
const split=value=>String(value||'').split(/[、,，]/).map(x=>x.trim()).filter(Boolean);
const today=()=>new Date().toISOString().slice(0,10);

function downloadDailyJson(document,rows){
  const output={...document,role:'canonical daily rune history',updated_at:new Date().toISOString(),daily_draws:[...rows].sort((a,b)=>String(a.date).localeCompare(String(b.date)))};
  const blob=new Blob([JSON.stringify(output,null,2)+'\n'],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download='LOC8_DAILY_RUNE_REPO_HISTORY.json';document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  return output;
}

export default function StaticsView(){
  const [tab,setTab]=useState('ranking');
  const [sources,setSources]=useState(null);
  const [periods,setPeriods]=useState(null);
  const [runes,setRunes]=useState(null);
  const [daily,setDaily]=useState(null);
  const [dailyPage,setDailyPage]=useState(1);
  const [dailyStatus,setDailyStatus]=useState('');
  const [dailyForm,setDailyForm]=useState({date:today(),draw_kind:'daily_draw',rune:'',direction:'正位',note:''});
  const [error,setError]=useState('');

  useEffect(()=>{
    let live=true;
    const load=(path,setter)=>fetchLocJson(path).then(data=>live&&setter(data)).catch(e=>live&&setError(e.message));
    if(tab==='ranking'){
      if(!periods)load(PERIODS,setPeriods);
      if(!runes)load(LOC_DATA.RUNES,setRunes);
    }
    if(tab==='runes'&&!runes)load(LOC_DATA.RUNES,setRunes);
    if(tab==='sources'&&!sources)load(SOURCE_STATS,setSources);
    if(tab==='daily'){
      if(!daily)load(DAILY_HISTORY,setDaily);
      if(!runes)load(LOC_DATA.RUNES,setRunes);
    }
    return()=>{live=false};
  },[tab,periods,runes,sources,daily]);

  const groups=useMemo(()=>{const out={};for(const rune of runes||[]){const group=rune['所屬分組']||'特殊';out[group]=(out[group]||0)+1;}return Object.entries(out);},[runes]);
  const keywordRanks=useMemo(()=>{const count=new Map();for(const rune of runes||[])for(const term of [...split(rune['正向關鍵詞']),...split(rune['反向關鍵詞'])])count.set(term,(count.get(term)||0)+1);return [...count.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-Hant')).slice(0,24);},[runes]);
  const latestPeriod=periods?.periods?.at(-1);
  const draws=useMemo(()=>[...(daily?.daily_draws||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.id||'').localeCompare(String(a.id||''))),[daily]);
  const primary=draws.filter(x=>x.draw_kind==='daily_draw').length;
  const dailyPages=Math.max(1,Math.ceil(draws.length/DAILY_PAGE_SIZE));
  const dailyRunes=useMemo(()=>[...(runes||[])].filter(x=>Number(x['編號'])>=1&&Number(x['編號'])<=66).sort((a,b)=>Number(a['編號'])-Number(b['編號'])),[runes]);

  function updateDailyForm(key,value){setDailyForm(previous=>({...previous,[key]:value}));}
  function saveDailyRecord(event){
    event.preventDefault();
    if(!dailyForm.date||!dailyForm.rune){setDailyStatus('請先選擇日期與符文。');return;}
    const rune=dailyRunes.find(item=>item['符文名稱']===dailyForm.rune);
    const row={id:`LOCAL-${Date.now()}`,date:dailyForm.date,draw_kind:dailyForm.draw_kind,rune_id:String(rune?.['編號']||''),rune:dailyForm.rune,direction:dailyForm.direction,note:dailyForm.note.trim()};
    const current=daily?.daily_draws||[];
    const key=item=>[item.date,item.draw_kind,item.rune,item.direction].join('|');
    const map=new Map(current.map(item=>[key(item),item]));map.set(key(row),row);
    const nextRows=[...map.values()];
    const output=downloadDailyJson(daily||{daily_draws:[]},nextRows);
    setDaily(output);setDailyPage(1);setDailyForm(previous=>({...previous,note:''}));setDailyStatus('已更新目前畫面並下載 LOC8_DAILY_RUNE_REPO_HISTORY.json。正式資料仍以你手動上傳的 JSON 為準。');
  }

  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">LOC Statistics</p><h1>統計</h1><p>排行榜、符文統計、來源管理與每日符文集中於此。每個 tab 只載入自己的資料，不在進站時掃描其他 corpus。</p></header>
    <nav className="loc-tabs" aria-label="統計功能">{TABS.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>
    {error&&<div className="loc-status error">{error}</div>}
    {tab==='ranking'&&<div className="loc-grid two"><section className="loc-card"><p className="loc-eyebrow">Period Keywords</p><h2>跨時期關鍵字</h2>{latestPeriod?<><p>最新分析：{latestPeriod.period} · {latestPeriod.document_count?.toLocaleString()} 筆文件</p><div className="loc-ranking">{latestPeriod.keywords?.slice(0,15).map((x,i)=><div key={x.term}><b>{i+1}. {x.term}</b><span>{x.document_count} 篇 · {x.percent}%</span></div>)}</div></>:<p>載入中…</p>}</section><section className="loc-card"><p className="loc-eyebrow">Rune Keywords · No API</p><h2>符文關鍵詞</h2>{runes?<div className="loc-ranking">{keywordRanks.map(([term,n],i)=><div key={term}><b>{i+1}. {term}</b><span>{n} 次</span></div>)}</div>:<p>載入中…</p>}</section></div>}
    {tab==='runes'&&<section className="loc-card"><p className="loc-eyebrow">Rune Structure</p><h2>符文群組統計</h2>{runes?<><div className="loc-metrics"><div><small>資料符文</small><strong>{runes.length}</strong></div><div><small>1–64 基礎符文</small><strong>{runes.filter(r=>r['編號']>=1&&r['編號']<=64).length}</strong></div><div><small>特殊符文</small><strong>{runes.filter(r=>r['編號']>64).length}</strong></div></div><div className="loc-ranking">{groups.map(([g,n])=><div key={g}><b>{g}</b><span>{n}</span></div>)}</div></>:<p>載入中…</p>}</section>}
    {tab==='sources'&&<section className="loc-card"><p className="loc-eyebrow">Search Sources</p><h2>來源管理</h2>{sources?<><div className="loc-metrics"><div><small>可比對筆數</small><strong>{sources.search_summary.comparable_records.toLocaleString()}</strong></div><div><small>可比對字數</small><strong>{sources.search_summary.char_count.toLocaleString()}</strong></div><div><small>KM 文件</small><strong>{sources.knowledge_summary.knowledge_document_records}</strong></div></div><div className="loc-table-wrap"><table className="loc-table"><thead><tr><th>來源</th><th>可搜尋</th><th>字數</th><th>期間</th><th>狀態</th></tr></thead><tbody>{[...(sources.text_sources||[]),...(sources.media_sources||[])].map(x=><tr key={x.source}><td>{x.source}</td><td>{(x.searchable_records??x.public_url_records??x.records)?.toLocaleString?.()||x.records}</td><td>{x.char_count?.toLocaleString?.()||'—'}</td><td>{x.start_date}–{x.end_date}</td><td>{x.status}</td></tr>)}</tbody></table></div></>:<p>載入中…</p>}</section>}
    {tab==='daily'&&<div className="loc-grid two">
      <section className="loc-card"><p className="loc-eyebrow">Manual Record</p><h2>手動記錄實體牌</h2>{!daily||!runes?<p>載入每日紀錄與 runes.json…</p>:<form className="loc-record-form" onSubmit={saveDailyRecord}><label>日期<input type="date" value={dailyForm.date} onChange={e=>updateDailyForm('date',e.target.value)} required/></label><label>類型<select value={dailyForm.draw_kind} onChange={e=>updateDailyForm('draw_kind',e.target.value)}><option value="daily_draw">主抽</option><option value="daily_draw_supplement">補抽</option></select></label><label>符文<select value={dailyForm.rune} onChange={e=>updateDailyForm('rune',e.target.value)} required><option value="">選擇符文</option>{dailyRunes.map(item=><option key={item['編號']} value={item['符文名稱']}>{String(item['編號']).padStart(2,'0')} · {item['符文名稱']}</option>)}</select></label><label>方向<select value={dailyForm.direction} onChange={e=>updateDailyForm('direction',e.target.value)}><option>正位</option><option>半正位</option><option>半逆位</option><option>逆位</option></select></label><label className="wide">備註<input value={dailyForm.note} onChange={e=>updateDailyForm('note',e.target.value)} placeholder="可留空"/></label><button className="loc-button primary" type="submit">儲存並下載 JSON</button></form>}<p className="loc-status">{dailyStatus||'此功能只產生下載檔，不直接覆寫 Repository；你手動上傳後才成為正式資料。'}</p></section>
      <section className="loc-card"><p className="loc-eyebrow">Daily Rune History</p><h2>每日符文趨勢</h2>{daily?<><div className="loc-metrics"><div><small>紀錄數</small><strong>{draws.length}</strong></div><div><small>主抽</small><strong>{primary}</strong></div><div><small>補抽</small><strong>{draws.length-primary}</strong></div></div><div className="loc-history">{draws.slice((dailyPage-1)*DAILY_PAGE_SIZE,dailyPage*DAILY_PAGE_SIZE).map(x=><div key={x.id}><time>{x.date}</time><b>{x.rune}</b><span>{x.direction}</span><small>{x.draw_kind==='daily_draw'?'主抽':'補抽'}</small></div>)}</div>{draws.length>DAILY_PAGE_SIZE&&<div className="loc-pagination"><span>第 {dailyPage} / {dailyPages} 頁</span><div><button className="loc-button" disabled={dailyPage<=1} onClick={()=>setDailyPage(p=>p-1)}>上一頁</button><button className="loc-button" disabled={dailyPage>=dailyPages} onClick={()=>setDailyPage(p=>p+1)}>下一頁</button></div></div>}</>:<p>載入中…</p>}</section>
    </div>}
    {tab==='import'&&<section className="loc-card"><p className="loc-eyebrow">Import</p><h2>匯入</h2><p>匯入功能暫時不開放；保留功能位置，但不載入任何額外 runtime。</p></section>}
  </section>;
}
