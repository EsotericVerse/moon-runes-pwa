'use client';

import {useEffect,useMemo,useState} from 'react';
import {useSiteScope} from '../../SiteScopeProvider';
import {PageFrame,PagePager,PageStatus} from '../../PageComposition';
import {neonClient} from '../neon-client';

const PAGE_SIZE=20;

export default function StaticsView(){
  const {current,dataView,ready}=useSiteScope();
  const view=dataView('rankings');
  const [rows,setRows]=useState([]);
  const [type,setType]=useState('');
  const [page,setPage]=useState(1);
  const [error,setError]=useState('');

  useEffect(()=>{
    let live=true;
    setRows([]);setError('');setPage(1);
    if(!ready||!view)return()=>{live=false};
    neonClient.from(view).select('*').order('rank_value',{ascending:false}).limit(1000)
      .then(({data,error})=>{
        if(!live)return;
        if(error)throw new Error(error.message||'Ranking read failed');
        setRows(data||[]);
      }).catch(e=>live&&setError(String(e?.message||e)));
    return()=>{live=false};
  },[ready,view]);

  const types=useMemo(()=>[...new Set(rows.map(row=>row.ranking_type).filter(Boolean))],[rows]);
  useEffect(()=>{if(types.length&&!types.includes(type))setType(types[0]);},[types,type]);
  const filtered=useMemo(()=>rows.filter(row=>!type||row.ranking_type===type),[rows,type]);
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const shown=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  return <PageFrame
    eyebrow="Statistics"
    title="統計"
    subtitle={`${current.label} Scope 的排行榜與統計；資料由各 Scope 自己的 Neon projection 提供。`}
  >
    {!ready?<PageStatus>載入 Scope…</PageStatus>:!view?<PageStatus>此 Scope 尚未啟用統計 projection。</PageStatus>:null}
    <PageStatus error>{error}</PageStatus>
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
      {!rows.length&&!error&&ready&&view?<p>載入中…</p>:null}
      <PagePager page={page} pages={pages} total={filtered.length} onPrevious={()=>setPage(p=>p-1)} onNext={()=>setPage(p=>p+1)}/>
    </section>
  </PageFrame>;
}
