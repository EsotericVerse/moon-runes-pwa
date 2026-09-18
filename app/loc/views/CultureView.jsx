'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLocJson, fetchLocJsonBatch, LOC_DATA } from '../data';
import { useLocalStore } from '../local-store';

const TABS=[['overview','總覽'],['eras','時期設定'],['timeline','時間線'],['trend','時期風格'],['trajectory','軌跡']];
const UI_SETTINGS_KEY='loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS={draw_response:'ritual',list_page_size:10};
const LIST_PAGE_OPTIONS=[5,10,15,20,25,50];
function periodRows(value){if(!value||typeof value!=='object')return [];for(const key of ['periods','period_analysis','period_keyword_analysis','results'])if(Array.isArray(value[key]))return value[key];return [];}
function keywordsOf(row){return row?.normalized_top_keywords||row?.keywords||row?.semantic_keywords||row?.top_keywords||[];}
function drawableRows(value){return Array.isArray(value)?value.filter(row=>{const id=Number(row?.編號);return id>=1&&id<=66;}):[];}
function Pagination({page,total,pageSize,onChange}){const pages=Math.max(1,Math.ceil(total/pageSize));if(total<=pageSize)return null;return <div className="loc-pagination"><span>第 {page} / {pages} 頁 · 共 {total} 筆 · 每頁 {pageSize}</span><div><button className="loc-button" disabled={page<=1} onClick={()=>onChange(page-1)}>上一頁</button><button className="loc-button" disabled={page>=pages} onClick={()=>onChange(page+1)}>下一頁</button></div></div>}
function pageRows(rows,page,pageSize){return rows.slice((page-1)*pageSize,page*pageSize)}

