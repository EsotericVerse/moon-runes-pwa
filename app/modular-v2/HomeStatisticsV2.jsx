'use client';

import {useEffect,useMemo,useState} from 'react';
import {neonPublicClient} from '../loc/neon-client';

async function readSummary(table,id){
  const {data,error}=await neonPublicClient.schema('silver').from(table)
    .select('id,work_count,media_count,media_counts,updated_at')
    .eq('id',id)
    .limit(1);
  if(error)throw new Error(error.message||'首頁統計讀取失敗');
  return data?.[0]||null;
}

export default function HomeStatisticsV2(){
  const [rows,setRows]=useState([]);
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    Promise.all([
      readSummary('lo3rwang','lo3rwang'),
      readSummary('lrunes','lrunes')
    ]).then(data=>{if(active){setRows(data.filter(Boolean));setError('')}})
      .catch(reason=>active&&setError(String(reason?.message||reason||'首頁統計讀取失敗。')));
    return()=>{active=false};
  },[]);
  const summary=useMemo(()=>{
    const mediaCounts={};
    let works=0,media=0;
    for(const row of rows){
      works+=Number(row.work_count)||0;
      media+=Number(row.media_count)||0;
      const counts=row.media_counts&&typeof row.media_counts==='object'&&!Array.isArray(row.media_counts)?row.media_counts:{};
      for(const [name,count] of Object.entries(counts))mediaCounts[name]=(mediaCounts[name]||0)+(Number(count)||0);
    }
    return {works,media,mediaCounts};
  },[rows]);
  if(error)return <section className="loc-card home-copy-block"><p className="scope-v2-status scope-v2-error">{error}</p></section>;
  return <section className="loc-card home-copy-block">
    <div className="home-section-heading"><p className="loc-eyebrow">Current Data</p><h2>資料統計</h2><p className="loc-subtitle">直接讀取目前彙整值，不掃描作品與多媒體明細。</p></div>
    <div className="scope-v2-metrics">
      <div><small>文字作品</small><strong>{summary.works.toLocaleString()}</strong></div>
      <div><small>多媒體</small><strong>{summary.media.toLocaleString()}</strong></div>
      {Object.entries(summary.mediaCounts).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([name,count])=><div key={name}><small>{name}</small><strong>{Number(count).toLocaleString()}</strong></div>)}
    </div>
  </section>;
}
