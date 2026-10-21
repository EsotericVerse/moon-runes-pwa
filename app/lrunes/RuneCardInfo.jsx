'use client';
import {useState} from 'react';
import dynamic from 'next/dynamic';
import {runeGlyphProfile} from './effekseer/rune-glyph-library.mjs';

// The existing 3D-extruded-glyph module (Rune3DLibrary's own fallback path)
// already renders "just the rune's single Chinese character, large" when its
// WebGL layer can't mount -- that's exactly what a missing/offline image
// needs here too, so this reuses it instead of inventing a second, plainer
// text fallback. Loaded only when an <img> actually fails, not on every
// mount: this is a heavier client/WebGL component (see Rune3DLibrary.jsx's
// own dynamic-import use of it).
const RuneExtrudedGlyph=dynamic(()=>import('./effekseer/RuneExtrudedGlyph'),{ssr:false,loading:()=>null});

// Two fixed, separate display modes by context -- never a fallback chain
// between them:
//  - the Rune Directory/gallery (layout="profile") is always the published
//    photo art (now a loc.lo3rwang.cc URL -- see rune-directory.mjs); if
//    that fails to load it falls back to plain text, never the 3D glyph.
//  - the draw/ritual screens (layout="draw"/"home", via glyphFirst) always
//    show this 3D-extruded glyph; the flat image is only the lighter-weight
//    option when WebGL can't run on that phone, not what the gallery shows.
// `card` drives the glyph (word + runeGlyphProfile). Group-concept images
// (one per 9 groups, not one per rune) have no single rune to extrude, so
// those callers pass `fallbackText` (the group name) and are always the
// plain-text-on-error image mode regardless of `glyphFirst`.
export function RuneImage({src,alt,className,card,fallbackText,glyphFirst=false,...imgProps}){
  const [imageFailed,setImageFailed]=useState(false);
  if(glyphFirst&&card){
    const word=text(card.rune_name).replace(/之符文$/,'').slice(0,1);
    // RuneExtrudedGlyph already degrades to its own 2D text span internally
    // when WebGL can't mount (see rune-glyph-solid.mjs's try/catch) -- that
    // is the "phone can't run it" lighter-weight path, not a reason to swap
    // to the image here too.
    if(word){
      const profile=runeGlyphProfile(card);
      return <span className={className} role="img" aria-label={alt}
        data-glyph-family={profile.family} data-glyph-finish={profile.finish}
        style={{'--rune-ink':profile.ink}}>
        <RuneExtrudedGlyph word={word} profile={profile}/>
      </span>;
    }
  }
  if(src&&!imageFailed)return <img className={className} src={src} alt={alt} onError={()=>setImageFailed(true)} {...imgProps}/>;
  return <span className={className} role="img" aria-label={alt}>{fallbackText||alt}</span>;
}

const MOON_PHASE_LABELS=Object.freeze({1:'新月',2:'上弦',3:'滿月',4:'下弦'});
const CARD_ATTR_LABELS=Object.freeze({1:'正面',2:'中平',3:'負面',4:'未知'});

function text(value){
  return String(value??'')
    .replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16)))
    .replace(/&#([0-9]+);/g,(_,decimal)=>String.fromCodePoint(parseInt(decimal,10)))
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").trim();
}
function runeTitle(card){
  const name=text(card?.rune_name).replace(/之符文$/,'');
  return name?name+'之符文':'符文';
}

