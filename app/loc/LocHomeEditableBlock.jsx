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

function Html({html,className='',tag='div'}){
  if(!html)return null;
  const Tag=tag;
  return <Tag className={className||undefined} dangerouslySetInnerHTML={{__html:html}}/>;
}

function entityAt(slot,index){
  return slot?.entities?.[index]||{title:'',text:''};
}

function HeroDisplay(slot){
  const english=entityAt(slot,0);
  const explain=entityAt(slot,1);
  const description=entityAt(slot,2);
  return <>
    <Html tag="p" className="loc-eyebrow" html={stripOuterParagraph(english.text)||english.title}/>
    <div className="home-title-row">
      <h1>{slot.title}</h1>
      <Html tag="p" className="loc-subtitle" html={stripOuterParagraph(explain.text)}/>
    </div>
    <Html className="loc-hero-copy" html={description.text||slot.text}/>
  </>;
}

function BeginnerHeading(slot){
  const meta=entityAt(slot,0);
  return <div className="home-section-heading">
    <p className="loc-eyebrow">{meta.title||'Start here'}</p>
    <h2>{slot.title}</h2>
    <Html tag="p" className="loc-subtitle" html={stripOuterParagraph(meta.text)}/>
  </div>;
}

function ArchitectureHeading(slot){
  const meta=entityAt(slot,0);
  return <div className="home-section-heading">
    <p className="loc-eyebrow">{meta.title||'LOC Architecture'}</p>
    <h2>{slot.title}</h2>
  </div>;
}

function StatusHeading(slot){
  return <div className="home-section-heading">
    <p className="loc-eyebrow">System Status</p>
    <h2>{slot.title}</h2>
    <Html tag="p" className="loc-subtitle" html={stripOuterParagraph(slot.text)}/>
  </div>;
}

function StatusBubbles(slot){
  return <div className="home-draw-bubbles home-status-bubbles" aria-label="LOC 系統狀態">
    {slot.entities.map((entity,index)=>{
      const parts=paragraphParts(entity.text);
      if(index===1){
        return <div className="loc-bubble" key={entity.uid}>
          <strong>{entity.title}</strong>
          <Html tag="p" html={parts[0]||''}/>
          {parts[1]?<details className="home-status-details">
            <summary>架構</summary>
            <Html tag="p" html={parts[1]}/>
          </details>:null}
          {parts[2]?<details className="home-status-details">
            <summary>模組</summary>
            <Html tag="p" html={parts[2]}/>
          </details>:null}
        </div>;
      }
      return <div className="loc-bubble" key={entity.uid}>
        <strong>{entity.title}</strong>
        <Html html={entity.text}/>
      </div>;
    })}
  </div>;
}

function SkillsHeading(slot){
  const parts=paragraphParts(slot.text);
  return <div className="home-section-heading">
    <p className="loc-eyebrow">LOC GPT Skills</p>
    <h2>{slot.title}</h2>
    <Html tag="p" className="loc-subtitle" html={parts[0]||''}/>
  </div>;
}

function SkillsBody(slot){
  const parts=paragraphParts(slot.text);
  return <div className="home-author-copy">
    {slot.entities.map(entity=><p key={entity.uid}>
      <strong>{entity.title}</strong>：
      <span dangerouslySetInnerHTML={{__html:stripOuterParagraph(entity.text)}}/>
    </p>)}
    {parts.slice(1).map((part,index)=><Html tag="p" html={part} key={'skill-body-'+index}/>)}
  </div>;
}

function AuthorHeading(slot){
  const parts=paragraphParts(slot.text);
  return <div className="home-section-heading">
    <p className="loc-eyebrow">About me</p>
    <h2>{slot.title}</h2>
    <Html tag="p" className="loc-subtitle" html={parts[0]||''}/>
  </div>;
}

function AuthorBody(slot){
  const parts=paragraphParts(slot.text);
  return <div className="home-author-copy">
    {parts.slice(1).map((part,index)=><Html tag="p" html={part} key={'author-body-'+index}/>)}
  </div>;
}

function BodyDisplay(slot){
  return <div className="home-author-copy">
    <Html html={slot.text}/>
  </div>;
}

const RENDERERS={
  hero:HeroDisplay,
  beginnerHeading:BeginnerHeading,
  architectureHeading:ArchitectureHeading,
  statusHeading:StatusHeading,
  statusBubbles:StatusBubbles,
  skillsHeading:SkillsHeading,
  skillsBody:SkillsBody,
  authorHeading:AuthorHeading,
  authorBody:AuthorBody,
  body:BodyDisplay
};

export default function LocHomeEditableBlock({order,variant}){
  const render=RENDERERS[variant]||BodyDisplay;
  return <ScopeEditableBlocks
    scopeId="loc"
    page="index"
    orders={[order]}
    className="loc-home-editable-slot"
    slotClassName="loc-home-edit-anchor"
    renderDisplay={render}
  />;
}
