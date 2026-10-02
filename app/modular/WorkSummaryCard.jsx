'use client';

import {UI_COPY} from '../i18n/ui-copy';

function externalLink(link){
  const href=String(link?.href||'').trim();
  return /^https?:\/\//i.test(href)?href:'';
}
function safeExternalLinksOf(items=[]){
  return (Array.isArray(items)?items:[])
    .map((link,index)=>typeof link==='string'?{id:String(index),href:link,label:UI_COPY.work.viewLinks}:link)
    .filter(link=>externalLink(link));
}
function safeRelationLinksOf(items=[]){
  return (Array.isArray(items)?items:[])
    .map((link,index)=>typeof link==='string'?{id:String(index),href:link,label:UI_COPY.work.relatedText}:link)
    .filter(link=>{
      const href=String(link?.href||'').trim();
      return Boolean(href)&&!/^javascript:/i.test(href);
    });
}

export default function WorkSummaryCard({
  title=UI_COPY.work.untitled,
  source='',
  scopeId='',
  date='',
  body='',
  hidden=false,
  relationLinks=[],
  links=[],
  destinations=[],
  showSource=true,
  showLinks=true,
  children=null
}){
  const safeRelations=safeRelationLinksOf(relationLinks);
  const safeLinks=safeExternalLinksOf(links);

  return <article className="scope-inline-card scope-work-summary">
    <header className="scope-culture-work-heading">
      <div>
        {(scopeId||showSource&&source)?<p className="loc-eyebrow">{[scopeId,showSource?source:''].filter(Boolean).join(' · ')}</p>:null}
        <strong>{title}</strong>
      </div>
      {date?<time>{date}</time>:null}
    </header>

    {hidden?<p className="scope-status">{UI_COPY.work.hidden}</p>:null}
    {body?<p className="scope-culture-work-meta-description">{body}</p>:null}

    {safeRelations.length?<div className="scope-result-links scope-work-relations">
      {safeRelations.map((link,index)=><a key={link.id||link.href||index} href={String(link.href||'').trim()}>{link.label||UI_COPY.format.relatedText(index+1)}</a>)}
    </div>:null}

    {showLinks&&safeLinks.length?<div className="scope-result-links">
      {safeLinks.map((link,index)=><a key={link.id||link.href||index} href={externalLink(link)} target="_blank" rel="noreferrer">{link.label||UI_COPY.format.link(index+1)}</a>)}
    </div>:null}

    {destinations?.length?<div className="scope-result-links">
      {destinations.map(destination=><a key={destination.id||destination.href} href={destination.href}>{destination.label}</a>)}
    </div>:null}

    {children}
  </article>;
}
