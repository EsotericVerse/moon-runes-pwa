'use client';

import { useEffect, useMemo, useState } from 'react';
import { getLocalRecords } from '../local-db';
import { useLocalStore } from '../local-store';
import { INITIAL_MY_STYLE, INITIAL_STYLE_PROFILE, LIBRARY_RECORD_TYPE, MY_STYLE_STORAGE_KEY, STYLE_STORAGE_KEY } from '../model/style-profile';

const STYLE_NOTE = `政德風不是固定模板，而是從長期文字中觀察出的個人語言傾向。核心特徵包括感性與理性交錯、畫面意象、短句節奏、自省探究，以及對時間、身體感與治理邊界的重視。近年的表達更偏向克制、清楚、可回看與可治理。這些描述只作為作者公開參考，不作為任何使用者必須接受的分類標準。`;

const AUTHOR_PRINCIPLES = [
  ['校準','先確認位置、尺度、語意與脈絡，再辨認偏差。校準不是把所有東西修成同一個答案，而是讓每件事回到它真正應該描述的位置。'],
  ['治理','確認權責、界線、來源、版本與後續處置。需要保留的保留，需要修正的修正，需要分流的分流；歷史可以重新理解，但不為了現行版本抹除過去。']
];

const AUTHOR_LINES = [
  ['價值觀的價值','先問一套價值觀在目前情境究竟產生什麼價值，而不是只問它是否符合某個唯一正確答案。'],
  ['我允許錯誤發生，只要錯的有價值。','錯誤若能帶來辨識、學習、校準或下一次更好的選擇，就不是白白發生。'],
  ['免錢的最貴。','沒有價格不等於沒有交換；時間、注意力、人情、自由、資料、依賴都可能是成本。'],
  ['我不跟你走劇本。','先拆開別人預設的問題、選項與角色，再決定自己的位置與選擇。'],
  ['你在玩話術，我在改規則。','當問題反覆發生，真正需要處理的可能不是某一句話，而是讓那句話一直有效的規則與權責。'],
  ['慈悲不是投降。','理解他人與保留自己的界線可以同時存在。'],
  ['我不是要當王，我只要系統能跑。','治理的目的不是取得最高位置，而是讓結構能運作、能修正、能留下責任與歷史。'],
  ['治理過去的已知，是為了把時間還給現在的未知，才有更充裕的未來。','整理已知，是為了降低反覆消耗現在的成本，把時間還給還沒有答案的地方。']
];

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
      </div>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Author Reference</p>
      <h2>政德風公開說明</h2>
      <p>{STYLE_NOTE}</p>
      <p className="loc-core-line">政德風的治理方法 = 校準 + 治理</p>
      <div className="loc-grid two">
        {AUTHOR_PRINCIPLES.map(([title,copy])=><div className="loc-panel" key={title}><h2>{title}</h2><p>{copy}</p></div>)}
      </div>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Author Language</p>
      <h2>已確認的治理語句</h2>
      <div className="loc-link-list">
        {AUTHOR_LINES.map(([line,copy])=><div className="loc-link-card" key={line}><strong>{line}</strong><span>{copy}</span></div>)}
      </div>
      <aside className="loc-note"><small>Growth · Structure</small><p><strong>成長不是一直往上長，而是讓已形成的根、幹與枝各自有位置；該延展的延展，該修剪的修剪，讓成長變成能長久承載自己的結構。</strong></p></aside>
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
