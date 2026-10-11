'use client';

/**
 * LunaRunes 2D art-directed presentation.
 * Uses the project's original nine group paintings and 66 published rune cards.
 * No WebGL, Three.js, extruded glyphs, tarot pack, pseudo-3D tilting, or shaders.
 * Motion is used only for enter/exit and reveal choreography.
 */
import {motion,AnimatePresence,useReducedMotion} from 'motion/react';
import {groupImage,runeImage,runeName} from '../rune-directory.mjs';
import './rune-art-stage.css';

const PHASES=['','新月','上弦','滿月','下弦'];
const GROUP_NAMES=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
const stepTransition={duration:.65,ease:[.22,1,.36,1]};
const imageProps={loading:'eager',decoding:'async'};

function CardMoon({card}){
  const value=PHASES[Number(card?.moon_phase)]||'無對應月相';
  return <span className="rune-art-card-moon" title={'卡片月相：'+value}>{value}</span>;
}
function RuneCardFace({card,direction}){
  return <div className="rune-art-card-frame">
    <img src={runeImage(card)} alt={runeName(card)+'原始符文卡面'}
      loading="eager" decoding="async"/>
    <CardMoon card={card}/>
    {direction?<span className="rune-art-direction">{direction}</span>:null}
  </div>;
}
function Gallery({mode,items,onSelect,reduced}){
  const groupMode=mode==='groups';
  return <div className={'rune-art-gallery '+(groupMode?'rune-art-gallery--groups':'rune-art-gallery--runes')}>
    <div className="rune-art-gallery-intro">
      <span className="rune-art-kicker">LUNARUNES · ORIGINAL ARTWORK</span>
      <h2>{groupMode?'九曜星域':'符文圖鑑'}</h2>
      <p>{groupMode?'每一個群組都保有原始畫作的完整面貌。':'使用符韻原始卡面，不重新繪製中文字。'}</p>
    </div>
    <div className="rune-art-gallery-grid">
      {items.map((item,index)=>{
        const key=groupMode?'group-'+String(item.id):'rune-'+String(item.rune_id);
        const url=groupMode?groupImage(item.id):runeImage(item);
        if(!url)return null;
        return <motion.button type="button" className={'rune-art-gallery-tile '+(groupMode?'rune-art-group-tile':'rune-art-rune-tile')}
          key={key} onClick={()=>onSelect?.(item)} aria-label={groupMode?'查看'+item.name+'群組':'查看'+runeName(item)+'之符文'}
          initial={reduced?false:{opacity:0,y:24}}
          animate={{opacity:1,y:0}}
          transition={{...stepTransition,delay:reduced?0:Math.min(index,10)*.065}}>
          <img src={url} alt="" loading={index<6?'eager':'lazy'} decoding="async"/>
          <span className="rune-art-tile-caption">
            <span className="rune-art-tile-num">{String(groupMode?item.id:item.rune_id).padStart(2,'0')}</span>
            <strong>{groupMode?(item.name||GROUP_NAMES[index]):runeName(item)}</strong>
            <span aria-hidden="true">↗</span>
          </span>
        </motion.button>;
      })}
    </div>
  </div>;
}
function DrawStage({items,onSelect,onBackgroundClick,reduced}){
  const last=items[items.length-1];
  const active=last?.card||last;
  const previous=items.slice(0,-1);
  return <div className={'rune-art-ritual '+(last?'rune-art-ritual--revealed':'rune-art-ritual--waiting')}>
    <img className="rune-art-ritual-backdrop" src="/pics/LunaRunes-hero.jpg" alt="" aria-hidden="true" {...imageProps}/>
    <div className="rune-art-ritual-aura" aria-hidden="true"/>
    <div className="rune-art-ritual-heading">
      <span className="rune-art-kicker">MOONLIGHT · RUNE REVELATION</span>
      <h2>{last?'月光已回應':'讓月光揭示符文'}</h2>
      <p>{last?'每一次亮牌，都保留符韻原始卡面與文字。':'一枚一枚召喚，從原創畫作開始。'}</p>
    </div>
    <AnimatePresence mode="wait">
      {last?<motion.div className="rune-art-reveal" key={'revealed-'+active.rune_id}
        initial={reduced?false:{opacity:0,y:55,scale:.84,filter:'blur(12px)'}}
        animate={{opacity:1,y:0,scale:1,filter:'blur(0px)'}}
        exit={reduced?{opacity:0}:{opacity:0,y:-26,scale:.96}}
        transition={stepTransition}>
        <span className="rune-art-reveal-glow" aria-hidden="true"/>
        <motion.button type="button" className="rune-art-featured-card" onClick={()=>onSelect?.(active)}
          aria-label={'查看'+runeName(active)+'之符文基本資料'} whileHover={reduced?undefined:{y:-5}}
          transition={{duration:.24}}>
          <RuneCardFace card={active} direction={last.direction}/>
        </motion.button>
        <div className="rune-art-reveal-title" aria-live="polite">
          <span>第 {items.length} 枚 · {String(active.rune_id).padStart(2,'0')}</span>
          <strong>{runeName(active)}之符文</strong>
          <span>{last.direction||''}</span>
        </div>
      </motion.div>:
      <motion.div className="rune-art-empty" key="empty"
        initial={reduced?false:{opacity:0,y:16}}
        animate={{opacity:1,y:0}} transition={stepTransition}>
        <div className="rune-art-empty-ring" aria-hidden="true">☾</div>
        <button className="rune-art-invoke" type="button" onClick={()=>onBackgroundClick?.()}
          disabled={!onBackgroundClick}>觸碰月光，召喚第一枚符文</button>
      </motion.div>}
    </AnimatePresence>
    {previous.length?<div className="rune-art-history" aria-label="先前抽出的符文">
      {previous.map((item,index)=><motion.button className="rune-art-history-item" type="button"
        key={item.card.rune_id} onClick={()=>onSelect?.(item.card)}
        initial={reduced?false:{opacity:0,y:16}} animate={{opacity:1,y:0}}
        transition={{duration:.42,delay:Math.min(index,10)*.04}}
        aria-label={'查看第'+(index+1)+'枚 '+runeName(item.card)+'符文'}>
        <img src={runeImage(item.card)} alt="" loading="lazy" decoding="async"/>
        <span>{index+1} · {runeName(item.card)}</span>
      </motion.button>)}
    </div>:null}
    {last&&onBackgroundClick?<button type="button" className="rune-art-draw-again"
      onClick={()=>onBackgroundClick()}>召喚下一枚符文 <span aria-hidden="true">✦</span></button>:null}
  </div>;
}
export default function RuneArtStage({mode='groups',items=[],onSelect,onBackgroundClick}){
  const reduced=useReducedMotion();
  return <div className={'rune-art-world rune-art-world--'+mode}
    data-renderer="artwork-motion" data-visual-mode="2d">
    {mode==='draw'?<DrawStage items={items} onSelect={onSelect}
      onBackgroundClick={onBackgroundClick} reduced={reduced}/>:
      <Gallery mode={mode} items={items} onSelect={onSelect} reduced={reduced}/>}
  </div>;
}
