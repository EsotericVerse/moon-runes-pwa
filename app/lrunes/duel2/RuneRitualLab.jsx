'use client';

import {useEffect,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {createPortal} from 'react-dom';
import {realMoonPhase} from '../../loc/model/moon-phase';
import {navigationHref} from '../../modular/nav-destinations.mjs';
import useNativeNavigation from '../../modular/use-native-navigation';
import {randomIndex,loadDrawCards,buildFixedReading} from '../RuneDrawClient';
import {runeImage} from '../rune-directory.mjs';
import {RUNE_ALL_DRAW_MODES} from '../rune-draw-modes.mjs';
import RuneCardInfo from '../RuneCardInfo';
import '../skin-lab.css';
import '../three/rune-world.css';

const RuneWorld=dynamic(()=>import('../three/RuneWorld'),{ssr:false,loading:()=> <p className="rune-world-loading">月光正在凝聚……</p>});
const MAX_DRAW=11;
const REVEAL_MS=1000;
const DIRECTIONS=['正位','半正位','半逆位','逆位'];
// Explanatory only: 1–11 rune counts, without any route, button or handler.
const DRAW_COUNT_GUIDE=RUNE_ALL_DRAW_MODES
  .filter(item=>item.key!=='daily')
  .slice().sort((a,b)=>a.count-b.count);
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
// This is exactly the same silver.runes "card basic information" UI used
// in the accepted original draw. NO runes_etc content or queries in this dialog.
function RuneDrawCardDialog({item,onClose}){
  useEffect(()=>{
    const close=e=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',close);
    return()=>window.removeEventListener('keydown',close);
  },[onClose]);
  const card=item.card;
  return <div className="rune-3d-modal-backdrop rune-3d-draw-modal-backdrop" role="presentation" onClick={onClose}>
    <section className="rune-3d-modal rune-3d-draw-modal" role="dialog" aria-modal="true"
      aria-label={shortRuneName(card)+'符文基本資料'} onClick={e=>e.stopPropagation()}>
      <div className="rune-3d-modal-head">
        <div><span className="loc-eyebrow">RUNE ARCHIVE · 卡片基本資料</span>
          <h2>{shortRuneName(card)}之符文 · {item.direction}</h2></div>
        <button className="rune-skin-btn" type="button" autoFocus onClick={onClose}>× 關閉</button>
      </div>
      <div className="rune-3d-modal-main rune-3d-original-card-info">
        <RuneCardInfo card={card} imageSrc={runeImage(card)}
          direction={item.direction} realMoonPhase={item.moon} layout="home"/>
      </div>
    </section>
  </div>;
}
const pause=milliseconds=>new Promise(done=>setTimeout(done,milliseconds));
export default function RuneRitualLab(){
  const native=useNativeNavigation();
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
      const cards=await loadDrawCards([{runeNumber,dir:directionIndex+1}],{
        staticTypes:[],moonTypes:['sit_q'],currentMoon
      });
      const card=cards.find(x=>Number(x.rune_id)===runeNumber);
      if(!card||!realText(card,'sit_q',directionIndex))throw Error('抽中的符文籤詩無法讀取');
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
  function showCard(card){
    const item=cardsRef.current.find(x=>Number(x.card.rune_id)===Number(card.rune_id));
    if(item)setSelected(item);
  }
  function finish(){
    if(locked.current||busy||finished||selected||!cardsRef.current.length)return;
    try{
      setReading(officialReading(cardsRef.current));
      setFinished(true);setError('');setMessage('抽牌完成；結果顯示於下方。');
    }catch(e){setError(String(e?.message||e));}
  }
  function reset(){
    if(locked.current||busy||selected)return;
    cardsRef.current=[];setItems([]);setSelected(null);setFinished(false);
    setReading('');setError('');setMessage('月光已就位，輕觸畫面召喚一枚符文');
  }
  return <main className="loc-next-main rune-skin-lab rune-3d-shell rune-3d-duel-shell" data-rune-lab="duel2">
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
    <div className="rune-3d-duel-action-dock" role="group" aria-label="抽牌桌操作">
      {!finished?<button type="button" className="rune-3d-duel-action rune-3d-duel-action--draw"
        onClick={drawOne} disabled={busy||!!selected||items.length>=MAX_DRAW}>
        {busy?'召喚中…':items.length?'再召喚一枚':'觸碰召喚'}
      </button>:null}
      <button type="button" className="rune-3d-duel-action rune-3d-duel-action--restart"
        onClick={reset} disabled={busy||!!selected||!items.length}>
        重新占卜
      </button>
      {!finished?<button type="button" className="rune-3d-duel-action rune-3d-duel-action--finish"
        onClick={finish} disabled={busy||!!selected||!items.length}>
        結束占卜，看指示籤詩
      </button>:null}
    </div>
    <div className="rune-3d-footer">
      <nav className="rune-skin-controls" aria-label="返回與模式切換">
        <a href={navigationHref('lrunes','',native)} className="rune-skin-btn">回符文首頁</a>
        <a href={navigationHref('lrunes','card',native)} className="rune-skin-btn">← 3D 場域首頁</a>
        <a href={navigationHref('lrunes','card/list',native)} className="rune-skin-btn">切換指定圖鑑</a>
        <a href={navigationHref('lrunes','card/daily',native)} className="rune-skin-btn">每日符文</a>
        <a href={navigationHref('lrunes','duel/one',native)} className="rune-skin-btn">舊版抽牌</a>
      </nav>
    </div>
    {finished?<section className="rune-skin-verse rune-3d-reading" data-draw-stage="reading">
      <h2>本次抽牌結果</h2>
      <p>本次抽了 {items.length} 張符文，{items.length} 張符文分別為：
        {items.map((item,index)=><span key={item.card.rune_id}>{index?'、':''}{shortRuneName(item.card)}{item.direction}</span>)}。</p>
      <p>指示籤詩為：{reading}</p>
    </section>:null}
    <section className="rune-3d-draw-guide" aria-label="占卜張數說明">
      <h2>占卜張數說明</h2>
      <p>不同的抽取張數對應不同的閱讀結構；以下僅為說明，不是模式選單。</p>
      <div className="rune-3d-draw-guide-grid">
        {DRAW_COUNT_GUIDE.map(item=><article className="rune-3d-draw-guide-card" key={item.key}>
          <strong>{item.count} 張｜{item.label}</strong>
          <p>{item.description}</p>
        </article>)}
      </div>
    </section>
    {selected&&typeof document!=='undefined'?createPortal(
      <RuneDrawCardDialog item={selected} onClose={()=>setSelected(null)}/>,document.body
    ):null}
  </main>;
}
