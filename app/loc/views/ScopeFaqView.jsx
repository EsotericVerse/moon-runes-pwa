'use client';

import {useEffect,useMemo,useState} from 'react';
import {fetchLocJson, LOC_DATA} from '../data';

const LEGACY_PATTERN=/\bLOC[1-8]\b|LOC1[–-]8|Language Module Framework|語言系統模組框架|Symbolic Language Module|符號式語言模組/i;
const RUNE_PATTERN=/月之符文|LunaRunes|符文|抽牌|牌陣|OW3gs|月相|正位|逆位|玄|命|德/;

const OVERRIDES={
  'FAQ-001-A':'LOC／月典是一套模型化語言框架（Modelized Language Framework）。Current 架構以 Scope Model × Feature Model → Page Composition 組合資料範圍、可重用功能與頁面。',
  'FAQ-001':'LOC／月典是一套模型化語言框架（Modelized Language Framework）。Current 架構以 Scope Model × Feature Model → Page Composition 組合資料範圍、可重用功能與頁面。',
  'FAQ-002-A':'LOC／月典是模型化語言框架（Modelized Language Framework）；LunaRunes／月之符文是符號式語言（Symbolic Language）。兩者相關，但不是同一個 Scope，也不互相取代。',
  'FAQ-002':'LOC／月典是模型化語言框架（Modelized Language Framework）；LunaRunes／月之符文是符號式語言（Symbolic Language）。兩者相關，但不是同一個 Scope，也不互相取代。',
  'FAQ-091-A':'LOC／月典的 Current 正式身份是模型化語言框架（Modelized Language Framework）；LunaRunes／月之符文是符號式語言（Symbolic Language）。',
  'FAQ-092-A':'LOC 是模型化語言框架；LunaRunes 是符號式語言。公開實作與顧問、系統架構、治理設計及客製化實作可以分開討論。',
  'FAQ-010-A':'抽牌依問題複雜度選擇：單卡看核心；雙卡是因→果；三卡是源→轉→合；五卡是兩張過去成因＋一個意外變化＋兩張現在狀況；OW3gs 以前六張建立源／轉／合情境，第7–11張作核心五卡治理／建議判定。',
  'FAQ-010':'抽牌依問題複雜度選擇：單卡看核心；雙卡是因→果；三卡是源→轉→合；五卡是兩張過去成因＋一個意外變化＋兩張現在狀況；OW3gs 以前六張建立源／轉／合情境，第7–11張作核心五卡治理／建議判定。'
};

function entriesOf(data){
  if(Array.isArray(data?.faq))return data.faq;
  if(Array.isArray(data?.entries))return data.entries;
  return [];
}
function textOf(item){
  return [item.category,item.intent,item.question,item.answer,...(item.aliases||[]),...(item.keywords||[])].join(' ');
}
function isLegacy(item){
  const answer=OVERRIDES[item.id]||item.answer||'';
  return LEGACY_PATTERN.test([item.category,item.intent,item.question,answer,...(item.aliases||[]),...(item.keywords||[])].join(' '));
}
function belongsToRunes(item){return RUNE_PATTERN.test(textOf(item));}

export default function ScopeFaqView({scope='loc'}){
  const [data,setData]=useState(null);
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');

  useEffect(()=>{let alive=true;fetchLocJson(LOC_DATA.LOC_FAQ).then(value=>alive&&setData(value)).catch(err=>alive&&setError(err.message));return()=>{alive=false};},[]);

  const rows=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return entriesOf(data)
      .map(item=>({...item,answer:OVERRIDES[item.id]||item.answer}))
      .filter(item=>!isLegacy(item))
      .filter(item=>scope==='runes'?belongsToRunes(item):!belongsToRunes(item)||['FAQ-001','FAQ-001-A','FAQ-002','FAQ-002-A','FAQ-091-A','FAQ-092-A'].includes(item.id))
      .filter(item=>!q||textOf(item).toLowerCase().includes(q));
  },[data,query,scope]);

  const title=scope==='runes'?'月之符文 FAQ':'LOC FAQ';
  const subtitle=scope==='runes'
    ?'月之符文、抽牌、Grammar、符文方向與使用方式的常見問題。'
    :'月典定位、Scope、治理、搜尋、文化與使用方式的常見問題。';

  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">FAQ</p><h1>{title}</h1><p className="loc-subtitle">{subtitle}</p></header>
    <section className="loc-card">
      <label className="loc-search-form"><span>搜尋 FAQ</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="輸入問題或關鍵字"/></label>
      <p className="loc-note">FAQ 是 Current projection；歷史編號分類與舊正式名稱不在公開 FAQ 顯示。</p>
    </section>
    {error?<p className="loc-status error">FAQ 載入失敗：{error}</p>:null}
    {!data&&!error?<p className="loc-status">載入 FAQ…</p>:null}
    <div className="loc-context-list">
      {rows.map(item=><article className="loc-card" key={item.id}>
        <div className="loc-result-meta"><span>{item.category||'FAQ'}</span><span>{item.id}</span></div>
        <h2>{item.question}</h2>
        <p>{item.answer}</p>
      </article>)}
    </div>
    {data&&!rows.length?<p className="loc-status">沒有符合的 FAQ。</p>:null}
  </section></main>;
}
