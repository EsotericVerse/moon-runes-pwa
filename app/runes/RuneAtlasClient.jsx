'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLocJson, LOC_DATA } from '../loc/data';
import RuneAtlas from './RuneAtlas';

export default function RuneAtlasClient(){
  const [runes,setRunes]=useState([]);
  const [group,setGroup]=useState('');
  const [error,setError]=useState('');

  useEffect(()=>{
    let live=true;
    fetchLocJson(LOC_DATA.RUNES).then(rows=>{
      if(!live)return;
      const canonical=(Array.isArray(rows)?rows:[]).filter(row=>Number(row?.編號)>=1&&Number(row?.編號)<=66);
      if(canonical.length<66)throw new Error(`核心符文資料只有 ${canonical.length} 枚。`);
      setRunes(canonical);
      setError('');
    }).catch(err=>live&&setError(`符文圖鑑載入失敗：${err?.message||'未知錯誤'}`));
    return()=>{live=false};
  },[]);

  const groups=useMemo(()=>[...new Set(runes.map(row=>row?.所屬分組).filter(Boolean))],[runes]);

  return <main className="loc-next-main">
    <section className="loc-view">
      <header className="loc-hero" id="intro">
        <p className="loc-eyebrow">LunaRunes · 月之符文</p>
        <h1>月之符文</h1>
        <p>月之符文固定 66 枚。先從群組與符文圖鑑查看語彙、定義、方向與關聯；抽牌為獨立功能。</p>
      </header>
      {error?<section className="loc-card"><p className="loc-status error">{error}</p></section>:!runes.length?<section className="loc-card"><p className="loc-status">載入符文圖鑑中…</p></section>:<RuneAtlas runes={runes} groups={groups} group={group} setGroup={setGroup}/>} 
    </section>
  </main>;
}
