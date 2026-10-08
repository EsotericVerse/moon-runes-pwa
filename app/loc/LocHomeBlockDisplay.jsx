'use client';

import {SITE_IMAGES} from '../site-images';
import HeroCornerIdentity from './HeroCornerIdentity';
import authorHeroAsset from '../../pics/lo3rwang-hero.jpg';
import {childPresentation} from './block-presentation.mjs';
import {visibleHomeEntities} from './home-block-model.mjs';
import {stripLocHomeEditorPlaceholders} from './loc-home-text.mjs';
import {firstFrameImageUrl,heroImageMode,stripHeroImageTag} from './blocknote-image-url.mjs';

// Existing, approved site images only. New text frames have no image by default;
// images are not uploaded to, or stored by, the block editor.
const LOC_MEDIA=Object.freeze({
  1:{src:SITE_IMAGES.locHero,small:SITE_IMAGES.locHeroSmall,alt:'LOC 月典語言架構框架視覺理念圖',background:true},
  2:{src:SITE_IMAGES.lunarunes,alt:'LunaRunes 月之符文',position:'right',width:'420px'},
  3:{src:SITE_IMAGES.locArchitecture,alt:'LOC 月典架構：時間長河、玄子、玄裂與玄宇宙',position:'right',width:'360px'},
  6:{src:SITE_IMAGES.author,alt:'作者 Lucas Oscar Wang 政德',position:'right',width:'360px'}
});
const AUTHOR_MEDIA=Object.freeze({
  1:{src:authorHeroAsset,alt:'作者 Lucas Oscar Wang 政德首頁主視覺',background:true},
  5:{src:{src:'/pics/lo3rwang-3.png'},alt:'政德、玄鑒與符韻的三魂關係圖',position:'right',width:'420px'}
});

function imageFor(slot,scopeId='loc'){
  const assets=scopeId==='lo3rwang'?AUTHOR_MEDIA:LOC_MEDIA;
  return assets[Number(slot?.order)||0]||null;
}

export function locHomeBlockClass(slot,scopeId='loc'){
  const order=Number(slot?.order)||0;
  const media=imageFor(slot,scopeId);
  const hasCustomImage=Boolean(firstFrameImageUrl(slot));
  return [
    order===1?'loc-hero loc-home-hero':'loc-card',
    'loc-home-block',
    order===1?'loc-home-block--hero':'',
    order===1&&heroImageMode(slot)==='side'?'loc-home-block--hero-side':'',
    order!==1&&(media||hasCustomImage)?'loc-home-block--with-image loc-home-block--image-'+(media?.position||'right'):''
  ].filter(Boolean).join(' ');
}

function RichHtml({html,className='',stripImage=false}){
  const content=stripLocHomeEditorPlaceholders(stripImage?stripHeroImageTag(html):html||'');
  return content.trim()?<div className={className} dangerouslySetInnerHTML={{__html:content}}/>:null;
}

function SharedHomeBlockDisplay(slot,scopeId='loc'){
  const hero=Number(slot?.order)===1;
  const media=imageFor(slot,scopeId);
  const customImage=firstFrameImageUrl(slot);
  const children=visibleHomeEntities(slot).filter(entity=>!customImage||entity.title||
    stripHeroImageTag(entity.text).replace(/<[^>]*>/g,'').trim());
  const Heading=hero?'h1':'h2';
  return <>
    <header className="loc-home-block__header">
      {slot.eyebrow?<p className="loc-eyebrow">{slot.eyebrow}</p>:null}
      {slot.title?<Heading>{slot.title}</Heading>:null}
      <RichHtml html={slot.subtitle} stripImage={Boolean(customImage)} className="loc-subtitle loc-home-block__subtitle"/>
    </header>
    <RichHtml html={slot.text} stripImage={Boolean(customImage)} className="loc-home-block__body"/>
    {children.length?<div className="loc-home-block__children">
      {children.map((entity,index)=>{
        const card=childPresentation(entity.title)==='card';
        return <article className={'loc-home-block__child '+(card?'loc-home-block__child--card':'loc-home-block__child--bubble')}
          key={entity.uid||'child-'+index}>
          {card?<h3>{entity.title}</h3>:null}
          <RichHtml html={entity.text} stripImage={Boolean(customImage)} className="loc-home-block__child-copy"/>
        </article>;
      })}
    </div>:null}
    {(media||customImage)?(hero?<figure className="loc-home-block__media home-hero-visual" aria-label={media?.alt||'首頁主視覺'}>
      <picture>{!customImage&&media?.small?<source media="(max-width: 900px)" srcSet={media.small.src}/>:null}
        <img src={customImage||media?.src.src} width={customImage?undefined:media?.src.width} height={customImage?undefined:media?.src.height}
          alt="" aria-hidden="true" loading="lazy" decoding="async"/></picture>
    </figure>:<article className="loc-home-block__media loc-home-block__media-bubble loc-bubble"
      style={media?.width?{'--loc-home-media-max':media.width}:undefined}>
      <img src={customImage||media?.src.src}
        width={customImage?undefined:media?.src.width} height={customImage?undefined:media?.src.height}
        alt={media?.alt||'文字框架圖片'} loading="lazy" decoding="async"/>
    </article>):null}
    {hero?<HeroCornerIdentity scopeId={scopeId}/>:null}
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
