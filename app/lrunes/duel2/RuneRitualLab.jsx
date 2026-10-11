'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {motion,AnimatePresence} from 'motion/react';
import {realMoonPhase} from '../../loc/model/moon-phase';
import {randomIndex,loadDrawCards,buildFixedReading} from '../RuneDrawClient';
import RuneGlyph3D from '../RuneGlyph3D';
import '../skin-lab.css';

const DIRECTIONS=['正位','半正位','半逆位','逆位'];
const MAX_DRAW=11;
const SHOW_MS=3200;
const SPELLS=['月光甦醒，符文回響。','以月為引，以字為契。','符文降臨，命意自明。'];
const modeFor=count=>count===1?'single':count===11?'ow3gs':count+'card';
// The moon stays at the centre; positions are calculated only from cards actually drawn.
function orbitPoint(index,total){
  if(total===1)return {x:50,y:63};
  if(total===2)return {x:50,y:index===0?22:79};
  const ring=total===3?3:total<=6?total:6;
  const outer=total>6&&index>=6;
  const slot=outer?index-6:index;
  const count=outer?total-6:ring;
  const angle=-Math.PI/2+2*Math.PI*slot/count;
  const radiusX=total===3?31:outer?40:total>6?22:34;
  const radiusY=total===3?32:outer?40:total>6?22:35;
  return {x:50+radiusX*Math.cos(angle),y:50+radiusY*Math.sin(angle)};
}

