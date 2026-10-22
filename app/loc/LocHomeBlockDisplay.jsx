'use client';

import {SITE_IMAGES} from '../site-images';
import authorHeroAsset from '../../pics/lo3rwang-hero.jpg';
import authorHeroSmallAsset from '../../pics/lo3rwang-hero_s.webp';
import runesHeroAsset from '../../pics/LunaRunes-hero.jpg';
import runesHeroSmallAsset from '../../pics/LunaRunes-hero_s.webp';
import {HomeBlock} from './home-block-model';

import {BlockNoteContent} from './blocknote-content.mjs';

// Existing, approved site images only. New text frames have no image by default;
// images are not uploaded to, or stored by, the block editor.
const LOC_MEDIA=Object.freeze({
  1:{src:SITE_IMAGES.locHero,small:SITE_IMAGES.locHeroSmall,alt:'LOC 月典語言架構框架視覺理念圖',background:true},
  2:{src:SITE_IMAGES.lunarunes,alt:'LunaRunes 月之符文',position:'right',width:'420px'},
  3:{src:SITE_IMAGES.locArchitecture,alt:'LOC 月典架構：時間長河、玄子、玄裂與玄宇宙',position:'right',width:'360px'},
  5:{src:SITE_IMAGES.author,alt:'作者 Lucas Oscar Wang 政德',position:'right',width:'360px'}
});
const AUTHOR_MEDIA=Object.freeze({
  1:{src:authorHeroAsset,small:authorHeroSmallAsset,alt:'作者 Lucas Oscar Wang 政德首頁主視覺',background:true},
  5:{src:{src:'/pics/lo3rwang-3.webp'},alt:'政德、玄鑒與符韻的三魂關係圖',position:'right',width:'420px'}
});

const RUNES_MEDIA=Object.freeze({
  1:{src:runesHeroAsset,small:runesHeroSmallAsset,alt:'月之符文首頁主視覺',background:true}
});

function imageFor(slot,scopeId='loc'){
  const assets=scopeId==='lo3rwang'?AUTHOR_MEDIA:scopeId==='lrunes'?RUNES_MEDIA:LOC_MEDIA;
  return assets[Number(slot?.order)||0]||null;
}

export function resolveHomeImage(slot,scopeId='loc'){
  const preset=imageFor(slot,scopeId);
  const config=slot?.image&&typeof slot.image==='object'?slot.image:null;
  const embedded=BlockNoteContent.image.firstFrameImageUrl(slot);
  const picked=['default','custom','none'].includes(config?.source)
    ?config.source:(embedded?'custom':preset?'default':'none');
  // The home hero always shows an image: "none" is no longer offered, and a
  // previously stored "none" falls back to the default.
  const source=Number(slot?.order)===1&&picked==='none'&&preset?'default':picked;
  const customUrl=BlockNoteContent.image.normalizeImageSource(config?.url||embedded);
  const src=source==='none'?'':source==='default'?preset?.src?.src||'':customUrl;
  const position=Number(slot?.order)===1?'right':['left','right','top','bottom'].includes(config?.position)
    ?config.position:(preset?.position||'right');
  const width=Number.isFinite(Number(config?.width))&&Number(config?.width)>=160&&Number(config?.width)<=680
    ?Math.round(Number(config.width)):parseInt(preset?.width,10)||420;
  const mode=config?.mode==='side'||config?.mode==='background'?config.mode:BlockNoteContent.image.heroImageMode(slot);
  return {src,source,position,width,mode,preset,embedded,customUrl,
    alt:source==='default'?preset?.alt||'框架圖片':'框架圖片',
    small:source==='default'?preset?.small:null};
}

export function locHomeBlockClass(slot,scopeId='loc'){
  const order=Number(slot?.order)||0;
  const image=resolveHomeImage(slot,scopeId);
  return [
    order===1?'loc-hero loc-home-hero':'loc-card',
    'loc-home-block',
    order===1?'loc-home-block--hero':'',
    order===1&&image.mode==='side'?'loc-home-block--hero-side':'',
    order===1&&image.mode==='side'?'loc-home-block--image-'+(image.position==='left'?'left':'right'):'',
    order!==1&&image.src?'loc-home-block--with-image loc-home-block--image-'+image.position:''
  ].filter(Boolean).join(' ');
}

function RichHtml({html,className='',stripImage=false}){
  const content=HomeBlock.stripLocHomeEditorPlaceholders(stripImage?BlockNoteContent.image.stripHeroImageTag(html):html||'');
  return content.trim()?<div className={className} dangerouslySetInnerHTML={{__html:content}}/>:null;
}

function SharedHomeBlockDisplay(slot,scopeId='loc'){
  const hero=Number(slot?.order)===1;
  const sign=hero?HomeBlock.heroExtraFor(scopeId):null;
  const image=resolveHomeImage(slot,scopeId);
  const children=HomeBlock.visibleEntities(slot).filter(entity=>entity.title||
    BlockNoteContent.image.stripHeroImageTag(entity.text).replace(/<[^>]*>/g,'').trim());
  const Heading=hero?'h1':'h2';
  return <>
    <header className="loc-home-block__header">
      {slot.eyebrow?<p className="loc-eyebrow">{slot.eyebrow}</p>:null}
      {slot.title?<Heading>{slot.title}</Heading>:null}
      {slot.subtitle?<p className="loc-subtitle loc-home-block__subtitle">{HomeBlock.plainBlockLine(slot.subtitle)}</p>:null}
    </header>
    <RichHtml html={slot.text} stripImage className="loc-home-block__body"/>
    {children.length?<div className="loc-home-block__children">
      {children.map((entity,index)=>{
        const card=HomeBlock.childPresentation(entity.title)==='card';
        return <article className={'loc-home-block__child '+(card?'loc-home-block__child--card':'loc-home-block__child--bubble')}
          key={entity.uid||'child-'+index}>
          {card?<h3>{entity.title}</h3>:null}
          <RichHtml html={entity.text} stripImage className="loc-home-block__child-copy"/>
        </article>;
      })}
    </div>:null}
    {image.src?(hero?<figure className="loc-home-block__media home-hero-visual" aria-label={image.alt}>
      <picture>{image.small?<source media="(max-width: 760px)" srcSet={image.small.src}/>:null}
        <img src={image.src} alt="" aria-hidden="true" loading="lazy" decoding="async"/></picture>
    </figure>:<article className="loc-home-block__media loc-home-block__media-bubble loc-bubble"
      style={{'--loc-home-media-max':image.width+'px'}}>
      <img src={image.src} alt={image.alt} loading="lazy" decoding="async"/>
    </article>):null}
    {sign?<span className={'home-hero-identity home-hero-identity--'+sign.key}
      role="img" aria-label={sign.label}>{sign.text}</span>:null}
  </>;
}

/* LOC and Author use exactly the same home frame renderer and DOM hierarchy.
   Only preset images, block contents and scope editing permissions differ. */
export default function LocHomeBlockDisplay(slot){
  return SharedHomeBlockDisplay(slot,'loc');
}

export function AuthorHomeBlockDisplay(slot){
  return SharedHomeBlockDisplay(slot,'lo3rwang');
}

export function authorHomeBlockClass(slot){
  return locHomeBlockClass(slot,'lo3rwang');
}
