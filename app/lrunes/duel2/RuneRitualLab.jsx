'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
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
function officialReading(items){
  if(!items.length)return '';
  const cards=items.map(x=>x.card),directions=items.map(x=>x.direction);
  const mode=items.length===1?'single':items.length===11?'ow3gs':items.length+'card';
  // Single-card "lots" is the canonical single draw content. Multi-card
  // fixed poetic grammar uses sit_q, matching the existing LunaRunes engine.
  if(items.length===1){
    const item=items[0],card=item.card,n=item.directionIndex;
    const direction=realText(card,'direction',n)||card.rune_description||'';
    const situation=realText(card,'sit_q',n);
    const answer=realText(card,'sit_a',n);
    const lots=realText(card,'lots',n);
    return [String(card.rune_name)+' · '+item.direction,direction,
      situation?'狀況形容：'+situation:'',
      answer?'狀況表達：'+answer:'',
      lots?'單卡籤詩：'+lots:''].filter(Boolean).join('\n\n');
  }
  const generated=buildFixedReading(cards,directions,mode).sentence;
  if(generated&&!/^資訊不足[。！!]?$/u.test(generated)&&!generated.includes('資訊不足'))return generated;
  // For an incomplete moon-specific sit_q, show only authentic fetched data.
  // Never fabricate verse text or present "資訊不足" as a valid reading.
  return items.map((item,i)=>{
    const text=realText(item.card,'sit_q',item.directionIndex)||
      realText(item.card,'direction',item.directionIndex)||item.card.rune_description||'';
    return [i+1+' · '+item.card.rune_name+' · '+item.direction,text].filter(Boolean).join('：');
  }).join('\n');
}
const pause=milliseconds=>new Promise(done=>setTimeout(done,milliseconds));
export default function RuneRitualLab(){
  const [items,setItems]=useState([]);
  const [quality,setQuality]=useState('high');
  const [busy,setBusy]=useState(false);
  const [ready,setReady]=useState(false);
  const [finished,setFinished]=useState(false);
  const [reading,setReading]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('月光已就位，輕觸畫面召喚一枚符文');
  const cardsRef=useRef([]);
  const locked=useRef(false);
  const mounted=useRef(true);
  const moon=useMemo(()=>realMoonPhase(),[]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  async function drawOne(){
    if(locked.current||finished||cardsRef.current.length>=MAX_DRAW)return;
    locked.current=true;
    setBusy(true);setReady(false);setError('');setMessage('月光正在引導下一枚符文……');
    const started=Date.now();
    const used=new Set(cardsRef.current.map(x=>Number(x.card.rune_id)));
    const remaining=Array.from({length:66},(_,i)=>i+1).filter(id=>!used.has(id));
    const runeNumber=remaining[randomIndex(remaining.length)];
    const directionIndex=randomIndex(4);
    try{
      const cards=await loadDrawCards([{runeNumber,dir:directionIndex+1}],{
        staticTypes:['direction','lots'],moonTypes:['sit_q','sit_a'],currentMoon:moon
      });
      const card=cards.find(x=>Number(x.rune_id)===runeNumber);
      if(!card)throw Error('符文資料無法讀取');
      await pause(Math.max(0,REVEAL_MS-(Date.now()-started)));
      if(!mounted.current)return;
      const next=[...cardsRef.current,{
        card,direction:DIRECTIONS[directionIndex],directionIndex,birth:Date.now()
      }];
      cardsRef.current=next;setItems(next);
      setReady(true);setMessage(next.length>=MAX_DRAW?'星環已達十一枚，請開籤詩。':'符文已亮相，觸碰空間可再召喚一枚。');
    }catch(e){
      if(mounted.current){setError('抽牌失敗：'+String(e?.message||e));setMessage('觸碰畫面重試');}
    }finally{
      locked.current=false;
      if(mounted.current)setBusy(false);
    }
  }
  function finish(){
    if(locked.current||busy||finished||!cardsRef.current.length)return;
    setReading(officialReading(cardsRef.current));
    setFinished(true);setMessage('月光回響，請閱讀本次符文指示');
  }
  function reset(){
    if(locked.current)return;
    cardsRef.current=[];setItems([]);setReady(false);setFinished(false);
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
      <label>視覺模式 <select className="rune-skin-quality" value={quality} onChange={e=>setQuality(e.target.value)}>
        <option value="high">極致 3D</option><option value="standard">標準 3D</option>
        <option value="static">靜態備援</option>
      </select></label>
    </nav>
    <section className={'rune-3d-stage rune-3d-duel'+(!finished?' rune-3d-tappable':'')}
      aria-label="點觸月光空間逐張抽取符文">
      {quality!=='static'?<RuneWorld mode="draw" items={items} quality={quality}
        onBackgroundClick={!finished?drawOne:undefined}/>
        :<button className="rune-3d-static-wait" type="button" onClick={drawOne} disabled={busy||finished||items.length===MAX_DRAW}>
          <div className="rune-3d-static-moon">☾</div>
          <span>輕觸召喚一枚符文</span>
          <div className="rune-3d-static-grid">{items.map(item=>
            <figure key={item.card.rune_id}><img src={runeImage(item.card)} alt={item.card.rune_name}/>
              <figcaption>{item.card.rune_name} · {item.direction}</figcaption></figure>)}</div>
        </button>}
      <div className="rune-3d-stage-label" role="status">{busy?'符文穿過金色光河，等待亮相……':message}</div>
    </section>
    {error?<p className="rune-skin-error" role="alert">{error}</p>:null}
    <div className="rune-3d-footer">
      <div className="rune-skin-controls">
        {!finished?<button type="button" className="rune-skin-btn primary" onClick={drawOne} disabled={busy||items.length>=MAX_DRAW}>
          {busy?'召喚中…':items.length?'再召喚一枚':'觸碰召喚'}
        </button>:null}
        {!finished?<button className="rune-skin-btn" type="button" onClick={finish} disabled={!ready||busy||items.length<1}>完成抽牌 · 開籤詩</button>:null}
        {finished?<button className="rune-skin-btn primary" type="button" onClick={reset}>重新開始</button>:null}
      </div>
      <a href="/duel/one/" className="rune-skin-btn">舊版抽牌</a>
    </div>
    {finished?<section className="rune-skin-verse rune-3d-reading" data-draw-stage="reading">
      <p className="loc-eyebrow">MOON VERSE</p><h2>占卜結果</h2>
      <p>{reading}</p>
    </section>:null}
  </main>;
}
