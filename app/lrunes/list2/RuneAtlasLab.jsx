'use client';

import {useEffect,useState} from 'react';
import {motion} from 'motion/react';
import {selectRows} from '../../loc/db-query.mjs';
import RuneGlyph3D from '../RuneGlyph3D';
import '../skin-lab.css';

const PAGE_SIZE=8;
const COUNT=66;
const PAGE_COUNT=Math.ceil(COUNT/PAGE_SIZE);
const COLUMNS='rune_id,rune_name,totem,group_name,moon_phase,rune_description,card_attr';
export default function RuneAtlasLab(){
  const [page,setPage]=useState(0);
  const [quality,setQuality]=useState('standard');
  const [rows,setRows]=useState([]);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');
  const [selected,setSelected]=useState(null);
  useEffect(()=>{
    let live=true;
    setBusy(true);setError('');setRows([]);setSelected(null);
    const start=page*PAGE_SIZE+1;
    const ids=Array.from({length:Math.min(PAGE_SIZE,COUNT-page*PAGE_SIZE)},(_,i)=>start+i);
    selectRows('silver.runes',{
      columns:COLUMNS,
      filters:[{column:'rune_id',operator:'in',value:ids}],
      orders:[{column:'rune_id',ascending:true}],
      limit:ids.length,
      offset:0
    }).then(({rows:next})=>{
      if(!live)return;
      const byId=new Map((next||[]).map(card=>[Number(card.rune_id),card]));
      const sorted=ids.map(id=>byId.get(id)).filter(Boolean);
      setRows(sorted);
      if(sorted.length!==ids.length)setError('部分符文資料尚未載入。');
    }).catch(err=>{if(live)setError(String(err?.message||'符文載入失敗'));})
      .finally(()=>{if(live)setBusy(false);});
    return()=>{live=false;};
  },[page]);
  const go=next=>{setPage(Math.min(PAGE_COUNT-1,Math.max(0,next)));};
  return <main className="loc-next-main rune-skin-lab" data-rune-lab="list2">
    <header className="rune-skin-header">
      <p className="loc-eyebrow">LunaRunes · 3D Atlas Lab</p>
      <h1>3D 符文圖鑑｜list2</h1>
      <p>獨立展示版：66 枚符文，每頁 8 枚。中文字是主角；觸碰可觸發符文光效，位向與月相分層呈現。原有圖鑑不變。</p>
    </header>
    <div className="rune-skin-bar">
      <span>第 {page+1} ／ {PAGE_COUNT} 頁　·　符文 {page*PAGE_SIZE+1}–{Math.min(COUNT,(page+1)*PAGE_SIZE)}</span>
      <label>畫質　<select className="rune-skin-quality" value={quality} onChange={e=>setQuality(e.target.value)}>
        <option value="high">高畫質 3D</option>
        <option value="standard">標準 3D</option>
        <option value="static">靜態圖片</option>
      </select></label>
    </div>
    {error?<p className="rune-skin-error" role="alert">{error}</p>:null}
    {busy?<p className="rune-skin-status" role="status">載入當頁符文中……</p>:null}
    {!busy&&!rows.length?<p className="rune-skin-status">目前沒有可展示的符文。</p>:null}
    <section className="rune-skin-grid" aria-label="符文 3D 展示">
      {rows.map(card=><motion.article className="rune-skin-atlas-item" key={card.rune_id}
        initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.32}}
        aria-label={`第 ${card.rune_id} 枚，${card.rune_name}`}>
        <RuneGlyph3D card={card} quality={quality} direction="" />
        <strong>{String(card.rune_id).padStart(2,'0')} · {card.rune_name}</strong>
        <small>{card.group_name||'符文'} · {card.rune_description||'—'}</small>
        <button className="rune-skin-btn" type="button" onClick={()=>setSelected(old=>old===card.rune_id?null:card.rune_id)} aria-expanded={selected===card.rune_id}>查看資料</button>
        {selected===card.rune_id?<p className="rune-skin-status">卡片月相：{['','新月','上弦','滿月','下弦'][Number(card.moon_phase)]||'無'}<br/>此處不抽取位向；點擊字形可直接觸發光效。</p>:null}
      </motion.article>)}
    </section>
    <div className="rune-skin-bar">
      <div className="rune-skin-controls">
        <button className="rune-skin-btn" onClick={()=>go(page-1)} disabled={page===0}>上一頁</button>
        <button className="rune-skin-btn primary" onClick={()=>go(page+1)} disabled={page>=PAGE_COUNT-1}>下一頁</button>
      </div>
      <a className="rune-skin-btn" href="/list/">返回舊版圖鑑</a>
    </div>
  </main>;
}
