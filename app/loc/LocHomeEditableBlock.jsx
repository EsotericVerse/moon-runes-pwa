'use client';

import ScopeEditableBlocks from './ScopeEditableBlocks';
import {stripLocHomeEditorPlaceholders} from './loc-home-text.mjs';
import {childPresentation} from './block-presentation.mjs';
import {splitStatusContentSections} from './loc-status-sections.mjs';
import {orderedHomeFields,visibleHomeChildren} from './loc-home-columns.mjs';

function stripOuterParagraph(html=''){
  const value=stripLocHomeEditorPlaceholders(html).trim();
  const match=value.match(/^<p[^>]*>([\s\S]*)<\/p>$/i);
  return match?match[1]:value;
}

function Html({html,className='',tag='div'}){
  const cleaned=stripLocHomeEditorPlaceholders(html);
  if(!cleaned)return null;
  const Tag=tag;
  return <Tag className={className||undefined} dangerouslySetInnerHTML={{__html:cleaned}}/>;
}

function homeFields(slot){
  const [eyebrow,title,subtitle,text]=orderedHomeFields(slot).map(field=>field.value);
  return {eyebrow,title,subtitle,text};
}

function OtherHomeChildren({slot}){
  const children=visibleHomeChildren(slot);
  if(!children.length)return null;
  return <div className="scope-block-entity-grid home-extra-columns">
    {children.map(entity=>childPresentation(entity.title)==='card'
      ?<article className="scope-block-entity" key={entity.uid}>
        <h4>{entity.title}</h4>
        <Html html={entity.text}/>
      </article>
      :<div className="loc-bubble scope-block-text-bubble" key={entity.uid}>
        <Html html={entity.text}/>
      </div>)}
  </div>;
}

function HeroDisplay(slot){
  const {eyebrow,title,subtitle,text}=homeFields(slot);
  return <>
    <Html tag="p" className="loc-eyebrow" html={eyebrow}/>
    <div className="home-title-row">
      {title?<h1>{title}</h1>:null}
      <Html className="loc-subtitle" html={subtitle}/>
    </div>
    <Html className="loc-hero-copy" html={text}/>
    <OtherHomeChildren slot={slot}/>
  </>;
}

function BeginnerHeading(slot){
  const {eyebrow,title,subtitle}=homeFields(slot);
  return <>
    <Html tag="p" className="loc-eyebrow" html={eyebrow}/>
    {title?<h2>{title}</h2>:null}
    <Html className="loc-subtitle" html={subtitle}/>
  </>;
}

function ArchitectureHeading(slot){
  const {eyebrow,title,subtitle}=homeFields(slot);
  return <>
    <Html tag="p" className="loc-eyebrow" html={eyebrow}/>
    {title?<h2>{title}</h2>:null}
    <Html className="loc-subtitle" html={subtitle}/>
  </>;
}

function StatusHeading(slot){
  const {eyebrow,title,subtitle}=homeFields(slot);
  return <>
    <Html tag="p" className="loc-eyebrow" html={eyebrow}/>
    {title?<h2>{title}</h2>:null}
    <Html className="loc-subtitle" html={subtitle}/>
  </>;
}

function StatusBubbles(slot){
  // Display main body (column 4) and then child columns in their stored order.
  // The period heading markup defines content frames, not a hardcoded array index.
  const {text}=homeFields(slot);
  const sections=splitStatusContentSections(text);
  const children=visibleHomeChildren(slot);
  if(!sections.length&&!children.length)return null;
  return <div className="home-progress-grid home-status-frames home-status-bubbles">
    {sections.map(section=><article className="home-progress-item home-status-card" key={section.key}>
      <Html className="home-status-rich-text" html={section.html}/>
    </article>)}
    {children.map(entity=>childPresentation(entity.title)==='card'
      ?<article className="home-progress-item home-status-card" key={entity.uid}>
        <h3>{entity.title}</h3>
        <Html className="home-status-rich-text" html={entity.text}/>
      </article>
      :<div className="loc-bubble home-status-child-bubble" key={entity.uid}>
        <Html html={entity.text}/>
      </div>)}
  </div>;
}

function SkillsHeading(slot){
  const {eyebrow,title,subtitle}=homeFields(slot);
  return <>
    <Html tag="p" className="loc-eyebrow" html={eyebrow}/>
    {title?<h2>{title}</h2>:null}
    <Html className="loc-subtitle" html={subtitle}/>
  </>;
}

function SkillsBody(slot){
  const {text}=homeFields(slot);
  return <>
    <Html html={text}/>
    {visibleHomeChildren(slot).map(entity=><p key={entity.uid}>
      {entity.title?<><strong>{entity.title}</strong>：</>:null}
      <span dangerouslySetInnerHTML={{__html:stripOuterParagraph(entity.text)}}/>
    </p>)}
  </>;
}

function AuthorHeading(slot){
  const {eyebrow,title,subtitle}=homeFields(slot);
  return <>
    <Html tag="p" className="loc-eyebrow" html={eyebrow}/>
    {title?<h2>{title}</h2>:null}
    <Html className="loc-subtitle" html={subtitle}/>
  </>;
}

function AuthorBody(slot){
  return BodyDisplay(slot);
}

function BodyDisplay(slot){
  const {text}=homeFields(slot);
  return <>
    <Html html={text}/>
    <OtherHomeChildren slot={slot}/>
  </>;
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