export default function RuneCardInfo({
  card,
  imageSrc,
  imageClassName='loc-rune-card-image',
  onOpen,
  openLabel='',
  positionLabel='',
  direction='',
  realMoonPhase='',
  className='loc-context-item compact loc-draw-card',
  dataRuneId,
  dataDrawPosition,
  layout='draw',
  expandKeywords=false
}){
  if(!card)return null;
  const description=text(card.rune_description);
  const archetype=text(card.archetype);
  const glyph=text(card.totem);
  const english=text(card.english_name);
  const group=text(card.group_name)||'—';
  const cardAttr=CARD_ATTR_LABELS[Number(card.card_attr)]||'—';
  const cardMoon=MOON_PHASE_LABELS[Number(card.moon_phase)]||'無';
  const positive=text(card.positive_keywords)||'—';
  const negative=text(card.negative_keywords)||'—';

  if(layout==='home'){
    return <div className="home-rune-preview" data-rune-id={dataRuneId??card.rune_id}>
      {positionLabel?<p className="loc-eyebrow">{positionLabel}</p>:null}
      {onOpen?<button type="button" className="rune-gallery-image-open"
        onClick={onOpen} aria-label={openLabel||'查看'+runeTitle(card)}>
        <RuneImage className={imageClassName} src={imageSrc} alt={runeTitle(card)} card={card}/>
      </button>:<RuneImage className={imageClassName} src={imageSrc} alt={runeTitle(card)} card={card}/>}
      <div className="home-rune-card-data">
        <div className="home-rune-card-title">
          <strong>{runeTitle(card)}</strong>
          {glyph?<span className="home-rune-glyph">{glyph}</span>:null}
          {english?<span>({english})</span>:null}
        </div>
        <p>{description||'—'}{archetype?' / '+archetype:''}</p>
        {expandKeywords?<div className="home-rune-keywords rune-card-keywords-expanded">
          <strong>關鍵詞</strong>
          <p>正面：{positive}</p>
          <p>負面：{negative}</p>
        </div>:<details className="home-rune-keywords">
          <summary>關鍵詞（點擊展開）</summary>
          <p>正面：{positive}</p>
          <p>負面：{negative}</p>
        </details>}
        <p>所屬分組：{group} / 卡片屬性：{cardAttr}</p>
        <p>卡片月相：{cardMoon}{realMoonPhase?' / 真實月相：'+realMoonPhase:''}</p>
        {direction?<p className="home-rune-direction">卡片面向：<strong>{direction}</strong></p>:null}
      </div>
    </div>;
  }

  if(layout==='profile'){
    return <>
      <div className="runes-rune-profile">
        <RuneImage className={imageClassName} src={imageSrc} alt={runeTitle(card)} card={card}/>
        <div className="runes-rune-profile-copy">
          <h2>{String(Number(card.rune_id)).padStart(2,'0')} · {runeTitle(card)}{glyph?' '+glyph:''}{english?' ('+english+')':''}</h2>
          <p>{description||'—'}{archetype?' / '+archetype:''}</p>
        </div>
      </div>
      <div className="runes-rune-detail-grid">
        <span><strong>正向關鍵詞</strong>{positive}</span>
        <span><strong>反向關鍵詞</strong>{negative}</span>
        <span><strong>所屬分組</strong>{group}</span>
        <span><strong>卡片屬性</strong>{cardAttr}</span>
        <span><strong>卡片月相</strong>{cardMoon}</span>
        {realMoonPhase?<span><strong>真實月相</strong>{realMoonPhase}</span>:null}
        {direction?<span><strong>卡片面向</strong>{direction}</span>:null}
      </div>
    </>;
  }

  return <article
    className={className}
    data-rune-id={dataRuneId??card.rune_id}
    data-draw-position={dataDrawPosition||undefined}
  >
    {positionLabel?<small>{positionLabel}</small>:null}
    <RuneImage className={imageClassName} src={imageSrc} alt={runeTitle(card)} card={card}/>
    <b>{runeTitle(card)}{glyph?' '+glyph:''}{english?' ('+english+')':''}</b>
    <span>{description||'—'}{archetype?' / '+archetype:''}</span>
    <div className="runes-draw-keywords">
      <span><strong>正向關鍵詞</strong>{positive}</span>
      <span><strong>反向關鍵詞</strong>{negative}</span>
    </div>
    <span>所屬分組：{group} / 卡片屬性：{cardAttr}</span>
    <span>卡片月相：{cardMoon}{realMoonPhase?' / 真實月相：'+realMoonPhase:''}</span>
    {direction?<span>卡片面向：<strong>{direction}</strong></span>:null}
  </article>;
}