export default function CultureView(){
  const {value:uiSettings}=useLocalStore(UI_SETTINGS_KEY,DEFAULT_UI_SETTINGS);
  const [tab,setTab]=useState('overview');
  const [eras,setEras]=useState(null);const [events,setEvents]=useState(null);const [loc3,setLoc3]=useState(null);const [loc6,setLoc6]=useState(null);const [runeHistory,setRuneHistory]=useState(null);const [coreHistory,setCoreHistory]=useState(null);const [runes,setRunes]=useState(null);const [error,setError]=useState('');
  const [pages,setPages]=useState({overview:1,eras:1,events:1,cases:1,core:1,loc3:1,loc6:1,governance:1,trajectory:1});
  const pageSize=LIST_PAGE_OPTIONS.includes(Number(uiSettings?.list_page_size))?Number(uiSettings.list_page_size):10;
  const setPage=(key,value)=>setPages(current=>({...current,[key]:value}));

  useEffect(()=>{let live=true;const load=(path,setter)=>fetchLocJson(path).then(data=>live&&setter(data)).catch(e=>live&&setError(e.message));setError('');
    if(tab==='overview'&&!eras)load(LOC_DATA.LOC_ERA_REGISTRY,setEras);
    if(tab==='eras'&&!eras)load(LOC_DATA.LOC_ERA_REGISTRY,setEras);
    if(tab==='timeline'){
      if(!events)load(LOC_DATA.EVENT_SNAPSHOT,setEvents);
      if(!runeHistory)load(LOC_DATA.LUNARUNE_CULTURE_HISTORY,setRuneHistory);
      if(!coreHistory||!runes)fetchLocJsonBatch([LOC_DATA.HISTORY,LOC_DATA.RUNES],{concurrency:2}).then(([historyRows,runeRows])=>{if(live){setCoreHistory(historyRows);setRunes(runeRows);}}).catch(e=>live&&setError(e.message));
    }
    if(tab==='trend'){
      if(!loc3||!loc6)fetchLocJsonBatch([LOC_DATA.MUSIC_PERIOD_KEYWORD_ANALYSIS,LOC_DATA.GOVERNANCE_PERIOD_KEYWORD_ANALYSIS],{concurrency:2}).then(([a,b])=>{if(live){setLoc3(a);setLoc6(b);}}).catch(e=>live&&setError(e.message));
      if(!runeHistory)load(LOC_DATA.LUNARUNE_CULTURE_HISTORY,setRuneHistory);
    }
    if(tab==='trajectory'){
      if(!loc6)load(LOC_DATA.GOVERNANCE_PERIOD_KEYWORD_ANALYSIS,setLoc6);
      if(!runeHistory)load(LOC_DATA.LUNARUNE_CULTURE_HISTORY,setRuneHistory);
    }
    return()=>{live=false};
  },[tab,eras,events,loc3,loc6,runeHistory,coreHistory,runes]);
  useEffect(()=>setPages({overview:1,eras:1,events:1,cases:1,core:1,loc3:1,loc6:1,governance:1,trajectory:1}),[pageSize]);

  const eraRows=useMemo(()=>[...(eras?.eras||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0)),[eras]);
  const currentEra=eraRows.find(item=>item.status==='current')||eraRows.at(-1);
  const eventRows=useMemo(()=>[...(events?.events||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))),[events]);
  const coreRows=useMemo(()=>drawableRows(coreHistory).sort((a,b)=>Number(a.編號)-Number(b.編號)),[coreHistory]);
  const runeRows=useMemo(()=>drawableRows(runes),[runes]);
  const completeRuneHistory=coreRows.filter(item=>String(item?.符文變化歷史||'').trim()&&String(item?.神話故事||'').trim()).length;
  const loc3Rows=periodRows(loc3);const loc6Rows=periodRows(loc6);const trajectories=loc6?.trajectories||[];
  const stages=runeHistory?.system_stages||[];const governance=runeHistory?.governance_culture||[];const semanticCases=runeHistory?.semantic_history_cases||[];

  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">Culture · 文化</p><h1><span className="loc-keyword-emphasis">文化</span></h1><p>文化由風格、時期、事件、價值與語意變化沿時間累積形成；此處整合 ERA、事件、時期風格、軌跡與 LunaRunes <span className="loc-keyword-emphasis">文化</span>觀察。</p></header>
    <nav className="loc-tabs" aria-label="文化功能">{TABS.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>
    {error&&<div className="loc-status error">{error}</div>}

    {tab==='overview'&&<>{!eras?<div className="loc-loading">載入文化時期總覽…</div>:<>
      <div className="loc-metrics"><div><small>時期總數</small><strong>{eraRows.length}</strong></div><div><small>目前時期</small><strong>{currentEra?.period||'—'}</strong></div><div><small>目前起點</small><strong>{currentEra?.start_date||'—'}</strong></div></div>
      <section className="loc-card"><p className="loc-eyebrow">Culture ERA · 文化時期</p><h2>現行時期</h2><div className="loc-timeline">{pageRows(eraRows,pages.overview,pageSize).map(item=><article key={item.era_id||item.period}><div><b>{item.display_label||`${item.period}｜${item.name||''}`}</b><span>{item.start_date||'—'} → {item.end_date||'現在'}</span></div><p>{item.description}</p></article>)}</div><Pagination page={pages.overview} total={eraRows.length} pageSize={pageSize} onChange={value=>setPage('overview',value)}/></section>
      <section className="loc-card"><p className="loc-eyebrow">LunaRunes Culture · 符文文化</p><h2>符文文化資料延後載入</h2><p>66 符逐枚歷程只在時間線頁籤下載；治理案例由治理資料提供，避免文化首頁預先讀取完整 history。</p></section>
    </>}</>}

    {tab==='eras'&&<>{!eras?<div className="loc-loading">載入時期設定…</div>:<>
      <section className="loc-card"><p className="loc-eyebrow">ERA Governance · 時期治理</p><h2>文化時期設定</h2><p>時期是文化形成與語意變化的時間維度。LOC 的公開時期名稱與時間邊界由 <code>LOC_ERA_REGISTRY</code> 統一治理；搜尋、脈絡、Graph 與 corpus builder 僅引用這份設定。</p>{eras?.authority?.note&&<p className="loc-note">{eras.authority.note}</p>}</section>
      <div className="loc-context-list">{pageRows(eraRows,pages.eras,pageSize).map(item=><article className="loc-context-item" key={item.era_id||item.period}><div className="loc-result-meta"><span>{item.period}</span><span>{item.status||'historical'}</span></div><h3>{item.display_label||item.name}</h3><p>{item.start_date||'—'} → {item.end_date||'現在'}</p><p>{item.description}</p></article>)}</div><Pagination page={pages.eras} total={eraRows.length} pageSize={pageSize} onChange={value=>setPage('eras',value)}/>
    </>}</>}

    {tab==='timeline'&&<>{!runeHistory||!coreHistory||!runes?<div className="loc-loading">載入完整符文文化…</div>:<div className="loc-metrics"><div><small>現行可抽符文</small><strong>{runeRows.length}/66</strong></div><div><small>逐符歷程完整</small><strong>{completeRuneHistory}/66</strong></div><div><small>治理案例</small><strong>{semanticCases.length}</strong></div></div>}
      <div className="loc-grid two">
      <section className="loc-card"><p className="loc-eyebrow">LOC Timeline · 月典時間線</p><h2>已發生事件</h2>{!events?<p>載入事件…</p>:<><div className="loc-context-list">{pageRows(eventRows,pages.events,pageSize).map(item=><article className="loc-context-item" key={item.id}><div className="loc-result-meta"><time>{item.date}</time><span>{item.event_type||item.status}</span></div><h3>{item.title}</h3><p>{item.description}</p>{item.state_after&&<p><strong>State →</strong> {item.state_after}</p>}</article>)}</div><Pagination page={pages.events} total={eventRows.length} pageSize={pageSize} onChange={value=>setPage('events',value)}/></>}</section>
      <section className="loc-card"><p className="loc-eyebrow">LunaRunes Timeline · 月之符文時間線</p><h2>語意與治理<span className="loc-keyword-emphasis">演化</span></h2>{!runeHistory?<p>載入符文演化…</p>:<><div className="loc-context-list">{pageRows(semanticCases,pages.cases,pageSize).map(item=><article className="loc-context-item" key={item.order}><div className="loc-result-meta"><span>{item.kind}</span><span>#{item.order}</span></div><h3>{item.title}</h3><p>{item.after}</p><small>{item.note}</small></article>)}</div><Pagination page={pages.cases} total={semanticCases.length} pageSize={pageSize} onChange={value=>setPage('cases',value)}/></>}</section>
      </div>
      <section className="loc-card"><p className="loc-eyebrow">LunaRunes 66 · 月之符文 66</p><h2>逐符<span className="loc-keyword-emphasis">演化</span>歷程</h2>{!coreHistory?<p>載入 66 符歷程…</p>:<><div className="loc-context-list">{pageRows(coreRows,pages.core,pageSize).map(item=><article className="loc-context-item" key={item.編號}><div className="loc-result-meta"><span>#{String(item.編號).padStart(2,'0')}</span><span>{item.名稱}</span></div><h3>{item.名稱}之符文</h3><p><strong>演化：</strong>{item.符文變化歷史}</p><p><strong>神話：</strong>{item.神話故事}</p></article>)}</div><Pagination page={pages.core} total={coreRows.length} pageSize={pageSize} onChange={value=>setPage('core',value)}/></>}</section>
    </>}

    {tab==='trend'&&<>{!loc3||!loc6||!runeHistory?<div className="loc-loading">載入時期分析…</div>:<>
      <div className="loc-grid two"><section className="loc-card"><p className="loc-eyebrow">Music · 音樂</p><h2>音樂時期風格</h2><div className="loc-context-list">{pageRows(loc3Rows,pages.loc3,pageSize).map((row,index)=><article className="loc-context-item" key={`${row.period||index}-loc3`}><h3>{row.period||row.canonical_period||`切片 ${index+1}`}</h3><div className="loc-chip-list">{keywordsOf(row).slice(0,12).map((item,i)=><span key={`${item.term||item.keyword||i}`}>{item.term||item.keyword} {item.percent!=null?`${item.percent}%`:''}</span>)}</div></article>)}</div><Pagination page={pages.loc3} total={loc3Rows.length} pageSize={pageSize} onChange={value=>setPage('loc3',value)}/></section>
      <section className="loc-card"><p className="loc-eyebrow">Text / Governance · 文字／治理</p><h2>文字／治理時期風格</h2><div className="loc-context-list">{pageRows(loc6Rows,pages.loc6,pageSize).map((row,index)=><article className="loc-context-item" key={`${row.period||index}-loc6`}><h3>{row.period||row.canonical_period||`切片 ${index+1}`}</h3><div className="loc-chip-list">{keywordsOf(row).slice(0,12).map((item,i)=><span key={`${item.term||item.keyword||i}`}>{item.term||item.keyword} {item.percent!=null?`${item.percent}%`:''}</span>)}</div></article>)}</div><Pagination page={pages.loc6} total={loc6Rows.length} pageSize={pageSize} onChange={value=>setPage('loc6',value)}/></section></div>
      <section className="loc-card"><p className="loc-eyebrow">Rune Governance Trend · 符文治理趨勢</p><h2>符文系統／治理趨勢</h2><div className="loc-context-list">{pageRows(governance,pages.governance,pageSize).map(item=><article className="loc-context-item" key={item.order}><h3>{item.order}. {item.title}</h3><p><strong>Before：</strong>{item.before}</p><p><strong>After：</strong>{item.after}</p><p>{item.effect}</p></article>)}</div><Pagination page={pages.governance} total={governance.length} pageSize={pageSize} onChange={value=>setPage('governance',value)}/></section>
    </>}</>}

    {tab==='trajectory'&&<>{!loc6||!runeHistory?<div className="loc-loading">載入軌跡…</div>:<div className="loc-grid two">
      <section className="loc-card"><p className="loc-eyebrow">Language Trajectory · 語言軌跡</p><h2>語彙軌跡</h2>{trajectories.length?<><div className="loc-context-list">{pageRows(trajectories,pages.trajectory,pageSize).map(item=><div className="loc-trajectory" key={item.term}><h3>{item.term}</h3><p>峰值 {item.peak_period} · {item.peak_percent}%</p><div>{item.points?.map(point=><span key={`${item.term}-${point.period}`}>{point.period}<b>{point.percent}%</b></span>)}</div></div>)}</div><Pagination page={pages.trajectory} total={trajectories.length} pageSize={pageSize} onChange={value=>setPage('trajectory',value)}/></>:<p>目前 registry 尚無 trajectory。</p>}</section>
      <section className="loc-card"><p className="loc-eyebrow">LunaRunes Trajectory · 月之符文軌跡</p><h2>14 → 24 → 32 → 42 → 66</h2><div className="loc-stage-line vertical">{stages.map(item=><div key={item.order}><strong>{item.label}</strong><span>{item.rune_count} 符</span><small>{item.note}</small></div>)}</div><p className="loc-note">符文歷史只顯示<span className="loc-keyword-emphasis">演化</span>紀錄；現行正式定義仍以 canonical runes.json 為準。第 0 符「德」保留於母資料作治理錨點，不列入 66 枚可抽符文。</p></section>
    </div>}</>}
  </section>;
}
