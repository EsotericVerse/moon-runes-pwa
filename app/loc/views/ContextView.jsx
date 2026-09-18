'use client';

import {useEffect,useState} from 'react';
import {useSiteScope} from '../../SiteScopeProvider';
import {PageFrame,PagePager,PageStatus} from '../../PageComposition';
import {neonClient} from '../neon-client';

const PAGE_SIZE=20;

export default function ContextView(){
  const {current,dataView,ready}=useSiteScope();
  const view=dataView('context');
  const [rows,setRows]=useState([]);
  const [page,setPage]=useState(1);
  const [error,setError]=useState('');

  useEffect(()=>{
    let live=true;
    setRows([]);setError('');setPage(1);
    if(!ready||!view)return()=>{live=false};
    neonClient.from(view).select('*').order('updated_at',{ascending:false}).limit(1000)
      .then(({data,error})=>{
        if(!live)return;
        if(error)throw new Error(error.message||'Context read failed');
        setRows(data||[]);
      }).catch(e=>live&&setError(String(e?.message||e)));
    return()=>{live=false};
  },[ready,view]);

  const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
  const shown=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  return <PageFrame
    eyebrow="Context"
    title="脈絡"
    subtitle={`${current.label} Scope 的脈絡資料；同一個功能模組依 registry 自動切換資料來源。`}
  >
    {!ready?<PageStatus>載入 Scope…</PageStatus>:!view?<PageStatus>此 Scope 尚未啟用脈絡 projection。</PageStatus>:null}
    <PageStatus error>{error}</PageStatus>
    <div className="loc-context-list">
      {shown.map(row=><article className="loc-context-item" key={row.context_key}>
        <div className="loc-result-meta"><span>{row.scope_id||current.id}</span><span>{row.context_type}</span></div>
        <h3>{row.title}</h3>
        {row.summary?<p>{row.summary}</p>:null}
      </article>)}
    </div>
    {!rows.length&&!error&&ready&&view?<PageStatus>載入中…</PageStatus>:null}
    <PagePager page={page} pages={pages} total={rows.length} onPrevious={()=>setPage(p=>p-1)} onNext={()=>setPage(p=>p+1)}/>
  </PageFrame>;
}
