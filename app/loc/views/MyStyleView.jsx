'use client';

import { useEffect, useMemo, useState } from 'react';
import { getLocalRecords } from '../local-db';
import { useLocalStore } from '../local-store';
import { INITIAL_MY_STYLE, INITIAL_STYLE_PROFILE, LIBRARY_RECORD_TYPE, MY_STYLE_STORAGE_KEY, STYLE_STORAGE_KEY } from '../model/style-profile';

export default function MyStyleView(){
  const {value:profile}=useLocalStore(STYLE_STORAGE_KEY,INITIAL_STYLE_PROFILE);
  const {value:meta,setValue:setMeta}=useLocalStore(MY_STYLE_STORAGE_KEY,INITIAL_MY_STYLE);
  const [records,setRecords]=useState([]);

  useEffect(()=>{getLocalRecords(LIBRARY_RECORD_TYPE).then(setRecords)},[]);

  const stats=useMemo(()=>{
    const groupCounts=new Map();
    const keywordCounts=new Map();
    let classified=0;
    let fallback=0;
    for(const record of records){
      if(!record.classification)continue;
      classified+=1;
      if(record.classification.fallback)fallback+=1;
      for(const match of record.classification.matches||[]){
        if(match.id!==profile?.fallback?.id)groupCounts.set(match.name,(groupCounts.get(match.name)||0)+1);
        for(const hit of match.hits||[])keywordCounts.set(hit,(keywordCounts.get(hit)||0)+1);
      }
    }
    const groups=[...groupCounts.entries()].sort((a,b)=>b[1]-a[1]);
    const keywords=[...keywordCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,24);
    const totalHits=groups.reduce((sum,[,count])=>sum+count,0);
    return {classified,fallback,groups,keywords,totalHits};
  },[records,profile]);

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">My Style · Local Profile</p>
      <h1>{meta?.name||'我的風格'}</h1>
      <p>{meta?.description||'由本機 Library 的分類結果統計形成。'} 不另建語意資料庫；Library 是來源，群組設定是規則。</p>
    </header>

    <section className="loc-card">
      <div className="loc-record-form">
        <label>風格名稱<input value={meta?.name||''} onChange={e=>setMeta(current=>({...current,name:e.target.value}))}/></label>
        <label>說明<input value={meta?.description||''} onChange={e=>setMeta(current=>({...current,description:e.target.value}))}/></label>
      </div>
      <div className="loc-actions">
        <a className="loc-button primary" href="/library">打開 Library</a>
        <a className="loc-button" href="/style-groups">調整群組設定</a>
        <a className="loc-button" href="/docs/ZHENGDE_STYLE_PUBLIC_KM.md" target="_blank" rel="noreferrer">政德風公開 KM</a>
      </div>
    </section>

    <section className="loc-card">
      <div className="loc-metrics"><div><small>Library</small><strong>{records.length}</strong></div><div><small>已分類</small><strong>{stats.classified}</strong></div><div><small>Fallback</small><strong>{stats.fallback}</strong></div></div>
      {!records.length&&<p className="loc-status">先把文字存進 Library；有資料後這裡才會形成你的風格分布。</p>}
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Group Distribution</p>
      <h2>風格群組分布</h2>
      <div className="loc-style-bars">
        {stats.groups.map(([name,count])=>{
          const percent=stats.totalHits?Math.round(count/stats.totalHits*100):0;
          return <div key={name}><div><strong>{name}</strong><span>{count} · {percent}%</span></div><progress value={count} max={Math.max(stats.totalHits,1)}/></div>;
        })}
      </div>
      {!stats.groups.length&&<p className="loc-status">目前沒有非 fallback 的群組命中。</p>}
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Keyword Evidence</p>
      <h2>常見命中關鍵詞</h2>
      <div className="loc-chip-list">{stats.keywords.map(([term,count])=><span key={term}>{term} · {count}</span>)}</div>
      {!stats.keywords.length&&<p className="loc-status">尚無關鍵詞統計。</p>}
    </section>
  </section>;
}
