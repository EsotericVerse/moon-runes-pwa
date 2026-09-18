'use client';

import {useEffect,useMemo,useState} from 'react';
import {useSiteScope} from '../../SiteScopeProvider';
import {neonClient} from '../neon-client';

const PAGE_SIZE=20;

export default function StaticsView(){
  const {current,dataView}=useSiteScope();
  const view=dataView('rankings');
  const [rows,setRows]=useState([]);
  const [type,setType]=useState('');
  const [page,setPage]=useState(1);
  const [error,setError]=useState('');

  useEffect(()=>{
    let live=true;
    setRows([]);setError('');setPage(1);
    if(!view)return()=>{live=false};
    neonClient.from(view).select('*').order('rank_value',{ascending:false}).limit(1000)
      .then(({data,error})=>{
        if(!live)return;
        if(error)throw new Error(error.message||'Ranking read failed');
        setRows(data||[]);
      }).catch(e=>live&&setError(String(e?.message||e)));
    return()=>{live=false};
  },[view]);

  const types=useMemo(()=>[...new Set(rows.map(row=>row.ranking_type).filter(Boolean))],[rows]);
  useEffect(()=>{if(types.length&&!types.includes(type))setType(types[0]);},[types,type]);
  const filtered=useMemo(()=>rows.filter(row=>!type||row.ranking_type===type),[rows,type]);
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const shown=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Statistics</p>
      <h1>統計</h1>
      <p className="loc-subtitle">{current.label} Scope 的排行榜與統計；資料由各 Scope 自己的 Neon projection 提供。</p>
    </header>
    {!view?<p className="loc-status">此 Scope 尚未啟用統計 projection。</p>:null}
    {error?<p className="loc-status error">{error}</p>:null}
    {types.length?<nav className="loc-tabs" aria-label="排行榜類型">
      {types.map(item=><button key={item} className={item===type?'active':''} onClick={()=>{setType(item);setPage(1)}}>{item}</button>)}
    </nav>:null}
    <section className="loc-card">
      <p className="loc-eyebrow">{current.label}</p>
      <h2>排行榜</h2>
      <div className="loc-ranking">
        {shown.map((row,index)=><div key={row.ranking_key}>
          <b>{(page-1)*PAGE_SIZE+index+1}. {row.term}</b>
          <span>{row.scope_id?row.scope_id+' · ':''}{row.item_count} · {row.rank_value}</span>
        </div>)}
      </div>
      {!rows.length&&!error?<p>載入中…</p>:null}
      <div className="loc-pagination">
        <span>第 {page} / {pages} 頁 · 共 {filtered.length} 筆</span>
        <div><button className="loc-button" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>上一頁</button><button className="loc-button" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>下一頁</button></div>
      </div>
    </section>
  </section>;
}
