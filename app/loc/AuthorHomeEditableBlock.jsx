'use client';

import ScopeEditableBlocks from './ScopeEditableBlocks';
import authorHeroAsset from '../../pics/lo3rwang-hero.jpg';
import {firstFrameImageUrl,heroImageMode,stripHeroImageTag} from './blocknote-image-url.mjs';

function stripOuterParagraph(html=''){
  const value=String(html||'').trim();
  const match=value.match(/^<p[^>]*>([\s\S]*)<\/p>$/i);
  return match?match[1]:value;
}

function paragraphParts(html=''){
  const value=String(html||'');
  const parts=[];
  const re=/<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while((match=re.exec(value)))parts.push(match[1]);
  return parts.length?parts:[value];
}

function extractLinks(html=''){
  const out=[];
  const re=/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while((match=re.exec(String(html||'')))){
    out.push({href:match[1],label:String(match[2]||'').replace(/<[^>]+>/g,'').trim()});
  }
  return out;
}

function Html({html,className='',tag='div',stripImage=false}){
  const content=stripImage?stripHeroImageTag(html):html;
  if(!content)return null;
  const Tag=tag;
  return <Tag className={className||undefined} dangerouslySetInnerHTML={{__html:content}}/>;
}

function entityAt(slot,index){
  return slot?.entities?.[index]||{uid:'entity-'+index,title:'',text:''};
}

function HeroDisplay(slot){
  const english=entityAt(slot,0);
  const role=entityAt(slot,1);
  const image=firstFrameImageUrl(slot)||authorHeroAsset.src;
  return <>
    <img className="author-home-hero-image" src={image}
      alt="" aria-hidden="true" loading="eager" fetchPriority="high" decoding="async"/>
    <div className="author-home-hero-overlay" aria-hidden="true"/>
    <div className="author-home-hero-copy">
      <Html tag="p" className="loc-eyebrow" html={slot.eyebrow||stripOuterParagraph(english.text)||english.title} stripImage/>
      <div className="home-title-row">
        <h1 id="top">{slot.title}</h1>
        <Html className="loc-subtitle" html={slot.subtitle||role.text} stripImage/>
      </div>
      {paragraphParts(slot.text).map((part,index)=><Html tag="p" html={part} stripImage key={'hero-'+index}/>)}
    </div>
  </>;
}

function AboutDisplay(slot){
  const primary=slot.entities.slice(0,4);
  const side=slot.entities.slice(4,6);
  return <>
    <p className="loc-eyebrow">{slot.eyebrow||'About'}</p>
    {slot.subtitle?<Html className="loc-subtitle scope-block-subtitle" html={slot.subtitle}/>:null}
    <h2 id="about">{slot.title}</h2>
    {firstFrameImageUrl({text:slot.text})?<Html html={slot.text} className="loc-bubble author-inline-image-bubble"/>:null}
    <div className="author-about-grid">
      <div className="author-about-primary">
        {primary.map(entity=><article className="author-editorial-block" key={entity.uid}>
          {entity.title?<h3>{entity.title}</h3>:null}
          <Html html={entity.text}/>
        </article>)}
      </div>
      <aside className="author-about-side">
        {side.map(entity=><div key={entity.uid}>
          {entity.title?<h3>{entity.title}</h3>:null}
          <Html html={entity.text}/>
        </div>)}
      </aside>
    </div>
  </>;
}

function ProfessionalDisplay(slot){
  const roles=slot.entities.slice(0,3);
  const work=slot.entities.slice(3,5);
  return <>
    <p className="loc-eyebrow">{slot.eyebrow||'Professional'}</p>
    {slot.subtitle?<Html className="loc-subtitle scope-block-subtitle" html={slot.subtitle}/>:null}
    <h2 id="professional">{slot.title}</h2>
    <Html className="author-section-lead" html={slot.text}/>
    <div className="author-role-grid">
      {roles.map(entity=><article className="author-editorial-block" key={entity.uid}>
        <h3>{entity.title}</h3>
        <Html html={entity.text}/>
      </article>)}
    </div>
    <div className="author-professional-grid">
      {work.map(entity=><article className="author-editorial-block" key={entity.uid}>
        <h3>{entity.title}</h3>
        <Html html={entity.text}/>
      </article>)}
    </div>
    {slot.entities.slice(5).map(entity=><article className="loc-bubble author-inline-image-bubble" key={entity.uid}>
      {entity.title?<h3>{entity.title}</h3>:null}
      <Html html={entity.text}/>
    </article>)}
  </>;
}

