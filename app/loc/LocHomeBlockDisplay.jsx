'use client';

import {SITE_IMAGES} from '../site-images';
import {childPresentation} from './block-presentation.mjs';
import {visibleHomeEntities} from './home-block-model.mjs';
import {stripLocHomeEditorPlaceholders} from './loc-home-text.mjs';

// Existing, approved site images only. New text frames have no image by default;
// images are not uploaded to, or stored by, the block editor.
const HOME_MEDIA=Object.freeze({
  1:{src:SITE_IMAGES.locHero,small:SITE_IMAGES.locHeroSmall,alt:'LOC 月典語言架構框架視覺理念圖',background:true},
  2:{src:SITE_IMAGES.lunarunes,alt:'LunaRunes 月之符文',position:'right',width:'420px'},
  3:{src:SITE_IMAGES.locArchitecture,alt:'LOC 月典架構：時間長河、玄子、玄裂與玄宇宙',position:'right',width:'360px'},
  6:{src:SITE_IMAGES.author,alt:'作者 Lucas Oscar Wang 政德',position:'right',width:'360px'}
});

export function locHomeBlockClass(slot){
  const order=Number(slot?.order)||0;
  const media=HOME_MEDIA[order];
  return [
    order===1?'loc-hero loc-home-hero':'loc-card',
    'loc-home-block',
    order===1?'loc-home-block--hero':'',
    media&&!media.background?'loc-home-block--with-image loc-home-block--image-'+(media.position||'right'):''
  ].filter(Boolean).join(' ');
}

function RichHtml({html,className=''}){
  const content=stripLocHomeEditorPlaceholders(html||'');
  return content.trim()?<div className={className} dangerouslySetInnerHTML={{__html:content}}/>:null;
}

export default function LocHomeBlockDisplay(slot){
  const hero=Number(slot?.order)===1;
  const media=HOME_MEDIA[Number(slot?.order)];
  const children=visibleHomeEntities(slot);
  const Heading=hero?'h1':'h2';
  return <>
    <header className="loc-home-block__header">
      {slot.eyebrow?<p className="loc-eyebrow">{slot.eyebrow}</p>:null}
      {slot.title?<Heading>{slot.title}</Heading>:null}
      <RichHtml html={slot.subtitle} className="loc-subtitle loc-home-block__subtitle"/>
    </header>
    <RichHtml html={slot.text} className="loc-home-block__body"/>
    {children.length?<div className="loc-home-block__children">
      {children.map((entity,index)=>{
        const card=childPresentation(entity.title)==='card';
        return <article className={'loc-home-block__child '+(card?'loc-home-block__child--card':'loc-home-block__child--bubble')}
          key={entity.uid||'child-'+index}>
          {card?<h3>{entity.title}</h3>:null}
          <RichHtml html={entity.text} className="loc-home-block__child-copy"/>
        </article>;
      })}
    </div>:null}
    {media?(hero?<figure className="loc-home-block__media home-hero-visual" aria-label={media.alt}>
      <picture><source media="(max-width: 900px)" srcSet={media.small.src}/>
        <img src={media.src.src} width={media.src.width} height={media.src.height}
          alt="" aria-hidden="true" loading="eager" decoding="async"/></picture>
    </figure>:<article className="loc-home-block__media loc-home-block__media-bubble loc-bubble"
      style={media.width?{'--loc-home-media-max':media.width}:undefined}>
      <img src={media.src.src} width={media.src.width} height={media.src.height}
        alt={media.alt} loading="lazy" decoding="async"/>
    </article>):null}
  </>;
}
