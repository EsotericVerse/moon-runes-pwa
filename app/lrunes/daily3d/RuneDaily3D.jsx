'use client';

import {useEffect,useRef,useState} from 'react';
import RuneArtStage from '../visual/RuneArtStage';
import {realMoonPhase} from '../../loc/model/moon-phase';
import {navigationHref} from '../../modular/nav-destinations.mjs';
import useNativeNavigation from '../../modular/use-native-navigation';
import {loadDrawCards,randomIndex} from '../RuneDrawClient';
import {runeImage} from '../rune-directory.mjs';
import '../skin-lab.css';
import '../three/rune-world.css';

const DIRECTIONS=['正位','半正位','半逆位','逆位'];
const FIELDS=[['sit_q','狀況形容'],['sit_a','狀況表達'],
  ['daily_r','每日占卜提醒'],['daily_g','每日占卜引導'],['daily_b','每日占卜祝福']];
export default function RuneDaily3D(){
  const native=useNativeNavigation();
  const [moon,setMoon]=useState(()=>realMoonPhase());
  const [draw,setDraw]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [details,setDetails]=useState(false);
  const lock=useRef(false);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  async function drawDaily(){
    if(lock.current)return;
    lock.current=true;setBusy(true);setError('');setDetails(false);
    const currentMoon=realMoonPhase();setMoon(currentMoon);
    if(currentMoon==='未知'){
      setError('真實月相無法辨識，無法查詢每日指示。');
      lock.current=false;setBusy(false);return;
    }
    const runeNumber=randomIndex(66)+1;
    const index=randomIndex(4);
    try{
      const [card]=await loadDrawCards([{runeNumber,dir:index+1}],{
        staticTypes:['direction'],moonTypes:FIELDS.map(([type])=>type),currentMoon
      });
      if(!card)throw new Error('每日符文資料尚未就緒。');
      if(mounted.current)setDraw({card,directionIndex:index,
        direction:DIRECTIONS[index],birth:Date.now(),moon:currentMoon});
    }catch(e){if(mounted.current)setError('每日指示讀取失敗：'+String(e?.message||e));}
    finally{lock.current=false;if(mounted.current)setBusy(false);}
  }
  const fields=draw?FIELDS.map(([key,label])=>({
    label,text:String(draw.card?.rune_etc?.[key]?.[draw.directionIndex+1]||'').trim()
  })).filter(field=>field.text):[];
  return <main className="loc-next-main rune-skin-lab rune-3d-shell" data-rune-lab="daily3d">
    <header className="rune-3d-header">
      <p className="loc-eyebrow">LunaRunes · Living Daily</p>
      <h1>每日符文 · 月光指示</h1>
      <p>每日指示獨立呈現。以當下真實月相、符文與位向精確查詢原有五項文字。</p>
    </header>
    <nav className="rune-3d-toolbar">
      <span className="rune-3d-toolbar-label">真實月相：{moon}　·　每日指示</span>
    </nav>
    <section className="rune-art-stage" aria-label="每日符文原創美術揭示">
      <RuneArtStage mode="draw" items={draw?[draw]:[]}
        onSelect={()=>setDetails(true)} onBackgroundClick={!busy?drawDaily:undefined}/>
      <div className="rune-art-stage-label" role="status">
        {busy?'月光正在帶來每日指示……':draw?'今日符文已亮相，下方顯示每日指示。':'輕觸月光召喚每日符文'}
      </div>
    </section>
    {error?<p className="rune-skin-error" role="alert">{error}</p>:null}
    <div className="rune-3d-footer">
      <button type="button" className="rune-skin-btn primary" onClick={drawDaily} disabled={busy}>
        {busy?'召喚中…':draw?'重新召喚每日符文':'召喚每日符文'}
      </button>
      <nav className="rune-skin-controls" aria-label="符文模式">
        <a className="rune-skin-btn" href={navigationHref('lrunes','',native)}>回符文首頁</a>
        <a className="rune-skin-btn" href={navigationHref('lrunes','card',native)}>← 符文展示首頁</a>
        <a className="rune-skin-btn" href={navigationHref('lrunes','card/duel',native)}>一般抽牌</a>
        <a className="rune-skin-btn" href={navigationHref('lrunes','duel/daily',native)}>原版每日指示</a>
      </nav>
    </div>
    {draw?<section className="rune-skin-verse rune-3d-daily-reading" data-draw-stage="reading">
      <h2>每日符文：{String(draw.card.rune_name||'').replace(/之符文$/,'')} · {draw.direction}</h2>
      <img className="rune-3d-daily-card" src={runeImage(draw.card)}
        alt={draw.card.rune_name+'卡片'} loading="lazy"/>
      <p>卡片月相：{['','新月','上弦','滿月','下弦'][Number(draw.card.moon_phase)]||'無'} ／ 真實月相：{draw.moon}</p>
      <div className="rune-3d-daily-fields">
        {fields.map(field=><article key={field.label}><h3>{field.label}</h3><p>{field.text}</p></article>)}
      </div>
      {Number(draw.card.rune_id)>=65&&fields.length<5?
        <p className="rune-3d-daily-caveat">特殊符文尚未建置全部每日母資料，僅展示實際存在的原始文字。</p>:null}
    </section>:null}
    {details&&draw?<div className="rune-3d-modal-backdrop" onClick={()=>setDetails(false)} role="presentation">
      <section className="rune-3d-modal" role="dialog" aria-modal="true" aria-label="每日符文內容" onClick={e=>e.stopPropagation()}>
        <div className="rune-3d-modal-head">
          <h2>{draw.card.rune_name} · {draw.direction}</h2>
          <button type="button" className="rune-skin-btn" onClick={()=>setDetails(false)}>× 關閉</button>
        </div>
        <div className="rune-3d-modal-details rune-3d-daily-modal-fields">
          {fields.map(field=><div key={field.label}><h3>{field.label}</h3><p>{field.text}</p></div>)}
        </div>
      </section>
    </div>:null}
  </main>;
}
