'use client';

import ScopeEditableBlocks from './ScopeEditableBlocks';
import {stripLocHomeEditorPlaceholders} from './loc-home-text.mjs';
import {childPresentation} from './block-presentation.mjs';
import {splitStatusContentSections} from './loc-status-sections.mjs';

function stripOuterParagraph(html=''){
  const value=stripLocHomeEditorPlaceholders(html).trim();
  const match=value.match(/^<p[^>]*>([\s\S]*)<\/p>$/i);
  return match?match[1]:value;
}

function paragraphParts(html=''){
  const value=stripLocHomeEditorPlaceholders(html);
  const parts=[];
  const re=/<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while((match=re.exec(value)))parts.push(match[1]);
  return parts.length?parts:[value];
}

function Html({html,className='',tag='div'}){
  const cleaned=stripLocHomeEditorPlaceholders(html);
  if(!cleaned)return null;
  const Tag=tag;
  return <Tag className={className||undefined} dangerouslySetInnerHTML={{__html:cleaned}}/>;
}

function entityAt(slot,index){
  return slot?.entities?.[index]||{title:'',text:''};
}

function HeroDisplay(slot){
  const english=entityAt(slot,0);
  const explain=entityAt(slot,1);
  const description=entityAt(slot,2);
  return <>
    <Html tag="p" className="loc-eyebrow" html={slot.eyebrow||stripOuterParagraph(english.text)||english.title}/>
    <div className="home-title-row">
      <h1>{slot.title}</h1>
      <Html className="loc-subtitle" html={slot.subtitle||explain.text}/>
    </div>
    <Html className="loc-hero-copy" html={slot.text||description.text}/>
  </>;
}

function BeginnerHeading(slot){
  const meta=entityAt(slot,0);
  return <>
    <p className="loc-eyebrow">{slot.eyebrow||meta.title||'Start here'}</p>
    <h2>{slot.title}</h2>
    <Html className="loc-subtitle" html={slot.subtitle||meta.text}/>
  </>;
}

function ArchitectureHeading(slot){
  const meta=entityAt(slot,0);
  return <>
    <p className="loc-eyebrow">{slot.eyebrow||meta.title||'LOC Architecture'}</p>
    <h2>{slot.title}</h2>
    {slot.subtitle?<Html className="loc-subtitle" html={slot.subtitle}/>:null}
  </>;
}

function StatusHeading(slot){
  return <>
    <p className="loc-eyebrow">{slot.eyebrow||'System Status'}</p>
    <h2>{slot.title}</h2>
    <Html className="loc-subtitle" html={slot.subtitle||slot.text}/>
  </>;
}

function StatusBubbles(slot){
  // The authored main status text is stored in block_text, not block_entity.
  // Preserve every rich-text heading/paragraph inside the original framed cards.
  const sections=splitStatusContentSections(slot.text);
  const titled=(slot.entities||[]).filter(entity=>childPresentation(entity.title)==='card');
  const bubbles=(slot.entities||[]).filter(entity=>
    childPresentation(entity.title)==='bubble'&&String(entity.text||'').trim()
  );
  return <>
    {sections.length||titled.length?<div className="home-progress-grid home-status-frames">
      {sections.map(section=><article className="home-progress-item home-status-card" key={section.key}>
        <Html className="home-status-rich-text" html={section.html}/>
      </article>)}
      {titled.map(entity=><article className="home-progress-item home-status-card" key={entity.uid}>
        <h3>{entity.title}</h3>
        <Html className="home-status-rich-text" html={entity.text}/>
      </article>)}
    </div>:null}
    {bubbles.length?<div className="home-draw-bubbles home-status-bubbles">
      {bubbles.map(entity=><div className="loc-bubble" key={entity.uid}>
        <Html html={entity.text}/>
      </div>)}
    </div>:null}
  </>;
}

function SkillsHeading(slot){
  const parts=paragraphParts(slot.text);
  return <>
    <p className="loc-eyebrow">{slot.eyebrow||'LOC GPT Skills'}</p>
    <h2>{slot.title}</h2>
    <Html className="loc-subtitle" html={slot.subtitle||(parts[0]?`<p>${parts[0]}</p>`:'')}/>
  </>;
}

function SkillsBody(slot){
  const parts=paragraphParts(slot.text);
  return <>
    {slot.entities.map(entity=><p key={entity.uid}>
      <strong>{entity.title}</strong>：
      <span dangerouslySetInnerHTML={{__html:stripOuterParagraph(entity.text)}}/>
    </p>)}
    {parts.map((part,index)=><Html tag="p" html={part} key={'skill-body-'+index}/>)}
  </>;
}

function AuthorHeading(slot){
  const parts=paragraphParts(slot.text);
  return <>
    <p className="loc-eyebrow">{slot.eyebrow||'About me'}</p>
    <h2>{slot.title}</h2>
    <Html className="loc-subtitle" html={slot.subtitle||(parts[0]?`<p>${parts[0]}</p>`:'')}/>
  </>;
}

function AuthorBody(slot){
  const parts=paragraphParts(slot.text);
  return <>
    {parts.map((part,index)=><Html tag="p" html={part} key={'author-body-'+index}/>)}
  </>;
}

function BodyDisplay(slot){
  return <Html html={slot.text}/>;
}

const CONFIG={
  hero:{render:HeroDisplay,slotClassName:'loc-home-hero-copy'},
  beginnerHeading:{render:BeginnerHeading,slotClassName:'home-section-heading'},
  architectureHeading:{render:ArchitectureHeading,slotClassName:'home-section-heading'},
  statusHeading:{render:StatusHeading,slotClassName:'home-section-heading'},
  statusBubbles:{render:StatusBubbles,slotClassName:'home-status-content'},
  skillsHeading:{render:SkillsHeading,slotClassName:'home-section-heading'},
  skillsBody:{render:SkillsBody,slotClassName:'home-author-copy'},
  authorHeading:{render:AuthorHeading,slotClassName:'home-section-heading'},
  authorBody:{render:AuthorBody,slotClassName:'home-author-copy'},
  body:{render:BodyDisplay,slotClassName:'home-author-copy'}
};

export default function LocHomeEditableBlock({order,variant}){
  const config=CONFIG[variant]||CONFIG.body;
  return <ScopeEditableBlocks
    scopeId="loc"
    allowEditing={true}
    page="index"
    orders={[order]}
    slotClassName={config.slotClassName}
    editSlotClassName="loc-card"
    renderDisplay={config.render}
  />;
}
