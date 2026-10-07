'use client';

import ScopeEditableBlocks from './ScopeEditableBlocks';

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

function Html({html,className='',tag='div'}){
  if(!html)return null;
  const Tag=tag;
  return <Tag className={className||undefined} dangerouslySetInnerHTML={{__html:html}}/>;
}

function entityAt(slot,index){
  return slot?.entities?.[index]||{uid:'entity-'+index,title:'',text:''};
}

function HeroDisplay(slot){
  const english=entityAt(slot,0);
  const role=entityAt(slot,1);
  return <>
    <Html tag="p" className="loc-eyebrow" html={stripOuterParagraph(english.text)||english.title}/>
    <div className="home-title-row">
      <h1>{slot.title}</h1>
      <Html tag="p" className="loc-subtitle" html={stripOuterParagraph(role.text)}/>
    </div>
    {paragraphParts(slot.text).map((part,index)=><Html tag="p" html={part} key={'hero-'+index}/>)}
  </>;
}

function AboutDisplay(slot){
  const primary=slot.entities.slice(0,4);
  const side=slot.entities.slice(4,6);
  return <>
    <p className="loc-eyebrow">About</p>
    <h2>{slot.title}</h2>
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
    <p className="loc-eyebrow">Professional</p>
    <h2>{slot.title}</h2>
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
  </>;
}

function SystemsDisplay(slot){
  return <>
    <p className="loc-eyebrow">Systems</p>
    <h2>{slot.title}</h2>
    <div className="author-system-grid">
      {slot.entities.map(entity=><article className="author-editorial-block" key={entity.uid}>
        <h3>{entity.title}</h3>
        <Html html={entity.text}/>
      </article>)}
    </div>
  </>;
}

function SoulsDisplay(slot){
  return <>
    <p className="loc-eyebrow">Three Souls</p>
    <h2>{slot.title}</h2>
    <div className="author-trinity-layout">
      <figure className="home-architecture-figure author-trinity-figure">
        <img src="/pics/lo3rwang-3.png" alt="Oscar 政德、玄鑒 Lucas、符韻 Rune，以及柏隆 Bruno、睿汶 Raven 的關係圖" loading="lazy"/>
      </figure>
      <div className="author-trinity-copy">
        {slot.entities.map((entity,index)=><article
          className={'loc-bubble'+(index===0?' author-trinity-core':'')}
          key={entity.uid}
        >
          <h3>{entity.title}</h3>
          <Html html={entity.text}/>
        </article>)}
        <Html className="author-trinity-note" html={slot.text}/>
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
    <p className="loc-eyebrow">Contact</p>
    <h2>{slot.title}</h2>
    <div className="author-contact-layout">
      <div>
        <Html tag="p" html={parts[0]||''}/>
        {email?<p><a href={email.href}>{email.label}</a></p>:null}
      </div>
      <div className="author-official-links">
        {official.map(link=><a href={link.href} target="_blank" rel="noopener noreferrer" key={link.href}>{link.label}</a>)}
      </div>
    </div>
  </>;
}

const CONFIG={
  hero:{render:HeroDisplay,slotClassName:'author-home-hero-copy'},
  about:{render:AboutDisplay,slotClassName:'author-home-display-block'},
  professional:{render:ProfessionalDisplay,slotClassName:'author-home-display-block'},
  systems:{render:SystemsDisplay,slotClassName:'author-home-display-block'},
  souls:{render:SoulsDisplay,slotClassName:'author-home-display-block'},
  contact:{render:ContactDisplay,slotClassName:'author-home-display-block'}
};

export default function AuthorHomeEditableBlock({order,variant}){
  const config=CONFIG[variant]||CONFIG.about;
  return <ScopeEditableBlocks
    scopeId="lo3rwang"
    page="index"
    orders={[order]}
    slotClassName={config.slotClassName}
    editSlotClassName="loc-card"
    renderDisplay={config.render}
  />;
}
