'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLocJson, LOC_DATA } from '../loc/data';

const split=value=>String(value||'').split(/[、,，]/).map(x=>x.trim()).filter(Boolean);

export default function RuneStatisticsView(){
  const [runes,setRunes]=useState(null);
  const [error,setError]=useState('');
  useEffect(()=>{let live=true;fetchLocJson(LOC_DATA.RUNES).then(data=>{if(live)setRunes((data||[]).filter(row=>Number(row?.編號)>=1&&Number(row?.編號)<=66));}).catch(e=>live&&setError(e.message));return()=>{live=false};},[]);
  const groups=useMemo(()=>{const out={};for(const rune of runes||[]){const group=rune['所屬分組']||'特殊';out[group]=(out[group]||0)+1;}return Object.entries(out);},[runes]);
  const keywordRanks=useMemo(()=>{const count=new Map();for(const rune of runes||[])for(const term of [...split(rune['正向關鍵詞']),...split(rune['反向關鍵詞'])])count.set(term,(count.get(term)||0)+1);return [...count.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-Hant'));},[runes]);
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">LunaRunes Statistics · 符文統計</p><h1>符文統計</h1><p>只統計月之符文 1–66 核心資料；不混入 LOC 其他 corpus、來源管理或跨時期排行榜。</p></header>
    {error&&<div className="loc-status error">{error}</div>}
    {!runes?<div className="loc-loading">載入正式符文資料…</div>:<div className="loc-grid two">
      <section className="loc-card"><p className="loc-eyebrow">Rune Structure</p><h2>符文群組統計</h2><div className="loc-metrics"><div><small>資料符文</small><strong>{runes.length}</strong></div><div><small>1–64 基礎符文</small><strong>{runes.filter(r=>Number(r['編號'])<=64).length}</strong></div><div><small>特殊符文</small><strong>{runes.filter(r=>Number(r['編號'])>64).length}</strong></div></div><div className="loc-ranking">{groups.map(([g,n])=><div key={g}><b>{g}</b><span>{n}</span></div>)}</div></section>
      <section className="loc-card"><p className="loc-eyebrow">Rune Keywords · No API</p><h2>符文關鍵詞排行</h2><div className="loc-ranking">{keywordRanks.map(([term,n],i)=><div key={term}><b>{i+1}. {term}</b><span>{n} 次</span></div>)}</div></section>
    </div>}
  </section>;
}
