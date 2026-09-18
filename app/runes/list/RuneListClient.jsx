'use client';

import {useEffect,useState} from 'react';
import {fetchLocJson,LOC_DATA} from '../../loc/data';

function groupNumber(number){
  const n=Number(number);
  return n<=64?Math.ceil(n/8):9;
}
function runeCardImage(card){
  const number=String(Number(card?.編號)||0).padStart(2,'0');
  const name=String(card?.符文名稱||'').replace(/之符文$/,'').trim();
  return `/assets/lunarunes/cards/${number}_${name}.png`;
}
function runeHref(card){
  const number=String(Number(card?.編號)||0).padStart(2,'0');
  const group=String(groupNumber(card?.編號)).padStart(2,'0');
  return `/list/${group}/${number}`;
}

export default function RuneListClient(){
  const [runes,setRunes]=useState([]);
  const [status,setStatus]=useState('loading');

  useEffect(()=>{
    let live=true;
    fetchLocJson(LOC_DATA.RUNES)
      .then(data=>{if(live){setRunes((Array.isArray(data)?data:[]).filter(row=>Number(row?.編號)>=1&&Number(row?.編號)<=66).sort((a,b)=>Number(a.編號)-Number(b.編號)));setStatus('ready');}})
      .catch(()=>live&&setStatus('error'));
    return()=>{live=false};
  },[]);

  if(status==='loading')return <p className="loc-status">載入符文圖鑑…</p>;
  if(status==='error')return <p className="loc-status error">符文圖鑑載入失敗。</p>;

  return <div className="loc-context-list">
    {runes.map(card=><a className="loc-context-item" href={runeHref(card)} key={card.編號}>
      <img className="loc-rune-card-image" src={runeCardImage(card)} alt={`${card.符文名稱}符文卡`}/>
      <strong>{String(Number(card.編號)).padStart(2,'0')} · {card.符文名稱}</strong>
      <span>{card.所屬分組} · {card.月相} · {card.卡片屬性}</span>
      <span>{card.符文說明}</span>
    </a>)}
  </div>;
}
