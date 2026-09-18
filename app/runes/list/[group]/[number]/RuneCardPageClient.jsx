'use client';

import {useEffect,useMemo,useState} from 'react';
import {fetchLocJson,LOC_DATA} from '../../../../loc/data';

function expectedGroup(number){
  const n=Number(number);
  return n<=64?Math.ceil(n/8):9;
}
function runeCardImage(card){
  const number=String(Number(card?.編號)||0).padStart(2,'0');
  const name=String(card?.符文名稱||'').replace(/之符文$/,'').trim();
  return `/assets/lunarunes/cards/${number}_${name}.png`;
}

export default function RuneCardPageClient({group,number}){
  const [runes,setRunes]=useState([]);
  const [status,setStatus]=useState('loading');
  const numeric=Number(number);
  const validGroup=Number(group)===expectedGroup(numeric);

  useEffect(()=>{
    let live=true;
    fetchLocJson(LOC_DATA.RUNES)
      .then(data=>{if(live){setRunes(Array.isArray(data)?data:[]);setStatus('ready');}})
      .catch(()=>live&&setStatus('error'));
    return()=>{live=false};
  },[]);

  const card=useMemo(()=>runes.find(row=>Number(row?.編號)===numeric),[runes,numeric]);
  if(!validGroup)return <p className="loc-status error">群組編號與符文總編號不一致。</p>;
  if(status==='loading')return <p className="loc-status">載入符文…</p>;
  if(status==='error'||!card)return <p className="loc-status error">找不到這張符文。</p>;

  return <section className="loc-view scope-home-composition">
    <header className="loc-hero">
      <p className="loc-eyebrow">LunaRunes · {group}/{number}</p>
      <h1>{card.符文名稱}</h1>
      <p className="loc-subtitle">{card.所屬分組} · {card.月相} · {card.卡片屬性}</p>
    </header>
    <section className="loc-card">
      <div className="home-rune-layout">
        <div className="home-rune-preview">
          <img src={runeCardImage(card)} alt={`${card.符文名稱}符文卡`}/>
        </div>
        <div className="home-rune-copy-plain">
          <p>{card.符文說明}</p>
          <p><strong>正向關鍵詞：</strong>{card.正向關鍵詞||'—'}</p>
          <p><strong>反向關鍵詞：</strong>{card.反向關鍵詞||'—'}</p>
        </div>
      </div>
    </section>
    <section className="loc-card">
      <p>可以到右上搜尋輸入框輸入關鍵字「{card.符文名稱}」，就可以看到更多！</p>
      <div className="loc-actions"><a className="loc-button" href="/list">回符文圖鑑</a></div>
    </section>
  </section>;
}
