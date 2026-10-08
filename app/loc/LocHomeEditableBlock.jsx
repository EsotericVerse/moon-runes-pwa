'use client';

import ScopeEditableBlocks from './ScopeEditableBlocks';
import {stripLocHomeEditorPlaceholders} from './loc-home-text.mjs';

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
  return <>
    <p className="loc-eyebrow">{meta.title||'Start here'}</p>
    <h2>{slot.title}</h2>
    <Html tag="p" className="loc-subtitle" html={stripOuterParagraph(meta.text)}/>
  </>;
}

function ArchitectureHeading(slot){
  const meta=entityAt(slot,0);
  return <>
    <p className="loc-eyebrow">{meta.title||'LOC Architecture'}</p>
    <h2>{slot.title}</h2>
  </>;
}

function StatusHeading(slot){
  return <>
    <p className="loc-eyebrow">System Status</p>
    <h2>{slot.title}</h2>
    <Html tag="p" className="loc-subtitle" html={stripOuterParagraph(slot.text)}/>
  </>;
}

function StatusBubbles(slot){
  return <>
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
        <Html tag="p" html={parts[0]||''}/>
        {parts.slice(1).map((part,partIndex)=><Html
          tag="p"
          className="home-status-reference"
          html={part}
          key={entity.uid+':'+partIndex}
        />)}
      </div>;
    })}
  </>;
}

function SkillsHeading(slot){
  const parts=paragraphParts(slot.text);
  return <>
    <p className="loc-eyebrow">LOC GPT Skills</p>
    <h2>{slot.title}</h2>
    <Html tag="p" className="loc-subtitle" html={parts[0]||''}/>
  </>;
}

function SkillsBody(slot){
  const parts=paragraphParts(slot.text);
  return <>
    {slot.entities.map(entity=><p key={entity.uid}>
      <strong>{entity.title}</strong>：
      <span dangerouslySetInnerHTML={{__html:stripOuterParagraph(entity.text)}}/>
    </p>)}
    {parts.slice(1).map((part,index)=><Html tag="p" html={part} key={'skill-body-'+index}/>)}
  </>;
}

function AuthorHeading(slot){
  const parts=paragraphParts(slot.text);
  return <>
    <p className="loc-eyebrow">About me</p>
    <h2>{slot.title}</h2>
    <Html tag="p" className="loc-subtitle" html={parts[0]||''}/>
  </>;
}

function AuthorBody(slot){
  const parts=paragraphParts(slot.text);
  return <>
    {parts.slice(1).map((part,index)=><Html tag="p" html={part} key={'author-body-'+index}/>)}
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
  statusBubbles:{render:StatusBubbles,slotClassName:'home-draw-bubbles home-status-bubbles'},
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
    allowEditing={false}
    page="index"
    orders={[order]}
    slotClassName={config.slotClassName}
    editSlotClassName="loc-card"
    renderDisplay={config.render}
  />;
}
