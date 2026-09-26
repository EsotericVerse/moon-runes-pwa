'use client';

import {useEffect,useMemo,useState} from 'react';
import {fetchNeonData,LOC_DATA} from '../loc/data';
import {scopeHrefV2} from '../modular-v2/scope-registry.v2';

const RUNES_HOME=scopeHrefV2('lunarunes');

function runeCardImage(card){
  const number=String(Number(card?.編號)||0).padStart(2,'0');
  const name=String(card?.符文名稱||'').replace(/之符文$/,'').trim();
  return `/assets/lunarunes/cards/${number}_${name}.png`;
}

export const metadata={
  title:'所有符文列表｜月之符文｜LOC',
  description:'月之符文 1–66 完整列表。'
};

export default function RuneListPage(){
  const [runes,setRunes]=useState([]);
  const [error,setError]=useState('');
  useEffect(()=>{
    let live=true;
    fetchNeonData(LOC_DATA.RUNES,{memory:true})
      .then(rows=>{
        if(!live)return;
        setRunes((Array.isArray(rows)?rows:[]).filter(row=>Number(row?.編號)>=1&&Number(row?.編號)<=66));
      })
      .catch(reason=>{if(live)setError(reason?.message||'Neon canonical 讀取失敗');});
    return()=>{live=false};
  },[]);
  const canonicalRunes=useMemo(()=>[...runes].sort((a,b)=>Number(a.編號)-Number(b.編號)),[runes]);

  return <main className="loc-next-main">
    <section className="loc-view">
      <header className="loc-hero">
        <p className="loc-eyebrow">LunaRunes</p>
        <h1>所有符文列表</h1>
        <p className="loc-subtitle">依編號查看月之符文 1–66 的名稱、群組、月相、說明與關鍵詞。</p>
      </header>
      <nav className="loc-card" aria-label="月之符文功能入口">
        <a href={`${RUNES_HOME}#draw`}>抽牌</a> · <a href={`${RUNES_HOME}#library`}>符文圖鑑</a> · <strong>所有符文列表</strong>
      </nav>
      <section className="loc-card" id="rune-list">
        <p className="loc-eyebrow">Rune List</p>
        <h2>1–66</h2>
        {error?<p className="loc-error" role="alert">符文讀取失敗：{error}</p>:null}
        {!error&&!canonicalRunes.length?<p className="loc-note">正在從 Neon 讀取符文…</p>:null}
        <div className="loc-context-list">
          {canonicalRunes.map(card=><article className="loc-context-item" id={`rune-${card.編號}`} key={card.編號}>
            <img className="loc-rune-card-image" src={runeCardImage(card)} alt={`${card.符文名稱}符文卡`} />
            <strong>{String(Number(card.編號)).padStart(2,'0')} · {card.符文名稱} · {card.英文}</strong>
            <span>{card.所屬分組} · {card.月相} · {card.卡片屬性}</span>
            <span>{card.符文說明}</span>
            <span><b>正向關鍵詞：</b>{card.正向關鍵詞||'—'}</span>
            <span><b>反向關鍵詞：</b>{card.反向關鍵詞||'—'}</span>
          </article>)}
        </div>
      </section>
    </section>
  </main>;
}
