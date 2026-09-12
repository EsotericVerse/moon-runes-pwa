'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLocJson, fetchLocJsonBatch, LOC_DATA } from '../data';

const TABS=[['overview','總覽'],['timeline','時間線'],['trend','時期風格'],['trajectory','軌跡']];
function periodRows(value){if(!value||typeof value!=='object')return [];for(const key of ['periods','period_analysis','period_keyword_analysis','results'])if(Array.isArray(value[key]))return value[key];return [];}
function keywordsOf(row){return row?.normalized_top_keywords||row?.keywords||row?.semantic_keywords||row?.top_keywords||[];}

export default function EvolutionView(){
  const [tab,setTab]=useState('overview');
  const [eras,setEras]=useState(null);const [events,setEvents]=useState(null);const [loc3,setLoc3]=useState(null);const [loc6,setLoc6]=useState(null);const [runeHistory,setRuneHistory]=useState(null);const [error,setError]=useState('');

  useEffect(()=>{let live=true;const load=(path,setter)=>fetchLocJson(path).then(data=>live&&setter(data)).catch(e=>live&&setError(e.message));setError('');
    if(tab==='overview'&&!eras)load(LOC_DATA.LOC_ERA_REGISTRY,setEras);
    if(tab==='timeline'){
      if(!events)load(LOC_DATA.LOC8_EVENT_SNAPSHOT,setEvents);
      if(!runeHistory)load(LOC_DATA.LUNARUNE_EVOLUTION_HISTORY,setRuneHistory);
    }
    if(tab==='trend'){
      if(!loc3||!loc6)fetchLocJsonBatch([LOC_DATA.LOC3_PERIOD_KEYWORD_ANALYSIS,LOC_DATA.LOC6_PERIOD_KEYWORD_ANALYSIS],{concurrency:2}).then(([a,b])=>{if(live){setLoc3(a);setLoc6(b);}}).catch(e=>live&&setError(e.message));
      if(!runeHistory)load(LOC_DATA.LUNARUNE_EVOLUTION_HISTORY,setRuneHistory);
    }
    if(tab==='trajectory'){
      if(!loc6)load(LOC_DATA.LOC6_PERIOD_KEYWORD_ANALYSIS,setLoc6);
      if(!runeHistory)load(LOC_DATA.LUNARUNE_EVOLUTION_HISTORY,setRuneHistory);
    }
    return()=>{live=false};
  },[tab,eras,events,loc3,loc6,runeHistory]);

  const eraRows=useMemo(()=>[...(eras?.eras||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0)),[eras]);
  const currentEra=eraRows.find(item=>item.status==='current')||eraRows.at(-1);
  const eventRows=useMemo(()=>[...(events?.events||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))),[events]);
  const loc3Rows=periodRows(loc3);const loc6Rows=periodRows(loc6);const trajectories=loc6?.trajectories||[];
  const stages=runeHistory?.system_stages||[];const governance=runeHistory?.governance_evolution||[];const semanticCases=runeHistory?.semantic_history_cases||[];

  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">LOC8 · Evolution</p><h1>推演</h1><p>ERA、事件、時期風格、軌跡與 LunaRunes 演化依頁籤按需載入；總覽只讀取小型 ERA registry。</p></header>
    <nav className="loc-tabs" aria-label="推演功能">{TABS.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>
    {error&&<div className="loc-status error">{error}</div>}

    {tab==='overview'&&<>{!eras?<div className="loc-loading">載入時期總覽…</div>:<>
      <div className="loc-metrics"><div><small>時期總數</small><strong>{eraRows.length}</strong></div><div><small>目前時期</small><strong>{currentEra?.period||'—'}</strong></div><div><small>目前起點</small><strong>{currentEra?.start_date||'—'}</strong></div></div>
      <section className="loc-card"><p className="loc-eyebrow">ERA Timeline</p><h2>現行時期</h2><div className="loc-timeline">{eraRows.map(item=><article key={item.era_id||item.period}><div><b>{item.display_label||`${item.period}｜${item.name||''}`}</b><span>{item.start_date||'—'} → {item.end_date||'現在'}</span></div><p>{item.description}</p></article>)}</div></section>
      <section className="loc-card"><p className="loc-eyebrow">Deferred history</p><h2>符文演化資料延後載入</h2><p>完整 LunaRunes 歷程只在時間線、時期風格或軌跡頁籤需要時下載，避免進入推演首頁就讀取大型 history registry。</p></section>
    </>}</>}

    {tab==='timeline'&&<div className="loc-grid two">
      <section className="loc-card"><p className="loc-eyebrow">LOC Timeline</p><h2>已發生事件</h2>{!events?<p>載入事件…</p>:<div className="loc-context-list">{eventRows.slice(0,80).map(item=><article className="loc-context-item" key={item.id}><div className="loc-result-meta"><time>{item.date}</time><span>{item.event_type||item.status}</span></div><h3>{item.title}</h3><p>{item.description}</p>{item.state_after&&<p><strong>State →</strong> {item.state_after}</p>}</article>)}</div>}</section>
      <section className="loc-card"><p className="loc-eyebrow">LunaRunes Timeline</p><h2>語意與治理演化</h2>{!runeHistory?<p>載入符文演化…</p>:<div className="loc-context-list">{semanticCases.map(item=><article className="loc-context-item" key={item.order}><div className="loc-result-meta"><span>{item.kind}</span><span>#{item.order}</span></div><h3>{item.title}</h3><p>{item.after}</p><small>{item.note}</small></article>)}</div>}</section>
    </div>}

    {tab==='trend'&&<>{!loc3||!loc6||!runeHistory?<div className="loc-loading">載入時期分析…</div>:<>
      <div className="loc-grid two"><section className="loc-card"><p className="loc-eyebrow">LOC3</p><h2>音樂時期風格</h2><div className="loc-context-list">{loc3Rows.map((row,index)=><article className="loc-context-item" key={`${row.period||index}-loc3`}><h3>{row.period||row.canonical_period||`切片 ${index+1}`}</h3><div className="loc-chip-list">{keywordsOf(row).slice(0,12).map((item,i)=><span key={`${item.term||item.keyword||i}`}>{item.term||item.keyword} {item.percent!=null?`${item.percent}%`:''}</span>)}</div></article>)}</div></section>
      <section className="loc-card"><p className="loc-eyebrow">LOC6</p><h2>文字／治理時期風格</h2><div className="loc-context-list">{loc6Rows.map((row,index)=><article className="loc-context-item" key={`${row.period||index}-loc6`}><h3>{row.period||row.canonical_period||`切片 ${index+1}`}</h3><div className="loc-chip-list">{keywordsOf(row).slice(0,12).map((item,i)=><span key={`${item.term||item.keyword||i}`}>{item.term||item.keyword} {item.percent!=null?`${item.percent}%`:''}</span>)}</div></article>)}</div></section></div>
      <section className="loc-card"><p className="loc-eyebrow">Rune Governance Trend</p><h2>符文系統／治理趨勢</h2><div className="loc-context-list">{governance.map(item=><article className="loc-context-item" key={item.order}><h3>{item.order}. {item.title}</h3><p><strong>Before：</strong>{item.before}</p><p><strong>After：</strong>{item.after}</p><p>{item.effect}</p></article>)}</div></section>
    </>}</>}

    {tab==='trajectory'&&<>{!loc6||!runeHistory?<div className="loc-loading">載入軌跡…</div>:<div className="loc-grid two">
      <section className="loc-card"><p className="loc-eyebrow">Language Trajectory</p><h2>語彙軌跡</h2>{trajectories.length?<div className="loc-context-list">{trajectories.slice(0,24).map(item=><div className="loc-trajectory" key={item.term}><h3>{item.term}</h3><p>峰值 {item.peak_period} · {item.peak_percent}%</p><div>{item.points?.map(point=><span key={`${item.term}-${point.period}`}>{point.period}<b>{point.percent}%</b></span>)}</div></div>)}</div>:<p>目前 registry 尚無 trajectory。</p>}</section>
      <section className="loc-card"><p className="loc-eyebrow">LunaRunes Trajectory</p><h2>14 → 24 → 32 → 42 → 66</h2><div className="loc-stage-line vertical">{stages.map(item=><div key={item.order}><strong>{item.label}</strong><span>{item.rune_count} 符</span><small>{item.note}</small></div>)}</div><p className="loc-note">符文歷史只顯示演化紀錄；現行正式定義仍以 canonical runes.json 為準。</p></section>
    </div>}</>}
  </section>;
}
