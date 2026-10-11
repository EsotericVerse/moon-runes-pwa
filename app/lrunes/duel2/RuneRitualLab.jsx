'use client';

import {useEffect,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {realMoonPhase} from '../../loc/model/moon-phase';
import {randomIndex,loadDrawCards,buildFixedReading} from '../RuneDrawClient';
import {runeImage} from '../rune-directory.mjs';
import '../skin-lab.css';
import '../three/rune-world.css';

const RuneWorld=dynamic(()=>import('../three/RuneWorld'),{ssr:false,loading:()=> <p className="rune-world-loading">月光正在凝聚……</p>});
const MAX_DRAW=11;
const REVEAL_MS=1000;
const DIRECTIONS=['正位','半正位','半逆位','逆位'];
const SHORT_TEXT_TYPES=['direction','sit_q','sit_a','lots'];
function realText(card,type,directionIndex){
  return String(card?.rune_etc?.[type]?.[directionIndex+1]||'').trim();
}
function shortRuneName(card){
  return String(card?.rune_name||'').replace(/之符文$/,'').trim();
}
function officialReading(items){
  if(!items.length)throw new Error('尚未抽取任何符文。');
  const cards=items.map(item=>item.card);
  const directions=items.map(item=>item.direction);
  const count=items.length;
  const mode=count===1?'single':count===11?'ow3gs':count+'card';
  const sentence=count===1?realText(cards[0],'sit_q',items[0].directionIndex)+'。':
    buildFixedReading(cards,directions,mode).sentence;
  if(!sentence||sentence==='。'||sentence.includes('資訊不足'))
    throw new Error('組合籤詩內容不完整，請重試。');
  return sentence;
}
function lotSections(card,index){
  const source=realText(card,'lots',index);
  const labels=['愛情','事業','關係','健康'];
  return labels.map((label,i)=>{
    const begin=source.indexOf(label+'：');
    if(begin<0)return {label,text:''};
    const start=begin+label.length+1;
    const following=labels.slice(i+1).map(next=>source.indexOf(next+'：',start)).filter(x=>x>=0);
    const end=following.length?Math.min(...following):source.length;
    return {label,text:source.slice(start,end).trim().replace(/[。；\s]+$/,'')};
  }).filter(item=>item.text);
}
function RuneDrawCardDialog({item,card,loading,error,onClose}){
  useEffect(()=>{
    const close=e=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',close);
    return()=>window.removeEventListener('keydown',close);
  },[onClose]);
  const fields=card?[
    ['位向說明',realText(card,'direction',item.directionIndex)],
    ['狀況形容',realText(card,'sit_q',item.directionIndex)],
    ['狀況表達',realText(card,'sit_a',item.directionIndex)]
  ]:[];
  return <div className="rune-3d-modal-backdrop" role="presentation" onClick={onClose}>
    <section className="rune-3d-modal" role="dialog" aria-modal="true"
      aria-label={shortRuneName(item.card)+'符文單卡說明'} onClick={e=>e.stopPropagation()}>
      <div className="rune-3d-modal-head">
        <div><span className="loc-eyebrow">RUNE READING · 單卡內容</span>
          <h2>{shortRuneName(item.card)}之符文 · {item.direction}</h2></div>
        <button className="rune-skin-btn" type="button" autoFocus onClick={onClose}>× 關閉</button>
      </div>
      {loading?<p className="rune-3d-dialog-status">讀取單卡內容中……</p>:null}
      {error?<p className="rune-skin-error" role="alert">{error}</p>:null}
      {card?<div className="rune-3d-modal-main">
        <img src={runeImage(card)} alt={shortRuneName(card)+'原始符文卡'}/>
        <div className="rune-3d-modal-details">
          <div><h3>位向與月相</h3>
            <p>{item.direction} · 真實月相 {item.moon} · 卡片月相 {['','新月','上弦','滿月','下弦'][Number(card.moon_phase)]||'無'}</p></div>
          {fields.filter(([,value])=>value).map(([label,value])=>
            <div key={label}><h3>{label}</h3><p>{value}</p></div>)}
          {lotSections(card,item.directionIndex).map(({label,text})=>
            <div key={label}><h3>{label}</h3><p>{text}</p></div>)}
        </div>
      </div>:null}
    </section>
  </div>;
}
const pause=milliseconds=>new Promise(done=>setTimeout(done,milliseconds));
export default function RuneRitualLab(){
  const [items,setItems]=useState([]);
  const [busy,setBusy]=useState(false);
  const [finished,setFinished]=useState(false);
  const [reading,setReading]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('月光已就位，輕觸畫面召喚一枚符文');
  const cardsRef=useRef([]);
  const locked=useRef(false);
  const mounted=useRef(true);
  const [moon,setMoon]=useState(()=>realMoonPhase());
  const [selected,setSelected]=useState(null);
  const [detail,setDetail]=useState(null);
  const [detailBusy,setDetailBusy]=useState(false);
  const [detailError,setDetailError]=useState('');
  const detailCache=useRef(new Map());
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  async function drawOne(){
    if(locked.current||finished||selected||cardsRef.current.length>=MAX_DRAW)return;
    locked.current=true;
    setBusy(true);setError('');setMessage('月光正在引導下一枚符文……');
    const started=Date.now();
    const currentMoon=realMoonPhase();setMoon(currentMoon);
    if(currentMoon==='未知'){
      setError('真實月相無法辨識，無法查詢籤詩。');setBusy(false);locked.current=false;return;
    }
    const used=new Set(cardsRef.current.map(x=>Number(x.card.rune_id)));
    const remaining=Array.from({length:66},(_,i)=>i+1).filter(id=>!used.has(id));
    const runeNumber=remaining[randomIndex(remaining.length)];
    const directionIndex=randomIndex(4);
    try{
      const first=cardsRef.current.length===0;
      const cards=await loadDrawCards([{runeNumber,dir:directionIndex+1}],{
        staticTypes:first?['direction','lots']:[],
        moonTypes:first?['sit_q','sit_a']:['sit_q'],
        currentMoon
      });
      const card=cards.find(x=>Number(x.rune_id)===runeNumber);
      if(!card||!realText(card,'sit_q',directionIndex))throw Error('抽中的符文籤詩無法讀取');
      if(first)detailCache.current.set(runeNumber,card);
      await pause(Math.max(0,REVEAL_MS-(Date.now()-started)));
      if(!mounted.current)return;
      const next=[...cardsRef.current,{
        card,direction:DIRECTIONS[directionIndex],directionIndex,moon:currentMoon,birth:Date.now()
      }];
      cardsRef.current=next;setItems(next);
      setMessage(next.length>=MAX_DRAW?'星環已達十一枚，請結束抽牌。':'符文已亮相，點符文查看單卡說明，或繼續召喚。');
    }catch(e){
      if(mounted.current){setError('抽牌失敗：'+String(e?.message||e));setMessage('觸碰畫面重試');}
    }finally{
      locked.current=false;
      if(mounted.current)setBusy(false);
    }
  }
  async function showCard(card){
    const item=cardsRef.current.find(x=>Number(x.card.rune_id)===Number(card.rune_id));
    if(!item)return;
    setSelected(item);setDetailError('');
    const cached=detailCache.current.get(Number(card.rune_id));
    if(cached){setDetail(cached);setDetailBusy(false);return;}
    setDetail(null);setDetailBusy(true);
    try{
      const cards=await loadDrawCards([{runeNumber:Number(card.rune_id),dir:item.directionIndex+1}],{
        staticTypes:['direction','lots'],moonTypes:['sit_q','sit_a'],currentMoon:item.moon
      });
      if(!cards[0])throw new Error('找不到單卡內容');
      detailCache.current.set(Number(card.rune_id),cards[0]);
      if(mounted.current){setDetail(cards[0]);setDetailError('');}
    }catch(e){if(mounted.current)setDetailError('讀取單卡失敗：'+String(e?.message||e));}
    finally{if(mounted.current)setDetailBusy(false);}
  }
  function finish(){
    if(locked.current||busy||finished||selected||!cardsRef.current.length)return;
    try{
      setReading(officialReading(cardsRef.current));
      setFinished(true);setError('');setMessage('抽牌完成；結果顯示於下方。');
    }catch(e){setError(String(e?.message||e));}
  }
  function reset(){
    if(locked.current)return;
    cardsRef.current=[];detailCache.current.clear();setItems([]);setSelected(null);setDetail(null);setFinished(false);
    setReading('');setError('');setMessage('月光已就位，輕觸畫面召喚一枚符文');
  }
  return <main className="loc-next-main rune-skin-lab rune-3d-shell" data-rune-lab="duel2">
    <header className="rune-3d-header">
      <p className="loc-eyebrow">LunaRunes · Living Ritual</p>
      <h1>月光召喚 · 3D 抽牌</h1>
      <p>先是恆動等待的月光與流金。每輕觸畫面一次召喚一枚，約一秒後亮牌，符文飛向月輪並持續環繞。</p>
    </header>
    <nav className="rune-3d-toolbar">
      <span className="rune-3d-toolbar-label">真實月相 {moon}　·　{items.length} / {MAX_DRAW} 枚</span>

    </nav>
    <section className={'rune-3d-stage rune-3d-duel'+(!finished?' rune-3d-tappable':'')}
      aria-label="點觸月光空間逐張抽取符文">
      <RuneWorld mode="draw" items={items} quality="high"
        onSelect={showCard} onBackgroundClick={!finished&&!selected?drawOne:undefined}/>
      <div className="rune-3d-stage-label" role="status">{busy?'符文穿過金色光河，等待亮相……':message}</div>
    </section>
    {error?<p className="rune-skin-error" role="alert">{error}</p>:null}
    <div className="rune-3d-footer">
      <div className="rune-skin-controls">
        {!finished?<button type="button" className="rune-skin-btn primary" onClick={drawOne} disabled={busy||!!selected||items.length>=MAX_DRAW}>
          {busy?'召喚中…':items.length?'再召喚一枚':'觸碰召喚'}
        </button>:null}
        {!finished?<button className="rune-skin-btn" type="button" onClick={finish} disabled={busy||!!selected||!items.length}>結束抽牌</button>:null}
        {finished?<button className="rune-skin-btn primary" type="button" onClick={reset}>重新開始</button>:null}
      </div>
      <nav className="rune-skin-controls" aria-label="返回與模式切換">
        <a href="/card/" className="rune-skin-btn">← 3D 場域首頁</a>
        <a href="/card/list/" className="rune-skin-btn">切換指定圖鑑</a>
        <a href="/card/daily/" className="rune-skin-btn">每日符文</a>
        <a href="/duel/one/" className="rune-skin-btn">舊版抽牌</a>
      </nav>
    </div>
    {finished?<section className="rune-skin-verse rune-3d-reading" data-draw-stage="reading">
      <h2>本次抽牌結果</h2>
      <p>本次抽了 {items.length} 張符文，{items.length} 張符文分別為：
        {items.map((item,index)=><span key={item.card.rune_id}>{index?'、':''}{shortRuneName(item.card)}{item.direction}</span>)}。</p>
      <p>指示籤詩為：{reading}</p>
    </section>:null}
    {selected?<RuneDrawCardDialog item={selected} card={detail} loading={detailBusy}
      error={detailError} onClose={()=>{setSelected(null);setDetail(null);setDetailError('');}}/>:null}
  </main>;
}