export default function RuneRitualLab(){
  const [items,setItems]=useState([]);
  const [quality,setQuality]=useState('high');
  const [busy,setBusy]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [finished,setFinished]=useState(false);
  const [error,setError]=useState('');
  const [spell,setSpell]=useState('');
  const [reading,setReading]=useState('');
  const [animationId,setAnimationId]=useState(0);
  const latest=useRef([]);
  const locked=useRef(false);
  const skipped=useRef(false);
  const timers=useRef([]);
  const moon=useMemo(()=>realMoonPhase(),[]);
  const stopTimers=()=>{timers.current.forEach(clearTimeout);timers.current=[];};
  useEffect(()=>()=>stopTimers(),[]);
  async function drawOne(){
    if(locked.current||finished||latest.current.length>=MAX_DRAW)return;
    locked.current=true;skipped.current=false;stopTimers();
    setBusy(true);setPlaying(true);setSpell(SPELLS[0]);setError('');setAnimationId(id=>id+1);
    const started=Date.now();
    const taken=new Set(latest.current.map(row=>Number(row.card.rune_id)));
    const remaining=Array.from({length:66},(_,i)=>i+1).filter(id=>!taken.has(id));
    const runeNumber=remaining[randomIndex(remaining.length)];
    const directionIndex=randomIndex(4);
    const direction=DIRECTIONS[directionIndex];
    timers.current.push(setTimeout(()=>{if(!skipped.current)setSpell(SPELLS[1]);},900));
    timers.current.push(setTimeout(()=>{if(!skipped.current)setSpell(SPELLS[2]);},1950));
    try{
      const rows=await loadDrawCards([{runeNumber,dir:directionIndex+1}],{
        staticTypes:['direction','lots'],
        moonTypes:['sit_q','sit_a'],
        currentMoon:moon
      });
      if(!rows.length)throw Error('抽中的符文資料尚未就緒');
      const next=[...latest.current,{card:rows[0],direction,directionIndex}];
      latest.current=next;
      setItems(next);
      if(skipped.current){setPlaying(false);setSpell('');}
      else{
        const remain=Math.max(0,SHOW_MS-(Date.now()-started));
        timers.current.push(setTimeout(()=>{setPlaying(false);setSpell('');},remain));
      }
    }catch(err){
      setError('抽牌資料讀取失敗：'+String(err?.message||err));
      setPlaying(false);setSpell('');
    }finally{locked.current=false;setBusy(false);}
  }
  function skip(){
    if(!playing)return;
    skipped.current=true;stopTimers();setPlaying(false);setSpell('');
  }
  function endDraw(){
    if(playing||busy||finished||latest.current.length===0)return;
    const cards=latest.current.map(item=>item.card);
    const directions=latest.current.map(item=>item.direction);
    setReading(buildFixedReading(cards,directions,modeFor(cards.length)).sentence);
    setFinished(true);
  }
  function reset(){
    if(busy)return;
    stopTimers();latest.current=[];locked.current=false;skipped.current=false;
    setItems([]);setPlaying(false);setFinished(false);setReading('');setError('');setSpell('');
  }
  const stageClass=items.length===1?'single':items.length===2?'two':items.length===3?'three':'';
  return <main className="loc-next-main rune-skin-lab" data-rune-lab="duel2">
    <header className="rune-skin-header">
      <p className="loc-eyebrow">LunaRunes · 3D Skin Lab</p>
      <h1>符文召喚儀式｜duel2</h1>
      <p>獨立測試版。每次只抽一枚符文；抽出一枚後，隨時可以開籤詩。原有抽牌頁與規則不受影響。</p>
    </header>
    <div className="rune-skin-bar">
      <span>真實月相：{moon}　·　已抽 {items.length} 枚 ／ 上限 {MAX_DRAW} 枚</span>
      <label>畫質　<select className="rune-skin-quality" value={quality} onChange={e=>setQuality(e.target.value)}>
        <option value="high">高畫質 3D</option><option value="standard">標準 3D</option><option value="static">靜態圖片</option>
      </select></label>
    </div>
    <section className="rune-skin-stage" aria-label="3D 符文召喚區">
      <div className={`rune-skin-cosmos ${stageClass}`} data-count={items.length}>
        <div className="rune-skin-moon" aria-label="月亮" role="img"/>
        <AnimatePresence initial={false}>
          {items.map((item,index)=><motion.div layout
            className="rune-skin-orbit-card" key={item.card.rune_id}
            style={{left:orbitPoint(index,items.length).x+'%',top:orbitPoint(index,items.length).y+'%',width:items.length>6?'clamp(66px,13vw,124px)':items.length>3?'clamp(90px,18vw,175px)':'clamp(115px,23vw,195px)'}}
            initial={{opacity:0,scale:.48,y:48}}
            animate={{opacity:1,scale:1,y:0}}
            exit={{opacity:0,scale:.5}}
            transition={skipped.current?{duration:0}:{type:'spring',stiffness:105,damping:17}}
          >
            <RuneGlyph3D card={item.card} direction={item.direction} quality={quality} active={playing&&index===items.length-1}/>
            <strong className="rune-skin-orbit-name">{item.card.rune_name}</strong>
            <span className="rune-skin-orbit-direction">{item.direction}</span>
          </motion.div>)}
        </AnimatePresence>
      </div>
      <div className="rune-skin-spell" aria-live="polite">{playing?spell:finished?'月光歸位，籤詩已啟。':items.length?'符文已就位，可以再抽或開籤詩。':'點擊「召喚一枚符文」開始。'}</div>
      {busy&&!items.length?<p className="rune-skin-status">正在讀取符文資料……</p>:null}
    </section>
    {error?<p className="rune-skin-error" role="alert">{error}</p>:null}
    <div className="rune-skin-bar">
      <div className="rune-skin-controls">
        {!finished?<button className="rune-skin-btn primary" disabled={busy||playing||items.length>=MAX_DRAW} onClick={drawOne}>{items.length?'再抽一張':'召喚一枚符文'}</button>:null}
        {playing?<button className="rune-skin-btn" onClick={skip}>跳過動畫</button>:null}
        {!finished?<button className="rune-skin-btn" disabled={busy||playing||items.length===0} onClick={endDraw}>開籤詩</button>:null}
        {finished?<button className="rune-skin-btn primary" onClick={reset}>重新開始</button>:null}
      </div>
      <a href="/duel/one/" className="rune-skin-btn">返回舊版抽牌</a>
    </div>
    {finished?<motion.section className="rune-skin-verse" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} data-draw-stage="reading">
      <p className="loc-eyebrow">月之籤詩</p>
      <h2>占卜結果</h2>
      <p>{reading}</p>
    </motion.section>:null}
  </main>;
}
