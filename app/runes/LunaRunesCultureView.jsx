'use client';

import {useEffect,useMemo,useState} from 'react';
import {fetchLocJson,fetchLocJsonBatch,LOC_DATA} from '../loc/data';

const PAGE_SIZE=10;
const drawable=value=>Array.isArray(value)?value.filter(row=>{const id=Number(row?.編號);return id>=1&&id<=66}):[];

export default function LunaRunesCultureView(){
  const [tab,setTab]=useState('timeline');
  const [history,setHistory]=useState(null);
  const [coreHistory,setCoreHistory]=useState(null);
  const [runes,setRunes]=useState(null);
  const [error,setError]=useState('');
  const [page,setPage]=useState(1);
  useEffect(()=>{let live=true;setError('');if(!history)fetchLocJson(LOC_DATA.LUNARUNE_EVOLUTION_HISTORY).then(x=>live&&setHistory(x)).catch(e=>live&&setError(e.message));if(!coreHistory||!runes)fetchLocJsonBatch([LOC_DATA.HISTORY,LOC_DATA.RUNES],{concurrency:2}).then(([a,b])=>{if(live){setCoreHistory(a);setRunes(b)}}).catch(e=>live&&setError(e.message));return()=>{live=false}},[history,coreHistory,runes]);
  useEffect(()=>setPage(1),[tab]);

  const coreRows=useMemo(()=>drawable(coreHistory).sort((a,b)=>Number(a.編號)-Number(b.編號)),[coreHistory]);
  const runeRows=useMemo(()=>drawable(runes),[runes]);
  const semanticCases=history?.semantic_history_cases||[];
  const governance=history?.governance_evolution||[];
  const stages=history?.system_stages||[];
  const complete=coreRows.filter(x=>String(x?.符文變化歷史||'').trim()&&String(x?.神話故事||'').trim()).length;
  const rows=tab==='runes'?coreRows:tab==='governance'?governance:semanticCases;
  const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
  const shown=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">LunaRunes Scope · Culture</p><h1>文化</h1><p className="loc-subtitle">只觀察月之符文自己的語意演化、逐符歷程與治理變更；作者 ERA、歌曲與個人文化軌跡不在此 Scope 顯示。</p></header>
    <nav className="loc-tabs" aria-label="月之符文文化"><button className={tab==='timeline'?'active':''} onClick={()=>setTab('timeline')}>演化案例</button><button className={tab==='runes'?'active':''} onClick={()=>setTab('runes')}>逐符歷程</button><button className={tab==='governance'?'active':''} onClick={()=>setTab('governance')}>治理演化</button></nav>
    {error&&<div className="loc-status error">{error}</div>}
    {!history||!coreHistory||!runes?<div className="loc-loading">載入 LunaRunes 文化資料…</div>:<>
      <div className="loc-metrics"><div><small>現行可抽符文</small><strong>{runeRows.length}/66</strong></div><div><small>逐符歷程完整</small><strong>{complete}/66</strong></div><div><small>系統階段</small><strong>{stages.length}</strong></div></div>
      {tab==='timeline'&&<section className="loc-card"><p className="loc-eyebrow">Semantic History</p><h2>語意演化案例</h2><div className="loc-context-list">{shown.map(item=><article className="loc-context-item" key={item.order??item.title}><div className="loc-result-meta"><span>{item.kind}</span><span>#{item.order}</span></div><h3>{item.title}</h3><p>{item.after}</p>{item.note&&<small>{item.note}</small>}</article>)}</div></section>}
      {tab==='runes'&&<section className="loc-card"><p className="loc-eyebrow">LunaRunes 66</p><h2>逐符演化歷程</h2><div className="loc-context-list">{shown.map(item=><article className="loc-context-item" key={item.編號}><div className="loc-result-meta"><span>#{String(item.編號).padStart(2,'0')}</span><span>{item.名稱}</span></div><h3>{item.名稱}之符文</h3><p><strong>演化：</strong>{item.符文變化歷史}</p><p><strong>神話：</strong>{item.神話故事}</p></article>)}</div></section>}
      {tab==='governance'&&<section className="loc-card"><p className="loc-eyebrow">Rune Governance</p><h2>治理演化</h2><div className="loc-context-list">{shown.map(item=><article className="loc-context-item" key={item.order??item.title}><h3>{item.order}. {item.title}</h3><p><strong>Before：</strong>{item.before}</p><p><strong>After：</strong>{item.after}</p>{item.effect&&<p>{item.effect}</p>}</article>)}</div></section>}
      {rows.length>PAGE_SIZE&&<div className="runes-pager"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>上一頁</button><span>{page} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>下一頁</button></div>}
    </>}
  </section>;
}
