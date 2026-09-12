'use client';

import { useEffect, useState } from 'react';
import { fetchLocJson } from '../data';

export default function EvolutionView(){
  const [era,setEra]=useState(null);
  const [keywords,setKeywords]=useState(null);
  const [error,setError]=useState('');
  useEffect(()=>{let live=true;Promise.all([fetchLocJson('/data/json/registries/LOC_ERA_REGISTRY.json'),fetchLocJson('/data/json/registries/LOC6_PERIOD_KEYWORD_ANALYSIS.json')]).then(([e,k])=>{if(live){setEra(e);setKeywords(k);}}).catch(e=>live&&setError(e.message));return()=>{live=false};},[]);
  const eras=era?.eras||[];
  const trajectories=keywords?.trajectories||[];
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">LOC8 · Evolution</p><h1>推演</h1><p>ERA、Timeline、Trend 與 Trajectory 由同一套治理後 registry 驅動；只有進入推演時才載入時間序列。</p></header>
    {error&&<div className="loc-status error">{error}</div>}
    {!era?<div className="loc-loading">載入 ERA registry…</div>:<>
      <section className="loc-card"><p className="loc-eyebrow">Timeline</p><h2>ERA 時間軸</h2><div className="loc-timeline">{eras.map(item=><article key={item.era_id}><div><b>{item.display_label||`${item.period}｜${item.name}`}</b><span>{item.start_date} → {item.end_date||'現在'}</span></div><p>{item.description}</p></article>)}</div></section>
      <section className="loc-card"><p className="loc-eyebrow">Trajectory</p><h2>語彙軌跡</h2>{trajectories.length?<div className="loc-grid two">{trajectories.slice(0,12).map(item=><div className="loc-trajectory" key={item.term}><h3>{item.term}</h3><p>峰值 {item.peak_period} · {item.peak_percent}%</p><div>{item.points?.map(point=><span key={`${item.term}-${point.period}`} title={`${point.period}: ${point.percent}%`}>{point.period}<b>{point.percent}%</b></span>)}</div></div>)}</div>:<p>目前 registry 尚無 trajectory。</p>}</section>
    </>}
  </section>;
}