function SystemsDisplay(slot){
  return <>
    <p className="loc-eyebrow">{slot.eyebrow||'Systems'}</p>
    {slot.subtitle?<Html className="loc-subtitle scope-block-subtitle" html={slot.subtitle}/>:null}
    <h2 id="systems">{slot.title}</h2>
    <div className="author-system-grid">
      {slot.entities.map(entity=><article className="author-editorial-block" key={entity.uid}>
        <h3>{entity.title}</h3>
        <Html html={entity.text}/>
      </article>)}
    </div>
  </>;
}

function SoulsDisplay(slot){
  const image=firstFrameImageUrl(slot);
  return <>
    <p className="loc-eyebrow">{slot.eyebrow||'Three Souls'}</p>
    {slot.subtitle?<Html className="loc-subtitle scope-block-subtitle" html={slot.subtitle}/>:null}
    <h2 id="three-souls">{slot.title}</h2>
    <div className="author-trinity-layout">
      <article className="loc-bubble author-trinity-figure author-image-bubble">
        <img src={image||'/pics/lo3rwang-3.png'} alt="Oscar 政德、玄鑒 Lucas、符韻 Rune，以及柏隆 Bruno、睿汶 Raven 的關係圖" loading="lazy"/>
      </article>
      <div className="author-trinity-copy">
        {slot.entities.filter(entity=>entity.title||stripHeroImageTag(entity.text).replace(/<[^>]+>/g,'').trim()).map((entity,index)=><article
          className={'loc-bubble'+(index===0?' author-trinity-core':'')}
          key={entity.uid}
        >
          {entity.title?<h3>{entity.title}</h3>:null}
          <Html html={entity.text} stripImage={Boolean(image)}/>
        </article>)}
        <Html className="author-trinity-note" html={slot.text} stripImage={Boolean(image)}/>
      </div>
    </div>
  </>;
}

function ContactDisplay(slot){
  const parts=paragraphParts(slot.text);
  const links=extractLinks(slot.text);
  const email=links.find(link=>link.href.startsWith('mailto:'));
  const official=links.filter(link=>!link.href.startsWith('mailto:'));
  return <>
    <p className="loc-eyebrow">{slot.eyebrow||'Contact'}</p>
    {slot.subtitle?<Html className="loc-subtitle scope-block-subtitle" html={slot.subtitle}/>:null}
    <h2 id="contact">{slot.title}</h2>
    <div className="author-contact-layout">
      <div>
        <Html tag="p" html={parts[0]||''}/>
        {email?<p><a href={email.href}>{email.label}</a></p>:null}
      </div>
      <div className="author-official-links">
        {official.map(link=><a href={link.href} target="_blank" rel="noopener noreferrer" key={link.href}>{link.label}</a>)}
      </div>
    </div>
    {firstFrameImageUrl(slot)?<article className="loc-bubble author-inline-image-bubble">
      <img src={firstFrameImageUrl(slot)} alt="" loading="lazy"/>
    </article>:null}
  </>;
}

const DISPLAY_BY_ORDER=Object.freeze({
  1:HeroDisplay,
  2:AboutDisplay,
  3:ProfessionalDisplay,
  4:SystemsDisplay,
  5:SoulsDisplay,
  6:ContactDisplay
});

function GenericDisplay(slot){
  return <>
    {slot.eyebrow?<p className="loc-eyebrow">{slot.eyebrow}</p>:null}
    {slot.title?<h2>{slot.title}</h2>:null}
    <Html html={slot.subtitle} className="loc-subtitle"/>
    <Html html={slot.text} className="scope-rich-surface"/>
    {slot.entities.map(entity=><article className="author-editorial-block" key={entity.uid}>
      {entity.title?<h3>{entity.title}</h3>:null}
      <Html html={entity.text}/>
    </article>)}
  </>;
}

function AuthorDisplay(slot){
  const display=DISPLAY_BY_ORDER[slot.order]||GenericDisplay;
  return display(slot);
}

function authorBlockClass(slot){
  return slot.order===1?('loc-hero author-home-hero'+(heroImageMode(slot)==='side'?' author-home-hero--side':'')):'loc-card scope-home-section';
}

// One read, one native frame per DB block. Clicking a public frame opens the
// existing shared BlockNote editor only for authorized Scope managers.
export default function AuthorHomeEditableBlocks(){
  return <ScopeEditableBlocks
    scopeId="lo3rwang"
    page="index"
    allowEditing
    containerless
    maxBlocks={8}
    placeholderFirstOrder={1}
    headingLevel={2}
    renderDisplay={AuthorDisplay}
    resolveSlotClassName={authorBlockClass}
    editSlotClassName="loc-card scope-home-section"
  />;
}
