'use client';

import {useEffect,useMemo,useState} from 'react';
import {fetchLocJson,LOC_DATA} from '../data';

const ORDER=['single','daily','dual','triple','five','ow3gs'];

function spreadTitle(spread,key){
  return spread?.label||({single:'單卡',daily:'每日',dual:'雙卡',triple:'三卡',five:'五卡',ow3gs:'OW3gs'}[key]||key);
}
function positionText(spread){
  const rows=Array.isArray(spread?.positions)?spread.positions:[];
  return rows.map(item=>item.label).join(' → ');
}

export default function RuneAlgorithmView(){
  const [grammar,setGrammar]=useState(null);
  const [error,setError]=useState('');

  useEffect(()=>{
    let alive=true;
    fetchLocJson(LOC_DATA.RUNE_GRAMMAR)
      .then(data=>alive&&setGrammar(data))
      .catch(err=>alive&&setError(err.message));
    return()=>{alive=false};
  },[]);

  const spreads=useMemo(()=>ORDER.map(key=>[key,grammar?.spreads?.[key]]).filter(([,spread])=>spread),[grammar]);

  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">LunaRunes · Algorithm</p>
      <h1>符文演算法</h1>
      <p className="loc-subtitle">本頁直接由 Current Rune Grammar 產生，牌位、組合與 OW3gs 核心規則不另外手寫第二份。</p>
    </header>

    <section className="loc-card">
      <p className="loc-eyebrow">Principle</p>
      <h2>演算法概念</h2>
      <p>{grammar?.global?.layering||'符文本義、牌位、治理與時間修飾依序組合。'}</p>
      <p>{grammar?.global?.composition_rule||'多卡先依結構組合，再形成完整情境。'}</p>
      <p>{grammar?.global?.moon_phase_rule||'月相只作低程度時間修飾，不覆蓋符文本義與牌位結構。'}</p>
    </section>

    {error?<p className="loc-status error">Grammar 載入失敗：{error}</p>:null}
    {!grammar&&!error?<p className="loc-status">載入 Current Rune Grammar…</p>:null}

    <div className="loc-context-list">
      {spreads.map(([key,spread])=><article className="loc-card" key={key}>
        <div className="loc-result-meta"><span>{spreadTitle(spread,key)}</span><span>{spread.count} 張</span></div>
        <h2>{positionText(spread)||spread.structure||spreadTitle(spread,key)}</h2>
        {spread.structure?<p><strong>結構：</strong>{spread.structure}</p>:null}
        {spread.composition?<p><strong>組合：</strong>{spread.composition}</p>:null}
        {spread.reading_rule?<p><strong>閱讀規則：</strong>{spread.reading_rule}</p>:null}
        {Array.isArray(spread.layers)?<div className="loc-context-list">{spread.layers.map(layer=><div className="loc-context-item" key={layer.range||layer.id}><strong>{layer.range} · {layer.label}</strong><span>{layer.role}</span></div>)}</div>:null}
      </article>)}
    </div>

    <section className="loc-card">
      <p className="loc-eyebrow">Routes</p>
      <h2>直接使用</h2>
      <div className="loc-actions">
        <a className="loc-button" href="/duel/one">單卡</a>
        <a className="loc-button" href="/duel/daily">每日</a>
        <a className="loc-button" href="/duel/two">雙卡</a>
        <a className="loc-button" href="/duel/three">三卡</a>
        <a className="loc-button" href="/duel/five">五卡</a>
        <a className="loc-button" href="/duel/ow3gs">OW3gs</a>
      </div>
    </section>
  </section></main>;
}
